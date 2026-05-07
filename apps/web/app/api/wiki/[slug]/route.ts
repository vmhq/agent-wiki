import { NextRequest, NextResponse } from "next/server";
import {
  deleteEntry,
  errorStatus,
  getEntry,
  getPublicErrorMessage,
  patchEntry,
  patchEntrySchema,
  updateEntry,
  updateEntrySchema,
} from "@/lib/wiki";
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
    const { content, title, tags } = updateEntrySchema.parse(await req.json());
    const entry = updateEntry(slug, content, { title, tags });
    return NextResponse.json({ entry });
  } catch (err) {
    return NextResponse.json({ error: getPublicErrorMessage(err) }, { status: errorStatus(err) });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const authError = requireWriteAuth(req);
  if (authError) return authError;
  const { slug } = await params;
  try {
    const { operation, content, search, replacement, anchor } = patchEntrySchema.parse(await req.json());
    const entry = patchEntry(slug, operation, { content, search, replacement, anchor });
    return NextResponse.json({ entry });
  } catch (err) {
    return NextResponse.json({ error: getPublicErrorMessage(err) }, { status: errorStatus(err) });
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
    return NextResponse.json({ error: getPublicErrorMessage(err) }, { status: errorStatus(err) });
  }
}
