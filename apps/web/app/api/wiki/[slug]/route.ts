import { NextRequest, NextResponse } from "next/server";
import { getEntry, updateEntry, patchEntry, deleteEntry } from "@/lib/wiki";
import { requireWriteAuth } from "@/lib/auth";

interface Ctx {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ entry });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const authError = requireWriteAuth(req);
  if (authError) return authError;
  const { slug } = await params;
  try {
    const body = await req.json();
    const { content, title, tags } = body as {
      content: string;
      title?: string;
      tags?: string[];
    };
    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    if (!getEntry(slug)) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    const entry = updateEntry(slug, content, { title, tags });
    return NextResponse.json({ entry });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const authError = requireWriteAuth(req);
  if (authError) return authError;
  const { slug } = await params;
  try {
    const body = await req.json();
    const { operation, content, search, replacement, anchor } = body as {
      operation: "append" | "prepend" | "replace" | "insert_after" | "insert_before";
      content?: string;
      search?: string;
      replacement?: string;
      anchor?: string;
    };
    if (!operation) {
      return NextResponse.json({ error: "operation is required" }, { status: 400 });
    }
    const entry = patchEntry(slug, operation, { content, search, replacement, anchor });
    return NextResponse.json({ entry });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("not found")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const authError = requireWriteAuth(req);
  if (authError) return authError;
  const { slug } = await params;
  try {
    deleteEntry(slug);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("not found")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
