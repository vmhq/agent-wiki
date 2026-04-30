---
title: MCP Integration
tags:
  - mcp
  - ai
  - api
created: "2025-01-01T00:00:00.000Z"
updated: "2025-01-01T00:00:00.000Z"
---

# MCP Integration

The Agent Wiki exposes a **Model Context Protocol (MCP) server** on port `3001`, allowing Claude and other AI agents to read and write wiki entries.

## Authentication

Two methods are supported:

### API Key (simple)

```bash
# Set env var
WIKI_API_KEY=your-secret-key

# Use in requests
Authorization: Bearer your-secret-key
```

### OAuth 2.0 (for claude.ai)

The server implements a full OAuth 2.0 authorization server:

- **Metadata**: `GET /.well-known/oauth-authorization-server`
- **Authorize**: `GET /oauth/authorize`
- **Token**: `POST /oauth/token`
- **Register client**: `POST /oauth/register`

Configure `WIKI_OAUTH_PASSWORD` to set the authorization password (default: `changeme`).

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `wiki_list` | List all entries with metadata |
| `wiki_get` | Get full content of an entry |
| `wiki_create` | Create a new entry |
| `wiki_update` | Replace entire entry content |
| `wiki_patch` | Modify part of an entry |
| `wiki_delete` | Delete an entry |
| `wiki_search` | Full-text search |

## Connecting from Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agent-wiki": {
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer your-api-key"
      }
    }
  }
}
```

## Connecting from claude.ai

1. Go to claude.ai → Settings → Integrations
2. Add MCP server: `http://your-server:3001`
3. Authorize via OAuth flow

## Example Usage

```
User: Add a new entry about transformers architecture
Claude: [calls wiki_create with slug="transformers", ...]

User: Update the neural networks entry with recent developments  
Claude: [calls wiki_get("neural-networks"), then wiki_patch with append operation]

User: What do we know about attention mechanisms?
Claude: [calls wiki_search("attention mechanisms"), reads results]
```

See also: [[getting-started]], [[welcome]]
