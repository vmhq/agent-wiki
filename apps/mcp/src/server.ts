import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import {
  listEntries,
  getEntry,
  createEntry,
  updateEntry,
  patchEntry,
  deleteEntry,
  searchEntries,
  getBacklinks,
  getGraphData,
  listHistory,
} from "./wiki.js";

const slugInputSchema = z.string().min(1).describe("The entry slug");
const tagsInputSchema = z.array(z.string()).optional().describe("Optional list of tags for categorization");
const patchOperationInputSchema = z.enum(["append", "prepend", "replace", "insert_after", "insert_before"]);
type SlugArgs = { slug: string };
type CreateArgs = { slug: string; title: string; content: string; tags?: string[] };
type UpdateArgs = { slug: string; content: string; title?: string; tags?: string[] };
type PatchArgs = {
  slug: string;
  operation: "append" | "prepend" | "replace" | "insert_after" | "insert_before";
  content?: string;
  search?: string;
  replacement?: string;
  anchor?: string;
};
type SearchArgs = { query: string };

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "📚 agent-wiki",
    version: "1.0.0",
  });
  const addTool = server.tool.bind(server) as (
    name: string,
    description: string,
    schemaOrCallback: unknown,
    callback?: unknown
  ) => unknown;

  // ── wiki_list ────────────────────────────────────────────────────────────────
  addTool(
    "wiki_list",
    "List all wiki entries with their metadata (slug, title, tags, excerpt, timestamps). Does not return full content.",
    async () => {
      const entries = listEntries();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(entries, null, 2),
          },
        ],
      };
    }
  );

  // ── wiki_get ─────────────────────────────────────────────────────────────────
  addTool(
    "wiki_get",
    "Get the full content and metadata of a specific wiki entry by its slug.",
    {
      slug: z.string().describe("The entry slug (e.g., 'machine-learning')"),
    },
    async ({ slug }: SlugArgs) => {
      const entry = getEntry(slug);
      if (!entry) {
        return {
          content: [{ type: "text", text: `Error: Entry '${slug}' not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
      };
    }
  );

  // ── wiki_create ──────────────────────────────────────────────────────────────
  addTool(
    "wiki_create",
    "Create a new wiki entry. The slug must be unique, lowercase, and use hyphens (e.g., 'neural-networks'). Content should be Markdown. Use [[wikilink]] syntax to link to other entries.",
    {
      slug: slugInputSchema.describe("Unique slug: lowercase letters, numbers, hyphens only"),
      title: z.string().min(1).describe("Human-readable title"),
      content: z.string().min(1).describe("Markdown content of the entry"),
      tags: tagsInputSchema,
    },
    async ({ slug, title, content, tags }: CreateArgs) => {
      try {
        const entry = createEntry(slug, title, content, tags);
        return {
          content: [{ type: "text", text: `Created entry '${slug}':\n\n${JSON.stringify(entry, null, 2)}` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );

  // ── wiki_update ──────────────────────────────────────────────────────────────
  addTool(
    "wiki_update",
    "Replace the full content of an existing wiki entry. Use this for complete rewrites. For partial edits, prefer wiki_patch.",
    {
      slug: slugInputSchema.describe("The entry slug to update"),
      content: z.string().describe("New Markdown content (replaces existing content entirely)"),
      title: z.string().min(1).optional().describe("Optional new title (keeps existing title if omitted)"),
      tags: z.array(z.string()).optional().describe("Optional new tags (keeps existing tags if omitted)"),
    },
    async ({ slug, content, title, tags }: UpdateArgs) => {
      try {
        const entry = updateEntry(slug, content, { title, tags });
        return {
          content: [{ type: "text", text: `Updated entry '${slug}':\n\n${JSON.stringify(entry, null, 2)}` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );

  // ── wiki_patch ───────────────────────────────────────────────────────────────
  addTool(
    "wiki_patch",
    `Modify part of a wiki entry without replacing everything. Operations:
- append: add content at the end
- prepend: add content at the beginning
- replace: find and replace a text string
- insert_after: insert content after a specific anchor text
- insert_before: insert content before a specific anchor text`,
    {
      slug: slugInputSchema.describe("The entry slug to patch"),
      operation: patchOperationInputSchema.describe("The patch operation to perform"),
      content: z.string().optional().describe("Content to append/prepend/insert (for append, prepend, insert_after, insert_before)"),
      search: z.string().optional().describe("Text to find (for replace operation)"),
      replacement: z.string().optional().describe("Replacement text (for replace operation)"),
      anchor: z.string().optional().describe("Anchor text to insert before/after (for insert_after, insert_before)"),
    },
    async ({ slug, operation, content, search, replacement, anchor }: PatchArgs) => {
      try {
        const entry = patchEntry(slug, operation, { content, search, replacement, anchor });
        return {
          content: [{ type: "text", text: `Patched entry '${slug}' (${operation}):\n\n${JSON.stringify({ slug: entry.slug, title: entry.title, updated: entry.updated }, null, 2)}` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );

  // ── wiki_delete ──────────────────────────────────────────────────────────────
  addTool(
    "wiki_delete",
    "Permanently delete a wiki entry. This action cannot be undone.",
    {
      slug: slugInputSchema.describe("The entry slug to delete"),
    },
    async ({ slug }: SlugArgs) => {
      try {
        deleteEntry(slug);
        return {
          content: [{ type: "text", text: `Deleted entry '${slug}'` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );

  // ── wiki_search ──────────────────────────────────────────────────────────────
  addTool(
    "wiki_search",
    "Full-text search across all wiki entries. Returns entries ranked by relevance (title matches score higher than content matches).",
    {
      query: z.string().describe("Search query string"),
    },
    async ({ query }: SearchArgs) => {
      const results = searchEntries(query);
      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `No entries found matching '${query}'` }],
        };
      }
      const summary = results.map((e) => ({
        slug: e.slug,
        title: e.title,
        tags: e.tags,
        excerpt: e.excerpt,
      }));
      return {
        content: [{ type: "text", text: `Found ${results.length} entries matching '${query}':\n\n${JSON.stringify(summary, null, 2)}` }],
      };
    }
  );

  // ── wiki_backlinks ──────────────────────────────────────────────────────────
  addTool(
    "wiki_backlinks",
    "List entries that link to a specific wiki entry.",
    {
      slug: slugInputSchema.describe("The entry slug to inspect"),
    },
    async ({ slug }: SlugArgs) => {
      const backlinks = getBacklinks(slug);
      return {
        content: [{ type: "text", text: JSON.stringify(backlinks, null, 2) }],
      };
    }
  );

  // ── wiki_graph ──────────────────────────────────────────────────────────────
  addTool(
    "wiki_graph",
    "Return graph nodes and links, including missing linked pages.",
    async () => ({
      content: [{ type: "text", text: JSON.stringify(getGraphData(), null, 2) }],
    })
  );

  // ── wiki_history ────────────────────────────────────────────────────────────
  addTool(
    "wiki_history",
    "List saved history snapshots for an entry. Snapshots are created before updates, patches, and deletes.",
    {
      slug: slugInputSchema.describe("The entry slug to inspect"),
    },
    async ({ slug }: SlugArgs) => ({
      content: [{ type: "text", text: JSON.stringify(listHistory(slug), null, 2) }],
    })
  );

  return server;
}
