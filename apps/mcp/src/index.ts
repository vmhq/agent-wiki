/**
 * Agent Wiki — MCP Server
 *
 * Exposes the wiki as an MCP server over HTTP with:
 *   - StreamableHTTP transport at POST /mcp  (MCP 2024-11-05)
 *   - SSE legacy transport at GET /sse + POST /message
 *   - OAuth 2.0 authorization server (claude.ai compatible)
 *   - API key authentication (Authorization: Bearer <WIKI_API_KEY>)
 *
 * Health: GET /health
 */

import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMcpServer } from "./server.js";
import { createOAuthRouter, authMiddleware } from "./auth.js";

const PORT = parseInt(process.env.MCP_PORT ?? "3001", 10);
const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
// Limit request bodies to prevent DoS via large payloads.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
// CORS: open to all origins — required for MCP clients (claude.ai, etc.) that
// connect from arbitrary origins. Auth is enforced via Bearer token, not CORS.
app.use(
  cors({
    origin: "*",
    allowedHeaders: ["Content-Type", "Authorization", "mcp-session-id"],
    exposedHeaders: ["mcp-session-id"],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  })
);

// ── OAuth endpoints (no auth required) ───────────────────────────────────────
app.use(createOAuthRouter());

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    name: "agent-wiki-mcp",
    version: "1.0.0",
    transport: ["streamable-http", "sse"],
    endpoints: {
      mcp: "/mcp",
      sse: "/sse",
      oauth_metadata: "/.well-known/oauth-authorization-server",
    },
  });
});

// ── MCP info (no auth) ────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    name: "Agent Wiki MCP",
    description: "MCP server for Agent Wiki — an AI-maintained knowledge base",
    mcp_version: "2024-11-05",
    tools: [
      "wiki_list",
      "wiki_get",
      "wiki_create",
      "wiki_update",
      "wiki_patch",
      "wiki_delete",
      "wiki_search",
    ],
    auth: {
      type: "oauth2 or api_key",
      oauth_metadata: "/.well-known/oauth-authorization-server",
      api_key: "Set WIKI_API_KEY env var and pass as Authorization: Bearer <key>",
    },
  });
});

// ── Streamable HTTP transport (MCP 2024-11-05, preferred) ─────────────────────
const sessions = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (req, res) => {
  // Auth check
  await new Promise<void>((resolve) => {
    authMiddleware(req, res, resolve);
  });
  if (res.headersSent) return;

  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  let transport: StreamableHTTPServerTransport;
  if (sessionId && sessions.has(sessionId)) {
    transport = sessions.get(sessionId)!;
  } else {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, transport);
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) sessions.delete(transport.sessionId);
    };
    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  await new Promise<void>((resolve) => {
    authMiddleware(req, res, resolve);
  });
  if (res.headersSent) return;

  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }
  const transport = sessions.get(sessionId)!;
  await transport.handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  await new Promise<void>((resolve) => {
    authMiddleware(req, res, resolve);
  });
  if (res.headersSent) return;

  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

// ── SSE legacy transport (for older MCP clients) ──────────────────────────────
const sseTransports = new Map<string, SSEServerTransport>();

app.get("/sse", async (req, res) => {
  await new Promise<void>((resolve) => {
    authMiddleware(req, res, resolve);
  });
  if (res.headersSent) return;

  const transport = new SSEServerTransport("/message", res);
  sseTransports.set(transport.sessionId, transport);

  res.on("close", () => {
    sseTransports.delete(transport.sessionId);
  });

  const mcpServer = createMcpServer();
  await mcpServer.connect(transport);
});

app.post("/message", async (req, res) => {
  await new Promise<void>((resolve) => {
    authMiddleware(req, res, resolve);
  });
  if (res.headersSent) return;

  const sessionId = req.query.sessionId as string;
  const transport = sseTransports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  await transport.handlePostMessage(req, res);
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Agent Wiki MCP server running on http://localhost:${PORT}`);
  console.log(`  Health:   http://localhost:${PORT}/health`);
  console.log(`  MCP:      http://localhost:${PORT}/mcp  (POST, Streamable HTTP)`);
  console.log(`  SSE:      http://localhost:${PORT}/sse  (GET, legacy)`);
  console.log(`  OAuth:    http://localhost:${PORT}/.well-known/oauth-authorization-server`);
});
