import { NextRequest, NextResponse } from "next/server";
import { searchEntries, type WikiEntry, type WikiMeta } from "@/lib/wiki";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = searchEntries(q.trim());
    return NextResponse.json({
      results: results.map(({ content: _content, ...meta }: WikiEntry): WikiMeta => meta),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
