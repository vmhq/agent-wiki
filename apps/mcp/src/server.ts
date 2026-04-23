import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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
  createEntrySchema,
  patchEntrySchema,
  updateEntrySchema,
  slugSchema,
} from "./wiki.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "📚 agent-wiki",
    version: "1.0.0",
  });

  // ── wiki_list ────────────────────────────────────────────────────────────────
  server.tool(
    "wiki_list",
    "List all wiki entries with their metadata (slug, title, tags, excerpt, timestamps). Does not return full content.",
    {},
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
  server.tool(
    "wiki_get",
    "Get the full content and metadata of a specific wiki entry by its slug.",
    {
      slug: z.string().describe("The entry slug (e.g., 'machine-learning')"),
    },
    async ({ slug }) => {
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
  server.tool(
    "wiki_create",
    "Create a new wiki entry. The slug must be unique, lowercase, and use hyphens (e.g., 'neural-networks'). Content should be Markdown. Use [[wikilink]] syntax to link to other entries.",
    {
      slug: createEntrySchema.shape.slug.describe("Unique slug: lowercase letters, numbers, hyphens only"),
      title: createEntrySchema.shape.title.describe("Human-readable title"),
      content: createEntrySchema.shape.content.describe("Markdown content of the entry"),
      tags: z.array(z.string()).optional().describe("Optional list of tags for categorization"),
    },
    async ({ slug, title, content, tags }) => {
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
  server.tool(
    "wiki_update",
    "Replace the full content of an existing wiki entry. Use this for complete rewrites. For partial edits, prefer wiki_patch.",
    {
      slug: slugSchema.describe("The entry slug to update"),
      content: updateEntrySchema.shape.content.describe("New Markdown content (replaces existing content entirely)"),
      title: updateEntrySchema.shape.title.describe("Optional new title (keeps existing title if omitted)"),
      tags: z.array(z.string()).optional().describe("Optional new tags (keeps existing tags if omitted)"),
    },
    async ({ slug, content, title, tags }) => {
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
  server.tool(
    "wiki_patch",
    `Modify part of a wiki entry without replacing everything. Operations:
- append: add content at the end
- prepend: add content at the beginning
- replace: find and replace a text string
- insert_after: insert content after a specific anchor text
- insert_before: insert content before a specific anchor text`,
    {
      slug: slugSchema.describe("The entry slug to patch"),
      operation: patchEntrySchema.shape.operation
        .describe("The patch operation to perform"),
      content: patchEntrySchema.shape.content.describe("Content to append/prepend/insert (for append, prepend, insert_after, insert_before)"),
      search: patchEntrySchema.shape.search.describe("Text to find (for replace operation)"),
      replacement: patchEntrySchema.shape.replacement.describe("Replacement text (for replace operation)"),
      anchor: patchEntrySchema.shape.anchor.describe("Anchor text to insert before/after (for insert_after, insert_before)"),
    },
    async ({ slug, operation, content, search, replacement, anchor }) => {
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
  server.tool(
    "wiki_delete",
    "Permanently delete a wiki entry. This action cannot be undone.",
    {
      slug: slugSchema.describe("The entry slug to delete"),
    },
    async ({ slug }) => {
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
  server.tool(
    "wiki_search",
    "Full-text search across all wiki entries. Returns entries ranked by relevance (title matches score higher than content matches).",
    {
      query: z.string().describe("Search query string"),
    },
    async ({ query }) => {
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
  server.tool(
    "wiki_backlinks",
    "List entries that link to a specific wiki entry.",
    {
      slug: slugSchema.describe("The entry slug to inspect"),
    },
    async ({ slug }) => {
      const backlinks = getBacklinks(slug);
      return {
        content: [{ type: "text", text: JSON.stringify(backlinks, null, 2) }],
      };
    }
  );

  // ── wiki_graph ──────────────────────────────────────────────────────────────
  server.tool(
    "wiki_graph",
    "Return graph nodes and links, including missing linked pages.",
    {},
    async () => ({
      content: [{ type: "text", text: JSON.stringify(getGraphData(), null, 2) }],
    })
  );

  // ── wiki_history ────────────────────────────────────────────────────────────
  server.tool(
    "wiki_history",
    "List saved history snapshots for an entry. Snapshots are created before updates, patches, and deletes.",
    {
      slug: slugSchema.describe("The entry slug to inspect"),
    },
    async ({ slug }) => ({
      content: [{ type: "text", text: JSON.stringify(listHistory(slug), null, 2) }],
    })
  );

  return server;
}
