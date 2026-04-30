---
title: Getting Started
tags:
  - meta
  - guide
created: "2025-01-01T00:00:00.000Z"
updated: "2025-01-01T00:00:00.000Z"
---

# Getting Started

This guide explains how to use and contribute to the Agent Wiki.

## Entry Format

Each wiki entry is a Markdown file with YAML frontmatter:

```markdown
---
title: My Entry Title
tags:
  - tag1
  - tag2
created: "2025-01-01T00:00:00.000Z"
updated: "2025-01-01T00:00:00.000Z"
---

# My Entry Title

Content here...
```

## Linking Between Entries

Use `[[slug]]` syntax to create links between entries:

- `[[getting-started]]` → links to this page
- `[[machine-learning|ML]]` → link with custom label

These links are parsed to build the [[welcome|knowledge graph]].

## Using the Web Interface

- **Index** (`/`) — Browse all entries, filter by tag
- **Search** (`/search`) — Full-text search
- **Graph** (`/graph`) — Visual relationship map

## Using the MCP Server

AI agents can interact with the wiki via the MCP server at port `3001`.

See [[mcp-integration]] for setup details.

## API Endpoints

The web app exposes a REST API:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/wiki` | List all entries |
| `POST` | `/api/wiki` | Create entry |
| `GET` | `/api/wiki/:slug` | Get entry |
| `PUT` | `/api/wiki/:slug` | Replace entry |
| `PATCH` | `/api/wiki/:slug` | Patch entry |
| `DELETE` | `/api/wiki/:slug` | Delete entry |
| `GET` | `/api/search?q=...` | Search entries |
