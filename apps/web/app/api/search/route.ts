import { NextRequest, NextResponse } from "next/server";
import { searchEntries } from "@/lib/wiki";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }
  const results = searchEntries(q.trim());
  return NextResponse.json({ results: results.map(({ content: _, ...meta }) => meta) });
}
