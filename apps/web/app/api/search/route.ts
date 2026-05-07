import { NextRequest, NextResponse } from "next/server";
import { searchEntries, type WikiEntry, type WikiMeta } from "@/lib/wiki";
import { searchQuerySchema } from "@agent-wiki/wiki";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("q") ?? "";
  const parsed = searchQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = searchEntries(parsed.data);
    return NextResponse.json({
      results: results.map(({ content: _content, ...meta }: WikiEntry): WikiMeta => meta),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
