# Agent Wiki

An AI-maintained knowledge base built on the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) by Andrej Karpathy. Instead of running RAG on every query, knowledge is compiled once into persistent Markdown entries that grow richer over time as AI agents ingest new sources and update existing pages.

## What's included

| Component | Port | Description |
|-----------|------|-------------|
| **Web app** | `3000` | Index, Markdown viewer, full-text search, Obsidian-style graph |
| **MCP server** | `3001` | Model Context Protocol server — lets Claude and other AI agents read/write the wiki |

**Stack:** Next.js 15 · TypeScript · Tailwind CSS v4 · react-force-graph-2d · `@modelcontextprotocol/sdk` · Express · OAuth 2.0 + PKCE · pnpm workspaces · Docker · GitHub Actions

---

## Quick start

### Local development

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum change WIKI_API_KEY and WIKI_OAUTH_PASSWORD

# 3. Start both services in parallel
pnpm dev
```

- Web app → http://localhost:3000
- MCP server → http://localhost:3001

### Docker Compose

```bash
cp .env.example .env
# Edit .env with your secrets

docker compose up -d
```

To rebuild after code changes:

```bash
docker compose up -d --build
```

---

## Project structure

```
agent-wiki/
├── apps/
│   ├── web/                    # Next.js 15 web application
│   │   ├── app/
│   │   │   ├── page.tsx        # Index — list all wiki entries
│   │   │   ├── wiki/[slug]/    # Markdown viewer
│   │   │   ├── search/         # Full-text search
│   │   │   ├── graph/          # Obsidian-style knowledge graph
│   │   │   └── api/            # REST API (wiki CRUD + search + graph)
│   │   ├── components/
│   │   │   ├── WikiCard.tsx
│   │   │   ├── MarkdownRenderer.tsx   # react-markdown + wikilinks
│   │   │   ├── GraphView.tsx          # react-force-graph-2d
│   │   │   ├── SearchBar.tsx
│   │   │   └── Navbar.tsx
│   │   └── lib/wiki.ts         # File-system operations + graph parser
│   └── mcp/                    # MCP server
│       └── src/
│           ├── index.ts        # Express server (Streamable HTTP + SSE)
│           ├── server.ts       # MCP tools definition
│           ├── auth.ts         # OAuth 2.0 server + API key middleware
│           └── wiki.ts         # Storage layer
├── wiki/                       # Markdown files (Docker shared volume)
├── Dockerfile.web
├── Dockerfile.mcp
├── docker-compose.yml
└── .github/workflows/docker.yml
```

---

## Wiki entry format

Each entry is a `.md` file with YAML frontmatter:

```markdown
---
title: Neural Networks
tags:
  - ml
  - deep-learning
created: "2025-01-01T00:00:00.000Z"
updated: "2025-01-01T00:00:00.000Z"
---

# Neural Networks

Content here. Use [[wikilinks]] to connect entries.

See also: [[transformers]], [[backpropagation]]
```

Link between entries with `[[slug]]` or `[[slug|custom label]]`. The graph view at `/graph` renders all connections.

---

## REST API

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/wiki` | — | List all entries (metadata only) |
| `POST` | `/wiki` | `{slug, title, content, tags?}` | Create entry |
| `GET` | `/wiki/:slug` | — | Get full entry |
| `PUT` | `/wiki/:slug` | `{content, title?, tags?}` | Replace entry |
| `PATCH` | `/wiki/:slug` | `{operation, ...}` | Patch entry (see below) |
| `DELETE` | `/wiki/:slug` | — | Delete entry |
| `GET` | `/search?q=...` | — | Full-text search |
| `GET` | `/graph` | — | Graph nodes + links |

### PATCH operations

```jsonc
// Append content at the end
{ "operation": "append", "content": "## New section\n..." }

// Prepend content at the beginning
{ "operation": "prepend", "content": "> Note: ..." }

// Find and replace text
{ "operation": "replace", "search": "old text", "replacement": "new text" }

// Insert after an anchor
{ "operation": "insert_after", "anchor": "## Introduction", "content": "..." }

// Insert before an anchor
{ "operation": "insert_before", "anchor": "## References", "content": "..." }
```

---

## MCP server

The MCP server runs on port `3001` and exposes 7 tools to any MCP-compatible client (Claude Desktop, claude.ai, custom agents).

### Available tools

| Tool | Description |
|------|-------------|
| `wiki_list` | List all entries with metadata |
| `wiki_get` | Get full content of an entry |
| `wiki_create` | Create a new entry |
| `wiki_update` | Replace entire entry content |
| `wiki_patch` | Modify part of an entry (append / prepend / replace / insert) |
| `wiki_delete` | Delete an entry |
| `wiki_search` | Full-text search across all entries |

### Connecting from Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agent-wiki": {
      "type": "http",
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Replace `YOUR_API_KEY` with the value of `WIKI_API_KEY` in your `.env`.

### Connecting from claude.ai (OAuth)

1. In claude.ai → **Settings → Integrations → Add MCP server**
2. Enter the MCP server URL: `http://your-server:3001`
3. Claude will discover the OAuth metadata automatically and redirect you to authorize
4. Enter your `WIKI_OAUTH_PASSWORD` to allow access

The server exposes a full OAuth 2.0 authorization server at `/.well-known/oauth-authorization-server` (RFC 8414) with PKCE support.

### Connecting via API key (curl / scripts)

```bash
# List entries
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:3001/health

# MCP JSON-RPC (Streamable HTTP transport)
curl -X POST http://localhost:3001/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---

## Environment variables

See [`.env.example`](.env.example) for all variables. Required changes before production:

| Variable | Default | Notes |
|----------|---------|-------|
| `WIKI_API_KEY` | `changeme` | **Change this** — used for API key auth |
| `WIKI_OAUTH_PASSWORD` | `changeme` | **Change this** — OAuth login password |
| `WIKI_JWT_SECRET` | `change-this-...` | **Change this** — must be a long random string |
| `MCP_BASE_URL` | `http://localhost:3001` | Set to public URL when deploying (needed for OAuth) |
| `WIKI_DIR` | `/wiki` | Path to wiki files (Docker volume or local path) |

Generate a secure secret:

```bash
openssl rand -hex 32
```

---

## CI/CD — GitHub Actions

On every push to `main` (and on version tags `v*.*.*`), GitHub Actions builds and pushes two images to GitHub Container Registry:

- `ghcr.io/YOUR_ORG/agent-wiki/web:latest`
- `ghcr.io/YOUR_ORG/agent-wiki/mcp:latest`

Images are built for `linux/amd64` and `linux/arm64` with layer caching.

To pull pre-built images instead of building locally:

```bash
# Set your GitHub repo in .env
echo "GITHUB_REPOSITORY=your-username/agent-wiki" >> .env

docker compose pull
docker compose up -d
```

---

## Karpathy LLM Wiki pattern

This project implements the three-layer architecture from the gist:

```
Raw sources  →  [Ingest]  →  Wiki (Markdown files)  →  [Query]  →  Answer
                                      ↑
                                  [Lint / prune]
```

- **Ingest**: Point an AI agent at a document/URL, ask it to update relevant wiki pages using `wiki_create` / `wiki_patch`
- **Query**: Ask the agent a question; it calls `wiki_search` + `wiki_get` to retrieve context
- **Lint**: Periodically ask the agent to call `wiki_list` and identify orphans, contradictions, or stale pages

The key advantage over RAG: connections between concepts are compiled into the wiki once, so queries get pre-synthesized knowledge rather than raw fragments.

---

## License

MIT
