import fs from "fs";
import path from "path";
import matter from "gray-matter";

export const WIKI_DIR = process.env.WIKI_DIR ?? path.join(process.cwd(), "../../wiki");

export interface WikiEntry {
  slug: string;
  title: string;
  tags: string[];
  created: string;
  updated: string;
  excerpt: string;
  content: string;
}

export interface WikiMeta {
  slug: string;
  title: string;
  tags: string[];
  created: string;
  updated: string;
  excerpt: string;
}

function ensureWikiDir() {
  if (!fs.existsSync(WIKI_DIR)) {
    fs.mkdirSync(WIKI_DIR, { recursive: true });
  }
}

function slugToPath(slug: string): string {
  return path.join(WIKI_DIR, `${slug}.md`);
}

export function listEntries(): WikiMeta[] {
  ensureWikiDir();
  const files = fs.readdirSync(WIKI_DIR).filter((f) => f.endsWith(".md"));
  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      try {
        const raw = fs.readFileSync(path.join(WIKI_DIR, file), "utf-8");
        const { data, content } = matter(raw);
        return {
          slug,
          title: (data.title as string) || slug,
          tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
          created: (data.created as string) || new Date().toISOString(),
          updated: (data.updated as string) || new Date().toISOString(),
          excerpt: content.trim().slice(0, 200).replace(/[#*`]/g, "").trim(),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as WikiMeta[];
}

export function getEntry(slug: string): WikiEntry | null {
  ensureWikiDir();
  const filePath = slugToPath(slug);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: (data.title as string) || slug,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    created: (data.created as string) || new Date().toISOString(),
    updated: (data.updated as string) || new Date().toISOString(),
    excerpt: content.trim().slice(0, 200).replace(/[#*`]/g, "").trim(),
    content,
  };
}

export function createEntry(
  slug: string,
  title: string,
  content: string,
  tags: string[] = []
): WikiEntry {
  ensureWikiDir();
  const filePath = slugToPath(slug);
  if (fs.existsSync(filePath)) {
    throw new Error(`Entry '${slug}' already exists`);
  }
  const now = new Date().toISOString();
  const raw = matter.stringify(content, { title, tags, created: now, updated: now });
  fs.writeFileSync(filePath, raw, "utf-8");
  return getEntry(slug)!;
}

export function updateEntry(
  slug: string,
  content: string,
  meta?: { title?: string; tags?: string[] }
): WikiEntry {
  ensureWikiDir();
  const filePath = slugToPath(slug);
  const existing = getEntry(slug);
  const now = new Date().toISOString();
  const frontmatter = {
    title: meta?.title ?? existing?.title ?? slug,
    tags: meta?.tags ?? existing?.tags ?? [],
    created: existing?.created ?? now,
    updated: now,
  };
  const raw = matter.stringify(content, frontmatter);
  fs.writeFileSync(filePath, raw, "utf-8");
  return getEntry(slug)!;
}

export function patchEntry(
  slug: string,
  operation: "append" | "prepend" | "replace" | "insert_after" | "insert_before",
  params: { content?: string; search?: string; replacement?: string; anchor?: string }
): WikiEntry {
  const existing = getEntry(slug);
  if (!existing) throw new Error(`Entry '${slug}' not found`);

  let newContent = existing.content;

  switch (operation) {
    case "append":
      newContent = newContent.trimEnd() + "\n\n" + (params.content ?? "");
      break;
    case "prepend":
      newContent = (params.content ?? "") + "\n\n" + newContent.trimStart();
      break;
    case "replace":
      if (!params.search) throw new Error("search is required for replace operation");
      newContent = newContent.split(params.search).join(params.replacement ?? "");
      break;
    case "insert_after":
      if (!params.anchor) throw new Error("anchor is required for insert_after operation");
      newContent = newContent.replace(params.anchor, params.anchor + "\n\n" + (params.content ?? ""));
      break;
    case "insert_before":
      if (!params.anchor) throw new Error("anchor is required for insert_before operation");
      newContent = newContent.replace(params.anchor, (params.content ?? "") + "\n\n" + params.anchor);
      break;
  }

  return updateEntry(slug, newContent);
}

export function deleteEntry(slug: string): void {
  ensureWikiDir();
  const filePath = slugToPath(slug);
  if (!fs.existsSync(filePath)) throw new Error(`Entry '${slug}' not found`);
  fs.unlinkSync(filePath);
}

export function searchEntries(query: string): WikiEntry[] {
  const entries = listEntries();
  const q = query.toLowerCase();
  const results: Array<{ entry: WikiEntry; score: number }> = [];

  for (const meta of entries) {
    const entry = getEntry(meta.slug);
    if (!entry) continue;

    let score = 0;
    const titleLower = entry.title.toLowerCase();
    const contentLower = entry.content.toLowerCase();

    if (titleLower.includes(q)) score += 10;
    if (titleLower.startsWith(q)) score += 5;
    const contentMatches = (contentLower.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
    score += contentMatches;
    for (const tag of entry.tags) {
      if (tag.toLowerCase().includes(q)) score += 3;
    }

    if (score > 0) results.push({ entry, score });
  }

  return results.sort((a, b) => b.score - a.score).map((r) => r.entry);
}

export function getGraphData(): { nodes: { id: string; name: string; tags: string[] }[]; links: { source: string; target: string }[] } {
  const entries = listEntries();
  const slugSet = new Set(entries.map((e) => e.slug));
  const nodes = entries.map((e) => ({ id: e.slug, name: e.title, tags: e.tags }));
  const links: { source: string; target: string }[] = [];

  for (const meta of entries) {
    const entry = getEntry(meta.slug);
    if (!entry) continue;

    // Parse [[wikilinks]]
    const wikilinkRe = /\[\[([^\]]+)\]\]/g;
    let m: RegExpExecArray | null;
    while ((m = wikilinkRe.exec(entry.content)) !== null) {
      const target = m[1].split("|")[0].trim().toLowerCase().replace(/\s+/g, "-");
      if (slugSet.has(target) && target !== meta.slug) {
        links.push({ source: meta.slug, target });
      }
    }

    // Parse [text](/wiki/slug) links
    const mdLinkRe = /\[([^\]]+)\]\(\/wiki\/([^)]+)\)/g;
    while ((m = mdLinkRe.exec(entry.content)) !== null) {
      const target = m[2].trim();
      if (slugSet.has(target) && target !== meta.slug) {
        links.push({ source: meta.slug, target });
      }
    }
  }

  // Deduplicate links
  const seen = new Set<string>();
  const uniqueLinks = links.filter((l) => {
    const key = `${l.source}:${l.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { nodes, links: uniqueLinks };
}
