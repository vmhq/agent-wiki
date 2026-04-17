import { NextRequest, NextResponse } from "next/server";
import { listEntries, createEntry } from "@/lib/wiki";
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
    const body = await req.json();
    const { slug, title, content, tags } = body as {
      slug: string;
      title: string;
      content: string;
      tags?: string[];
    };
    if (!slug || !title || !content) {
      return NextResponse.json({ error: "slug, title, and content are required" }, { status: 400 });
    }
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json({ error: "slug must only contain lowercase letters, numbers, and hyphens" }, { status: 400 });
    }
    const entry = createEntry(slug, title, content, tags);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("already exists")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
