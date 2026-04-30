import { NextRequest, NextResponse } from "next/server";
import { createEntry, createEntrySchema, errorStatus, getPublicErrorMessage, listEntries } from "@/lib/wiki";
import { requireWriteAuth } from "@/lib/auth";

export async function GET() {
  try {
    const entries = listEntries();
    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = requireWriteAuth(req);
  if (authError) return authError;
  try {
    const { slug, title, content, tags } = createEntrySchema.parse(await req.json());
    const entry = createEntry(slug, title, content, tags);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: getPublicErrorMessage(err) }, { status: errorStatus(err) });
  }
}
