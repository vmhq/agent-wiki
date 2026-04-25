# Behavior Inventory — Agent Wiki

> **Scope**: Complete audit of what the system does from a user/API perspective.
> **Date**: 2025-04-25
> **Codebase size**: ~3,800 lines across 30+ source files

---

## 1. User-Facing Features

### Web Application (`apps/web` — Next.js 16)
| Feature | Description | Confidence |
|---------|-------------|------------|
| **Wiki Index** | Homepage listing all entries sorted by last updated, with tag cloud and search bar | Alto |
| **Entry Viewer** (`/wiki/[slug]`) | Renders Markdown content with wikilink support (`[[slug]]`), backlinks section, tag links, relative timestamps | Alto |
| **Entry Editor** (`/edit/[[...slug]]`) | Full-page editor with split/preview modes, slug auto-generation from title, tag input (comma-separated), API key input (stored in localStorage), create/update/delete operations | Alto |
| **Full-Text Search** (`/search`) | Searches across titles, content, and tags; results sorted by relevance score; supports tag-based discovery | Alto |
| **Knowledge Graph** (`/graph`) | Interactive force-directed graph of all entries and their wikilink relationships; shows missing pages as dashed nodes; supports filtering by tag, search by name, zoom/pan/fit controls; click node to see details panel with backlinks/outgoing links | Alto |
| **Maintenance Dashboard** (`/maintenance`) | Reports on: missing linked pages, orphan pages (no inbound links), stale entries (>90 days since update), untagged entries | Alto |
| **Command Palette** (`Cmd+K`) | Quick navigation to entries and static pages (New, Search, Graph, Maintenance) | Alto |
| **Theme Switching** | Light/Dark/System theme with localStorage persistence and system preference detection | Alto |
| **Responsive Design** | Mobile-optimized navigation, responsive grid layouts, touch-friendly controls | Alto |
| **Sidebar** (`xl` screens) | Shows recent entries (last 6), popular tags (top 16), maintenance issues count; refreshes on window focus/visibility change | Alto |

### MCP Server (`apps/mcp` — Express 5 + MCP SDK)
| Feature | Description | Confidence |
|---------|-------------|------------|
| **10 Wiki Tools** | Exposes wiki operations via MCP protocol: list, get, create, update, patch, delete, search, backlinks, graph, history | Alto |
| **Streamable HTTP Transport** | Primary transport at `POST /mcp` per MCP 2024-11-05 spec with session management | Alto |
| **SSE Legacy Transport** | Fallback transport at `GET /sse` + `POST /message` for older MCP clients | Alto |
| **OAuth 2.0 + PKCE** | Full authorization server with metadata endpoint, authorization page, token exchange, dynamic client registration | Alto |
| **API Key Auth** | Simple Bearer token authentication using `WIKI_API_KEY` environment variable | Alto |
| **Health Endpoint** (`/health`) | Returns server status, version, available transports and endpoints | Alto |

---

## 2. Critical Flows

| Flow | Path | Business Impact | Confidence |
|------|------|-----------------|------------|
| **Read wiki entry** | `layout.tsx` → `page.tsx` (`/wiki/[slug]`) → `getEntry()` → file system | Core functionality — if broken, wiki is unusable | Alto |
| **Create/update entry** | `WikiEditor.tsx` → `fetch(/api/wiki)` → `requireWriteAuth()` → `createEntry/updateEntry()` → file system | Core functionality — write operations protected by API key | Alto |
| **Search entries** | `SearchBar.tsx` → `/search` page → `searchEntries()` → in-memory cache scan | Discovery functionality — affects usability | Alto |
| **Graph visualization** | `/graph` page → `getGraphData()` → `react-force-graph-2d` (client-side) | Secondary feature — affects knowledge discovery | Medio |
| **MCP tool execution** | `POST /mcp` → `authMiddleware()` → `createMcpServer()` → wiki store | External API access — critical for AI integrations | Alto |
| **OAuth authorization** | `GET /oauth/authorize` → HTML form → `POST /oauth/authorize` → `POST /oauth/token` | Authentication flow — blocks MCP client access if broken | Alto |

---

## 3. External Integrations

| Service/Library | Version | Purpose | Location |
|-----------------|---------|---------|----------|
| **Bun** | 1.3.12 | Runtime and package manager | Root package.json |
| **Next.js** | 16.2.4 | Web framework | apps/web/package.json |
| **React** | 19.1.0 | UI library | apps/web/package.json |
| **Express** | 5.2.1 | MCP server framework | apps/mcp/package.json |
| **MCP SDK** | 1.11.0 | MCP protocol implementation | apps/mcp/package.json |
| **gray-matter** | 4.0.3 | Frontmatter parsing | Both apps + shared package |
| **Zod** | 4.3.6 | Schema validation | Both apps + shared package |
| **jose** | 6.2.2 | JWT signing/verification | apps/mcp/package.json |
| **react-markdown** | 10.1.0 | Markdown rendering | apps/web/package.json |
| **react-force-graph-2d** | 1.27.1 | Graph visualization | apps/web/package.json |
| **fuse.js** | 7.0.0 | *(declared but unused)* | apps/web/package.json |
| **date-fns** | 4.1.0 | Date formatting | apps/web/package.json |
| **lucide-react** | 1.11.0 | Icons | apps/web/package.json |
| **Tailwind CSS** | 4.2.4 | Styling | apps/web/package.json |
| **File System (fs)** | Node built-in | Data persistence | packages/wiki/src/index.ts |

**Note**: `fuse.js` is declared in `apps/web/package.json` but not used anywhere in the codebase. The search implementation uses a custom scoring algorithm instead.

---

## 4. Data Models

### Wiki Entry (`WikiEntry`)
```typescript
interface WikiEntry {
  slug: string;        // URL-safe identifier (lowercase, alphanumeric, hyphens)
  title: string;       // Human-readable title (max 200 chars)
  tags: string[];      // Normalized, deduplicated, sorted tags
  created: string;     // ISO 8601 timestamp
  updated: string;     // ISO 8601 timestamp
  excerpt: string;     // First 200 chars of content, stripped of markdown
  content: string;     // Full markdown content
}
```

### File Storage Format
```markdown
---
title: Entry Title
tags: [tag1, tag2]
created: "2025-01-01T00:00:00.000Z"
updated: "2025-01-01T00:00:00.000Z"
---
Content here...
```

### Graph Data
```typescript
interface GraphData {
  nodes: GraphNode[];  // id, name, tags, missing?
  links: GraphLink[];  // source, target, missing?
}
```

### Maintenance Report
```typescript
interface MaintenanceReport {
  missing: Array<{ slug: string; sources: Backlink[] }>;
  orphans: WikiMeta[];
  stale: WikiMeta[];   // > 90 days without update
  untagged: WikiMeta[];
}
```

**Inconsistencies noticed:**
- `WikiMeta` is defined as `Omit<WikiEntry, "content">` but some API routes manually destructure content instead of using the type
- The search API route (`apps/web/app/api/search/route.ts`) manually maps out `content` instead of returning typed `WikiMeta[]`

---

## 5. Edge Cases & Error Handling

| Scenario | Current Behavior | Observations |
|----------|-----------------|--------------|
| **Missing entry** | Returns 404 with `{ error: "Not found" }` | Consistent across web and MCP |
| **Invalid slug** | `WikiError` with code `"invalid_input"` (400) | Validated via regex `^[a-z0-9-]+$` and path traversal check |
| **Path traversal attempt** | `WikiError` with code `"path_traversal"` (400) | Uses `path.resolve()` + `startsWith()` check |
| **Duplicate slug on create** | `WikiError` with code `"conflict"` (409) | Prevents overwrite |
| **Malformed frontmatter** | Entry silently skipped during indexing | Could hide corrupted data from users |
| **Empty search query** | Returns empty array immediately | Good UX |
| **Zod validation failure** | Returns 400 with first error message | Only first error shown, not all |
| **Unauthorized write** | Returns 401/403/503 depending on config | Web API returns JSON; MCP returns plain text |
| **Missing JWT secret in prod** | `process.exit(1)` with console.error | Hard crash — appropriate for startup |
| **OAuth code expiration** | 5-minute TTL with in-memory cleanup | Single-use codes consumed immediately |
| **CORS on MCP** | `origin: "*"` with Bearer auth | Open CORS by design for MCP clients |
| **Large request bodies** | Limited to 1MB via express.json() | DoS protection present |
| **Session cleanup** | In-memory Map with `onclose` handler | Memory leak risk if sessions aren't closed properly |
| **API key stored in localStorage** | `agent-wiki-api-key` key | XSS vulnerability — could be stolen by malicious scripts |
| **Cache staleness** | Signature-based invalidation (mtime + size) | Race condition possible between read and write |
| **History snapshots** | Saved before every update/patch/delete | Stored in `.history/[slug]/` directory |
| **Stale date parsing** | `Number.isNaN(Date.parse(entry.updated))` | Uses `isNaN` incorrectly — should be `isNaN()` without `Number.` |

---

## Summary

The Agent Wiki is a **well-contained, single-purpose application** with clear separation between web UI and MCP API. It uses file-based storage (good for simplicity, bad for concurrency/scale), has basic auth (API key + OAuth), and provides a rich visual experience (graph, themes, responsive design). The codebase is relatively small (~3,800 lines) and the architecture is straightforward, but there are duplications and inconsistencies that should be addressed before scaling.

**AGENTS.md Accuracy**: The existing `AGENTS.md` is **95% accurate**. Minor discrepancies:
- It says "Next.js 16" but the package.json shows `16.2.4` (patch version mismatch, trivial)
- It doesn't mention the unused `fuse.js` dependency
- It doesn't document the `slugify` duplication between wiki package and WikiEditor
- It doesn't mention the API key localStorage storage (security note)

Overall, `AGENTS.md` faithfully represents the codebase and only needs minor updates.
