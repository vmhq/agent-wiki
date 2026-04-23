# Agent Wiki — Codex guide

## Project overview

Bun monorepo with two apps that share a `wiki/` directory of Markdown files:

- `apps/web` — Next.js 15 web app (port 3000)
- `apps/mcp` — Express + MCP SDK server (port 3001)

Wiki files live at the repo root under `wiki/` (locally) or `/wiki` (Docker volume).

## Commands

```bash
# Install all dependencies
bun install

# Run both apps in parallel (dev mode)
bun run dev

# Run only the web app
bun run --filter web dev

# Run only the MCP server
bun run --filter mcp dev

# Type-check both apps
bun run --filter web typecheck
bun run --filter mcp typecheck

# Build everything
bun run build

# Build a single app
bun run --filter web build
bun run --filter mcp build
```

## Architecture

### Storage layer

Both apps read/write the same Markdown files via their own copy of the wiki library:

- `apps/web/lib/wiki.ts` — used by Next.js API routes and server components
- `apps/mcp/src/wiki.ts` — used by MCP tools

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

- **Pages**: `/` (index), `/wiki/[slug]` (viewer), `/search` (search), `/graph` (graph)
- **API routes**: `/api/wiki`, `/api/wiki/[slug]`, `/api/search`, `/api/graph`
- **Components**: `WikiCard`, `MarkdownRenderer`, `GraphView`, `SearchBar`, `Navbar`
- All pages use `dynamic = "force-dynamic"` so they always read fresh files
- The graph view uses `react-force-graph-2d` loaded with `dynamic(..., { ssr: false })`
- Wikilinks (`[[slug]]`) are pre-processed in `MarkdownRenderer` before passing to react-markdown

### MCP server (`apps/mcp`)

- **Transport**: Streamable HTTP at `POST /mcp` (MCP 2024-11-05 spec) + SSE legacy at `GET /sse`
- **Auth**: `apps/mcp/src/auth.ts` handles both OAuth 2.0 (with PKCE) and API key
- **Tools**: Defined in `apps/mcp/src/server.ts` using `McpServer` from the SDK
- **OAuth endpoints**: `/.well-known/oauth-authorization-server`, `/oauth/authorize`, `/oauth/token`, `/oauth/register`

## Key files

| File | Purpose |
|------|---------|
| `apps/web/lib/wiki.ts` | All file-system operations + graph data builder |
| `apps/web/components/GraphView.tsx` | Force-directed graph (SSR disabled) |
| `apps/web/components/MarkdownRenderer.tsx` | Markdown render + `[[wikilink]]` parsing |
| `apps/mcp/src/server.ts` | MCP tool definitions (7 tools) |
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
| `WIKI_API_KEY` | MCP server | API key for `Authorization: Bearer` auth |
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

1. Add the function to both `apps/web/lib/wiki.ts` and `apps/mcp/src/wiki.ts` (they're identical in structure)
2. Expose it via an API route in `apps/web/app/api/...`
3. Optionally expose it as a new MCP tool

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

- Web app: `target: ES2017`, `downlevelIteration: true` (needed for `Array.from(new Set(...))`)
- Use `Array.from(new Set(...))` instead of `[...new Set(...)]` to avoid TS2802
- `react-force-graph-2d` is imported as `dynamic<any>(...)` to bypass complex generic type mismatch
- MCP server: `"module": "ESNext"`, `"moduleResolution": "bundler"`, all imports use `.js` extensions
