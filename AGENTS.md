# Agent Wiki — Codex guide

## Project overview

Bun monorepo with a shared wiki library and two apps:

- `apps/web` — Next.js 16 web app (port 3000)
- `apps/mcp` — Express 5 + body-parser + MCP SDK server (port 3001)
- `packages/wiki` — Shared wiki library (`@agent-wiki/wiki`) used by both apps

Wiki files live at the repo root under `wiki/` (locally) or `/wiki` (Docker volume).

## Commands

```bash
# Install all dependencies
bun install

# Run both apps in parallel (dev mode)
# Also builds the shared @agent-wiki/wiki package first
bun run dev

# Run only the web app
bun run --filter web dev

# Run only the MCP server
bun run --filter mcp dev

# Type-check both apps
bun run typecheck

# Build everything (wiki package + both apps)
bun run build

# Build a single app
bun run --filter web build
bun run --filter mcp build

# Run tests for the shared wiki package
bun run test

# Lint everything
bun run lint
```

## Architecture

### Storage layer

Both apps use the shared `@agent-wiki/wiki` package:

- `packages/wiki/src/index.ts` — Core wiki operations (CRUD, search, graph, history, maintenance)
- `apps/web/lib/wiki.ts` — Thin wrapper that creates a store instance and re-exports types/schemas
- `apps/mcp/src/wiki.ts` — Identical wrapper for the MCP server

The path is configured via `WIKI_DIR` env var (default: `../../wiki` relative to each app's CWD in development, `/wiki` in Docker).

Files use gray-matter frontmatter:

```markdown
---
title: Entry Title
tags: [tag1, tag2]
created: "2025-01-01T00:00:00.000Z"
updated: "2025-01-01T00:00:00.000Z"
---
```

### Web app (`apps/web`)

- **Pages**: `/` (index), `/wiki/[slug]` (viewer), `/edit/[[...slug]]` (editor), `/search` (search), `/graph` (graph), `/maintenance` (maintenance report)
- **API routes**: `/api/wiki`, `/api/wiki/[slug]`, `/api/search`, `/api/graph`, `/api/health`
- **Components**: `WikiCard`, `MarkdownRenderer`, `GraphView`, `SearchBar`, `Navbar`, `WikiEditor`, `AppSidebar`, `CommandPalette`, `ThemeProvider`, `ThemeSwitcher`, `TagCloud`, `ViewSwitcher`
- All pages use `dynamic = "force-dynamic"` so they always read fresh files
- The graph view uses `react-force-graph-2d` loaded with `dynamic(..., { ssr: false })`
- Wikilinks (`[[slug]]`) are pre-processed in `MarkdownRenderer` before passing to react-markdown
- Write operations (POST/PUT/PATCH/DELETE) require API key auth via `apps/web/lib/auth.ts`

### MCP server (`apps/mcp`)

- **Transport**: Streamable HTTP at `POST /mcp` (MCP 2024-11-05 spec) + SSE legacy at `GET /sse`
- **Auth**: `apps/mcp/src/auth.ts` handles both OAuth 2.0 (with PKCE) and API key
- **Tools**: Defined in `apps/mcp/src/server.ts` using `McpServer` from the SDK
- **OAuth endpoints**: `/.well-known/oauth-authorization-server`, `/oauth/authorize`, `/oauth/token`, `/oauth/register`

## Key files

| File | Purpose |
|------|---------|
| `packages/wiki/src/index.ts` | Core wiki library (CRUD, search, graph, history, maintenance) |
| `apps/web/lib/wiki.ts` | Web app wrapper around `@agent-wiki/wiki` |
| `apps/web/lib/auth.ts` | API key auth middleware for Next.js write routes |
| `apps/web/components/GraphView.tsx` | Force-directed graph (SSR disabled) |
| `apps/web/components/MarkdownRenderer.tsx` | Markdown render + `[[wikilink]]` parsing |
| `apps/web/components/editor/WikiEditor.tsx` | Full-page wiki editor with preview |
| `apps/mcp/src/server.ts` | MCP tool definitions (10 tools) |
| `apps/mcp/src/auth.ts` | OAuth 2.0 server + JWT helpers + auth middleware |
| `apps/mcp/src/index.ts` | Express server wiring everything together |
| `Dockerfile.web` | Multi-stage build for web (uses Next.js standalone output) |
| `Dockerfile.mcp` | Multi-stage build for MCP server |
| `docker-compose.yml` | Orchestrates both services with a shared `wiki_data` volume |
| `.github/workflows/docker.yml` | Builds and pushes images to GHCR on push to main |

## Environment variables

Copy `.env.example` to `.env` before running locally. Key variables:

| Variable | Where used | Notes |
|----------|-----------|-------|
| `WIKI_DIR` | Both apps | Path to wiki files |
| `WIKI_API_KEY` | Both apps | API key for `Authorization: Bearer` auth (required in production for both web and MCP) |
| `WIKI_OAUTH_PASSWORD` | MCP server | Password shown on OAuth consent page |
| `WIKI_JWT_SECRET` | MCP server | Signs access tokens — must be secret in prod |
| `MCP_BASE_URL` | MCP server | Public URL included in OAuth metadata |
| `WEB_PORT` | docker-compose | Host port for web app |
| `MCP_PORT` | docker-compose | Host port for MCP server |

## Adding a new MCP tool

1. Open `apps/mcp/src/server.ts`
2. Call `server.tool(name, description, zodSchema, handler)` — see existing tools for pattern
3. The tool is automatically available to all connected clients; no registration needed

## Adding a new wiki operation

1. Add the function to `packages/wiki/src/index.ts`
2. Re-export it from `apps/web/lib/wiki.ts` and `apps/mcp/src/wiki.ts`
3. Expose it via an API route in `apps/web/app/api/...`
4. Optionally expose it as a new MCP tool

## Docker

```bash
# Build and start
docker compose up -d --build

# View logs
docker compose logs -f web
docker compose logs -f mcp

# Restart a service
docker compose restart mcp

# Stop everything
docker compose down

# Remove everything including the wiki volume (destructive!)
docker compose down -v
```

The `wiki_data` Docker volume persists wiki files across container restarts. In production, consider backing this up or mounting a host directory instead.

## TypeScript notes

- **TypeScript 6** — stricter than 5; `@types/node@25` requires `"types": ["node"]` in tsconfig for Node.js globals (`fs`, `path`)
- Web app: `target: ES2017` (Next.js auto-adds `downlevelIteration` when needed for `Array.from(new Set(...))`)
- Use `Array.from(new Set(...))` instead of `[...new Set(...)]` to avoid TS2802
- `react-force-graph-2d` is imported as `dynamic<any>(...)` to bypass complex generic type mismatch
- MCP server: `"module": "ESNext"`, `"moduleResolution": "bundler"`, all imports use `.js` extensions
- **Express 5**: `express.json()` and `express.urlencoded()` are re-exported from `body-parser` — the separate `body-parser` dependency ensures correct types
