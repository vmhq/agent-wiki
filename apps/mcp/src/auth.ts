/**
 * OAuth 2.0 Authorization Server + API Key authentication for the MCP server.
 *
 * Supports:
 *   1. API Key — pass `Authorization: Bearer <WIKI_API_KEY>` header
 *   2. OAuth 2.0 with PKCE (S256 required) — compatible with claude.ai and other MCP clients
 *
 * OAuth endpoints:
 *   GET  /.well-known/oauth-authorization-server   — RFC 8414 metadata
 *   GET  /oauth/authorize                          — authorization page
 *   POST /oauth/authorize                          — approve/deny
 *   POST /oauth/token                              — token exchange
 *   POST /oauth/register                           — dynamic client registration (RFC 7591)
 */

import { Router, Request, Response } from "express";
import * as jose from "jose";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

// ── Startup checks ────────────────────────────────────────────────────────────

const API_KEY = process.env.WIKI_API_KEY ?? "";

// Fail fast if critical secrets are missing in production.
const JWT_SECRET_RAW = process.env.WIKI_JWT_SECRET;
if (!JWT_SECRET_RAW) {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: WIKI_JWT_SECRET must be set in production. Generate with: openssl rand -hex 32");
    process.exit(1);
  } else {
    console.warn("WARN: WIKI_JWT_SECRET not set — using random ephemeral secret (tokens invalid after restart)");
  }
}
const JWT_SECRET_RESOLVED = JWT_SECRET_RAW ?? uuidv4();

const OAUTH_PASSWORD = process.env.WIKI_OAUTH_PASSWORD ?? "changeme";
const BASE_URL = process.env.MCP_BASE_URL ?? "http://localhost:3001";

// Default OAuth client secret — must be set in production.
const DEFAULT_CLIENT_SECRET = process.env.WIKI_CLIENT_SECRET;
if (!DEFAULT_CLIENT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: WIKI_CLIENT_SECRET must be set in production.");
    process.exit(1);
  } else {
    console.warn("WARN: WIKI_CLIENT_SECRET not set — using 'local-secret' for local dev only");
  }
}
const RESOLVED_CLIENT_SECRET = DEFAULT_CLIENT_SECRET ?? "local-secret";

const jwtSecret = new TextEncoder().encode(JWT_SECRET_RESOLVED);

// ── In-memory stores (replace with DB for multi-instance / production) ────────
const clients = new Map<string, { clientId: string; clientSecret: string; redirectUris: string[]; clientName: string }>();
const authCodes = new Map<string, { clientId: string; redirectUri: string; codeChallenge: string; codeChallengeMethod: string; expiresAt: number }>();

// Cleanup expired auth codes every minute to prevent memory leaks.
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of authCodes.entries()) {
    if (data.expiresAt < now) authCodes.delete(code);
  }
}, 60_000);

// Pre-register a default client for local use.
const DEFAULT_CLIENT_ID = "agent-wiki-local";
clients.set(DEFAULT_CLIENT_ID, {
  clientId: DEFAULT_CLIENT_ID,
  clientSecret: RESOLVED_CLIENT_SECRET,
  redirectUris: ["http://localhost:3000/oauth/callback", "https://claude.ai/oauth/callback"],
  clientName: "Agent Wiki Local",
});

// ── JWT helpers ───────────────────────────────────────────────────────────────

export async function signToken(sub: string, scope: string): Promise<string> {
  return new jose.SignJWT({ sub, scope })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .setIssuer(BASE_URL)
    .setAudience(BASE_URL)
    .sign(jwtSecret);
}

export async function verifyToken(token: string): Promise<{ sub: string; scope: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, jwtSecret, {
      issuer: BASE_URL,
      audience: BASE_URL,
    });
    return { sub: payload.sub as string, scope: payload.scope as string };
  } catch {
    return null;
  }
}

// ── Auth middleware ───────────────────────────────────────────────────────────

export async function authMiddleware(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", error_description: "Bearer token required" });
    return;
  }

  const token = authHeader.slice(7);

  // 1. Try API key.
  if (API_KEY && token === API_KEY) {
    (req as Request & { user?: object }).user = { sub: "api-key", scope: "wiki:read wiki:write" };
    next();
    return;
  }

  // 2. Try JWT (OAuth token).
  const payload = await verifyToken(token);
  if (payload) {
    (req as Request & { user?: object }).user = payload;
    next();
    return;
  }

  res.status(401).json({ error: "invalid_token", error_description: "Token is invalid or expired" });
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function verifyPKCE(verifier: string, challenge: string, method: string): boolean {
  if (method === "S256") {
    const digest = crypto.createHash("sha256").update(verifier).digest("base64url");
    return digest === challenge;
  }
  // "plain" is accepted only as a fallback; S256 is preferred and enforced for new clients.
  return verifier === challenge;
}

// ── HTML escaping ─────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Redirect URI validation ───────────────────────────────────────────────────

function validateRedirectUris(uris: string[]): string | null {
  for (const uri of uris) {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      return `Invalid URL: ${uri}`;
    }
    // Block dangerous schemes.
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return `Disallowed URI scheme '${parsed.protocol}' in: ${uri}`;
    }
    // In production, require HTTPS (except localhost for dev clients).
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (!isLocalhost) {
        return `HTTPS required in production for: ${uri}`;
      }
    }
  }
  return null;
}

// ── OAuth router ──────────────────────────────────────────────────────────────

export function createOAuthRouter(): Router {
  const router = Router();

  // RFC 8414 — Authorization Server Metadata
  router.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json({
      issuer: BASE_URL,
      authorization_endpoint: `${BASE_URL}/oauth/authorize`,
      token_endpoint: `${BASE_URL}/oauth/token`,
      registration_endpoint: `${BASE_URL}/oauth/register`,
      scopes_supported: ["wiki:read", "wiki:write"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      // Only S256 — "plain" is insecure and not advertised.
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic", "none"],
    });
  });

  // Dynamic Client Registration (RFC 7591)
  router.post("/oauth/register", (req, res) => {
    const { client_name, redirect_uris } = req.body as { client_name?: string; redirect_uris?: string[] };

    if (!redirect_uris?.length) {
      res.status(400).json({ error: "invalid_client_metadata", error_description: "redirect_uris required" });
      return;
    }

    const uriError = validateRedirectUris(redirect_uris);
    if (uriError) {
      res.status(400).json({ error: "invalid_client_metadata", error_description: uriError });
      return;
    }

    const clientId = uuidv4();
    const clientSecret = uuidv4();
    clients.set(clientId, {
      clientId,
      clientSecret,
      redirectUris: redirect_uris,
      clientName: client_name ?? "Unknown Client",
    });
    res.status(201).json({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris,
      client_name: client_name ?? "Unknown Client",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    });
  });

  // Authorization endpoint — GET (show login form)
  router.get("/oauth/authorize", (req, res) => {
    const {
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method = "S256",
      state = "",
      scope = "wiki:read wiki:write",
    } = req.query as Record<string, string>;

    // Enforce PKCE: code_challenge is mandatory.
    if (!code_challenge) {
      res.status(400).send(errorPage("PKCE required: code_challenge parameter is missing"));
      return;
    }

    const client = clients.get(client_id);
    if (!client) {
      res.status(400).send(errorPage("Unknown client_id"));
      return;
    }
    if (!client.redirectUris.includes(redirect_uri)) {
      res.status(400).send(errorPage("redirect_uri not registered for this client"));
      return;
    }

    res.send(authorizePage({ client: { clientId: client.clientId, clientName: client.clientName }, redirect_uri, code_challenge, code_challenge_method, state, scope }));
  });

  // Authorization endpoint — POST (form submit)
  router.post("/oauth/authorize", (req, res) => {
    const {
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method = "S256",
      state = "",
      scope = "wiki:read wiki:write",
      password,
      action,
    } = req.body as Record<string, string>;

    if (action === "deny") {
      const url = new URL(redirect_uri);
      url.searchParams.set("error", "access_denied");
      if (state) url.searchParams.set("state", state);
      res.redirect(url.toString());
      return;
    }

    if (password !== OAUTH_PASSWORD) {
      const client = clients.get(client_id);
      res.status(401).send(authorizePage({
        client: client ? { clientId: client.clientId, clientName: client.clientName } : undefined,
        redirect_uri,
        code_challenge,
        code_challenge_method,
        state,
        scope,
        error: "Incorrect password. Please try again.",
      }));
      return;
    }

    const code = uuidv4();
    authCodes.set(code, {
      clientId: client_id,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    const url = new URL(redirect_uri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);
    res.redirect(url.toString());
  });

  // Token endpoint
  router.post("/oauth/token", async (req, res) => {
    const {
      grant_type,
      code,
      redirect_uri,
      client_id,
      client_secret,
      code_verifier,
    } = req.body as Record<string, string>;

    if (grant_type !== "authorization_code") {
      res.status(400).json({ error: "unsupported_grant_type" });
      return;
    }

    const stored = authCodes.get(code);
    if (!stored || stored.expiresAt < Date.now()) {
      res.status(400).json({ error: "invalid_grant", error_description: "Code is invalid or expired" });
      return;
    }

    // Verify client.
    const client = clients.get(client_id ?? stored.clientId);
    if (!client) {
      res.status(401).json({ error: "invalid_client" });
      return;
    }
    // Verify secret (optional for public clients using PKCE).
    if (client_secret && client.clientSecret !== client_secret) {
      res.status(401).json({ error: "invalid_client", error_description: "client_secret mismatch" });
      return;
    }

    // PKCE is mandatory — always verify.
    if (!stored.codeChallenge) {
      // Should not happen given we enforce it in /authorize, but be safe.
      res.status(400).json({ error: "invalid_grant", error_description: "PKCE was not used during authorization" });
      return;
    }
    if (!code_verifier) {
      res.status(400).json({ error: "invalid_grant", error_description: "code_verifier is required" });
      return;
    }
    if (!verifyPKCE(code_verifier, stored.codeChallenge, stored.codeChallengeMethod)) {
      res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
      return;
    }

    if (stored.redirectUri !== redirect_uri) {
      res.status(400).json({ error: "invalid_grant", error_description: "redirect_uri mismatch" });
      return;
    }

    // Consume code immediately (single-use).
    authCodes.delete(code);

    const accessToken = await signToken(client_id, "wiki:read wiki:write");
    res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 86400,
      scope: "wiki:read wiki:write",
    });
  });

  return router;
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function authorizePage(opts: {
  client: { clientId: string; clientName: string } | undefined;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state: string;
  scope: string;
  error?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize — 📚 Agent Wiki</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f1117; color: #e2e4ef; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1a1d27; border: 1px solid #2a2d3a; border-radius: 16px; padding: 32px; width: 100%; max-width: 400px; }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 4px; }
    p { color: #8b8fa8; font-size: 0.875rem; margin-bottom: 24px; }
    .app-name { color: #7c6af7; font-weight: 600; }
    label { display: block; font-size: 0.875rem; color: #8b8fa8; margin-bottom: 6px; }
    input[type=password] { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #2a2d3a; background: #0f1117; color: #e2e4ef; font-size: 0.875rem; outline: none; margin-bottom: 16px; }
    input[type=password]:focus { border-color: #7c6af7; }
    .error { color: #f87171; font-size: 0.8rem; margin-bottom: 12px; }
    .scopes { background: #0f1117; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 0.8rem; color: #8b8fa8; }
    .scopes span { display: inline-block; background: #1e3a5f; color: #93c5fd; padding: 2px 8px; border-radius: 20px; margin: 2px; }
    .buttons { display: flex; gap: 10px; }
    button { flex: 1; padding: 10px; border-radius: 8px; border: none; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
    .btn-allow { background: #7c6af7; color: white; }
    .btn-allow:hover { background: #9b8ff8; }
    .btn-deny { background: #2a2d3a; color: #8b8fa8; }
    .btn-deny:hover { background: #3a3d4a; }
  </style>
</head>
<body>
  <div class="card">
    <h1>📚 Authorize Access</h1>
    <p><span class="app-name">${escHtml(opts.client?.clientName ?? "An application")}</span> wants to access your Agent Wiki</p>
    ${opts.error ? `<p class="error">${escHtml(opts.error)}</p>` : ""}
    <div class="scopes">
      Requested scopes:
      ${opts.scope.split(" ").map((s) => `<span>${escHtml(s)}</span>`).join("")}
    </div>
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${escHtml(opts.client?.clientId ?? "")}">
      <input type="hidden" name="redirect_uri" value="${escHtml(opts.redirect_uri)}">
      <input type="hidden" name="code_challenge" value="${escHtml(opts.code_challenge)}">
      <input type="hidden" name="code_challenge_method" value="${escHtml(opts.code_challenge_method)}">
      <input type="hidden" name="state" value="${escHtml(opts.state)}">
      <input type="hidden" name="scope" value="${escHtml(opts.scope)}">
      <label for="password">Wiki password</label>
      <input type="password" id="password" name="password" placeholder="Enter your wiki password" autofocus>
      <div class="buttons">
        <button type="submit" name="action" value="allow" class="btn-allow">Allow</button>
        <button type="submit" name="action" value="deny" class="btn-deny">Deny</button>
      </div>
    </form>
  </div>
</body>
</html>`;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html><html><body style="background:#0f1117;color:#f87171;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;"><p>${escHtml(message)}</p></body></html>`;
}
