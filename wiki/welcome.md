---
title: Welcome to Agent Wiki
tags:
  - meta
  - getting-started
created: "2025-01-01T00:00:00.000Z"
updated: "2025-01-01T00:00:00.000Z"
---

# Welcome to Agent Wiki

Agent Wiki is an **AI-maintained knowledge base** based on the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) by Andrej Karpathy.

## Core Idea

Instead of using RAG (Retrieval-Augmented Generation) to query raw documents on every request, this wiki compiles knowledge **once** and maintains it continuously. Over time, new information updates existing pages rather than creating isolated fragments.

> "The wiki is a persistent, compounding artifact" — Andrej Karpathy

## Three Operations

| Operation | Description |
|-----------|-------------|
| **Ingest** | Process new sources, update relevant wiki pages |
| **Query** | Search wiki pages and synthesize answers |
| **Lint** | Health-check for contradictions, orphans, stale claims |

## Navigation

- [[getting-started]] — How to use this wiki
- [[mcp-integration]] — Connect AI agents via the MCP server

## Wikilinks

Use `[[slug]]` syntax to link between entries. The graph view at `/graph` visualizes all connections.
