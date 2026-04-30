/**
 * Lightweight API key auth for Next.js write routes.
 * Reads WIKI_API_KEY from the environment and validates the Bearer token.
 */
import { NextRequest, NextResponse } from "next/server";

/**
 * Returns null if the request is authorized, or a 401/403 NextResponse if not.
 * Usage:
 *   const authError = requireWriteAuth(req);
 *   if (authError) return authError;
 */
export function requireWriteAuth(req: NextRequest): NextResponse | null {
  const apiKey = process.env.WIKI_API_KEY ?? "";

  // Local development can run without an API key. Production never should.
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "server_misconfigured", error_description: "WIKI_API_KEY is required for write operations" },
        { status: 503 }
      );
    }
    return null;
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "unauthorized", error_description: "Bearer token required" },
      { status: 401 }
    );
  }
  const token = authHeader.slice(7);
  if (token !== apiKey) {
    return NextResponse.json(
      { error: "forbidden", error_description: "Invalid API key" },
      { status: 403 }
    );
  }
  return null;
}
