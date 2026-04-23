import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";

export const SLUG_RE = /^[a-z0-9-]+$/;

export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(SLUG_RE, "slug must only contain lowercase letters, numbers, and hyphens");

export const tagSchema = z.string().trim().min(1).max(64);

export const tagsSchema = z.array(tagSchema).default([]);

export const createEntrySchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1),
  tags: tagsSchema.optional(),
});

export const updateEntrySchema = z.object({
  content: z.string(),
  title: z.string().trim().min(1).max(200).optional(),
  tags: tagsSchema.optional(),
});

export const patchOperationSchema = z.enum(["append", "prepend", "replace", "insert_after", "insert_before"]);

export const patchEntrySchema = z.object({
  operation: patchOperationSchema,
  content: z.string().optional(),
  search: z.string().optional(),
  replacement: z.string().optional(),
  anchor: z.string().optional(),
});

export const searchQuerySchema = z.string().trim().min(1).max(200);

export type PatchOperation = z.infer<typeof patchOperationSchema>;

export interface WikiEntry {
  slug: string;
  title: string;
  tags: string[];
  created: string;
  updated: string;
  excerpt: string;
  content: string;
}

export type WikiMeta = Omit<WikiEntry, "content">;

export interface GraphNode {
  id: string;
  name: string;
  tags: string[];
  missing?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  missing?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface Backlink {
  slug: string;
  title: string;
  excerpt: string;
}

interface CacheState {
  signature: string;
  metas: WikiMeta[];
  entries: Map<string, WikiEntry>;
  graph: GraphData | null;
}

export class WikiError extends Error {
  constructor(message: string, public readonly code: "invalid_input" | "not_found" | "conflict" | "path_traversal") {
    super(message);
    this.name = "WikiError";
  }
}

export function isWikiError(err: unknown): err is WikiError {
  return err instanceof WikiError;
}

export function errorStatus(err: unknown): number {
  if (err instanceof z.ZodError) return 400;
  if (!isWikiError(err)) return 500;
  if (err.code === "invalid_input") return 400;
  if (err.code === "not_found") return 404;
  if (err.code === "conflict") return 409;
  return 400;
}

export function getPublicErrorMessage(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? "Invalid input";
  if (err instanceof Error) return err.message;
  return String(err);
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function validateSlug(slug: string): string {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    throw new WikiError(parsed.error.issues[0]?.message ?? "Invalid slug", "invalid_input");
  }
  return parsed.data;
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function excerptFromContent(content: string): string {
  return content.trim().slice(0, 200).replace(/[#*`]/g, "").trim();
}

function safeTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function createWikiStore(wikiDir: string) {
  let cache: CacheState | null = null;

  function ensureWikiDir() {
    if (!fs.existsSync(wikiDir)) {
      fs.mkdirSync(wikiDir, { recursive: true });
    }
  }

  function ensureHistoryDir(slug: string) {
    const historyDir = path.join(wikiDir, ".history", slug);
    fs.mkdirSync(historyDir, { recursive: true });
    return historyDir;
  }

  function slugToPath(slug: string): string {
    const validSlug = validateSlug(slug);
    const root = path.resolve(wikiDir);
    const resolved = path.resolve(root, `${validSlug}.md`);
    if (!resolved.startsWith(root + path.sep)) {
      throw new WikiError("Path traversal detected", "path_traversal");
    }
    return resolved;
  }

  function getSignature(): string {
    ensureWikiDir();
    const files = fs.readdirSync(wikiDir).filter((file) => file.endsWith(".md")).sort();
    return files
      .map((file) => {
        const stat = fs.statSync(path.join(wikiDir, file));
        return `${file}:${stat.mtimeMs}:${stat.size}`;
      })
      .join("|");
  }

  function readEntryUnchecked(slug: string): WikiEntry | null {
    const filePath = slugToPath(slug);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const now = new Date().toISOString();
    return {
      slug,
      title: typeof data.title === "string" && data.title.trim() ? data.title : slug,
      tags: normalizeTags(Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : []),
      created: typeof data.created === "string" ? data.created : now,
      updated: typeof data.updated === "string" ? data.updated : now,
      excerpt: excerptFromContent(content),
      content,
    };
  }

  function refreshCache(): CacheState {
    const signature = getSignature();
    if (cache?.signature === signature) return cache;

    const entries = new Map<string, WikiEntry>();
    const metas: WikiMeta[] = [];
    const files = fs.readdirSync(wikiDir).filter((file) => file.endsWith(".md")).sort();

    for (const file of files) {
      const slug = file.replace(/\.md$/, "");
      if (!SLUG_RE.test(slug)) continue;
      try {
        const entry = readEntryUnchecked(slug);
        if (!entry) continue;
        entries.set(slug, entry);
        const { content: _content, ...meta } = entry;
        metas.push(meta);
      } catch {
        // A malformed entry should not break the whole wiki index.
      }
    }

    cache = { signature, metas, entries, graph: null };
    return cache;
  }

  function invalidate() {
    cache = null;
  }

  function saveHistory(slug: string) {
    const filePath = slugToPath(slug);
    if (!fs.existsSync(filePath)) return;
    const historyDir = ensureHistoryDir(slug);
    const target = path.join(historyDir, `${safeTimestamp()}-${slug}.md`);
    fs.copyFileSync(filePath, target);
  }

  function writeEntry(slug: string, content: string, frontmatter: Record<string, unknown>) {
    const raw = matter.stringify(content, frontmatter);
    fs.writeFileSync(slugToPath(slug), raw, "utf-8");
    invalidate();
  }

  function listEntries(): WikiMeta[] {
    return refreshCache().metas;
  }

  function getEntry(slug: string): WikiEntry | null {
    validateSlug(slug);
    return refreshCache().entries.get(slug) ?? null;
  }

  function createEntry(slug: string, title: string, content: string, tags: string[] = []): WikiEntry {
    const parsed = createEntrySchema.parse({ slug, title, content, tags });
    ensureWikiDir();
    const filePath = slugToPath(parsed.slug);
    if (fs.existsSync(filePath)) {
      throw new WikiError(`Entry '${parsed.slug}' already exists`, "conflict");
    }
    const now = new Date().toISOString();
    writeEntry(parsed.slug, parsed.content, {
      title: parsed.title,
      tags: normalizeTags(parsed.tags),
      created: now,
      updated: now,
    });
    return getEntry(parsed.slug)!;
  }

  function updateEntry(slug: string, content: string, meta?: { title?: string; tags?: string[] }): WikiEntry {
    validateSlug(slug);
    const parsed = updateEntrySchema.parse({ content, ...meta });
    const existing = getEntry(slug);
    if (!existing) throw new WikiError(`Entry '${slug}' not found`, "not_found");
    saveHistory(slug);
    writeEntry(slug, parsed.content, {
      title: parsed.title ?? existing.title,
      tags: parsed.tags ? normalizeTags(parsed.tags) : existing.tags,
      created: existing.created,
      updated: new Date().toISOString(),
    });
    return getEntry(slug)!;
  }

  function patchEntry(
    slug: string,
    operation: PatchOperation,
    params: { content?: string; search?: string; replacement?: string; anchor?: string }
  ): WikiEntry {
    const parsed = patchEntrySchema.parse({ operation, ...params });
    const existing = getEntry(slug);
    if (!existing) throw new WikiError(`Entry '${slug}' not found`, "not_found");

    let newContent = existing.content;

    switch (parsed.operation) {
      case "append":
        newContent = newContent.trimEnd() + "\n\n" + (parsed.content ?? "");
        break;
      case "prepend":
        newContent = (parsed.content ?? "") + "\n\n" + newContent.trimStart();
        break;
      case "replace":
        if (!parsed.search) throw new WikiError("search is required for replace operation", "invalid_input");
        if (!newContent.includes(parsed.search)) throw new WikiError("search text was not found", "not_found");
        newContent = newContent.split(parsed.search).join(parsed.replacement ?? "");
        break;
      case "insert_after":
        if (!parsed.anchor) throw new WikiError("anchor is required for insert_after operation", "invalid_input");
        if (!newContent.includes(parsed.anchor)) throw new WikiError("anchor text was not found", "not_found");
        newContent = newContent.replace(parsed.anchor, parsed.anchor + "\n\n" + (parsed.content ?? ""));
        break;
      case "insert_before":
        if (!parsed.anchor) throw new WikiError("anchor is required for insert_before operation", "invalid_input");
        if (!newContent.includes(parsed.anchor)) throw new WikiError("anchor text was not found", "not_found");
        newContent = newContent.replace(parsed.anchor, (parsed.content ?? "") + "\n\n" + parsed.anchor);
        break;
    }

    return updateEntry(slug, newContent);
  }

  function deleteEntry(slug: string): void {
    validateSlug(slug);
    const filePath = slugToPath(slug);
    if (!fs.existsSync(filePath)) throw new WikiError(`Entry '${slug}' not found`, "not_found");
    saveHistory(slug);
    fs.unlinkSync(filePath);
    invalidate();
  }

  function searchEntries(query: string): WikiEntry[] {
    const parsed = searchQuerySchema.safeParse(query);
    if (!parsed.success) return [];
    const q = parsed.data.toLowerCase();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matcher = new RegExp(escaped, "g");
    const results: Array<{ entry: WikiEntry; score: number }> = [];

    for (const entry of refreshCache().entries.values()) {
      let score = 0;
      const titleLower = entry.title.toLowerCase();
      const contentLower = entry.content.toLowerCase();

      if (titleLower.includes(q)) score += 10;
      if (titleLower.startsWith(q)) score += 5;
      score += (contentLower.match(matcher) ?? []).length;
      for (const tag of entry.tags) {
        if (tag.toLowerCase().includes(q)) score += 3;
      }

      if (score > 0) results.push({ entry, score });
    }

    return results.sort((a, b) => b.score - a.score).map((result) => result.entry);
  }

  function extractLinks(content: string): string[] {
    const links: string[] = [];
    const wikilinkRe = /\[\[([^\]]+)\]\]/g;
    let match: RegExpExecArray | null;
    while ((match = wikilinkRe.exec(content)) !== null) {
      const target = slugify(match[1].split("|")[0] ?? "");
      if (target) links.push(target);
    }

    const mdLinkRe = /\[([^\]]+)\]\(\/wiki\/([^)#?]+)[^)]*\)/g;
    while ((match = mdLinkRe.exec(content)) !== null) {
      const target = slugify(match[2] ?? "");
      if (target) links.push(target);
    }
    return links;
  }

  function getGraphData(): GraphData {
    const current = refreshCache();
    if (current.graph) return current.graph;

    const nodes: GraphNode[] = current.metas.map((entry) => ({ id: entry.slug, name: entry.title, tags: entry.tags }));
    const slugSet = new Set(current.metas.map((entry) => entry.slug));
    const missing = new Set<string>();
    const links: GraphLink[] = [];

    for (const entry of current.entries.values()) {
      for (const target of extractLinks(entry.content)) {
        if (target === entry.slug) continue;
        const isMissing = !slugSet.has(target);
        if (isMissing) missing.add(target);
        links.push({ source: entry.slug, target, missing: isMissing });
      }
    }

    const seen = new Set<string>();
    const uniqueLinks = links.filter((link) => {
      const key = `${link.source}:${link.target}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    for (const slug of missing) {
      nodes.push({ id: slug, name: slug, tags: [], missing: true });
    }

    current.graph = { nodes, links: uniqueLinks };
    return current.graph;
  }

  function getBacklinks(slug: string): Backlink[] {
    validateSlug(slug);
    const backlinks: Backlink[] = [];
    for (const entry of refreshCache().entries.values()) {
      if (entry.slug === slug) continue;
      if (extractLinks(entry.content).includes(slug)) {
        backlinks.push({ slug: entry.slug, title: entry.title, excerpt: entry.excerpt });
      }
    }
    return backlinks.sort((a, b) => a.title.localeCompare(b.title));
  }

  function listHistory(slug: string): string[] {
    validateSlug(slug);
    const historyDir = path.join(wikiDir, ".history", slug);
    if (!fs.existsSync(historyDir)) return [];
    return fs.readdirSync(historyDir).filter((file) => file.endsWith(".md")).sort().reverse();
  }

  return {
    wikiDir,
    slugToPath,
    listEntries,
    getEntry,
    createEntry,
    updateEntry,
    patchEntry,
    deleteEntry,
    searchEntries,
    getGraphData,
    getBacklinks,
    listHistory,
    invalidate,
  };
}

export type WikiStore = ReturnType<typeof createWikiStore>;
