import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WikiEditor } from "@/components/editor/WikiEditor";
import { getEntry, listEntries, type WikiMeta } from "@/lib/wiki";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export default async function EditPage({ params }: Props) {
  const { slug: slugParts } = await params;
  const slug = slugParts?.[0];
  const entry = slug ? getEntry(slug) : undefined;
  const existingSlugs = listEntries().map((item: WikiMeta) => item.slug);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href={entry ? `/wiki/${entry.slug}` : "/"}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-wiki-muted)] hover:text-[var(--color-wiki-text)] transition-colors"
        >
          <ArrowLeft size={14} />
          {entry ? "Back to entry" : "Back to index"}
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[var(--color-wiki-text)] mb-2">{entry ? "Edit Entry" : "New Entry"}</h1>
      </div>

      <WikiEditor entry={entry ?? undefined} initialSlug={slug ?? ""} existingSlugs={existingSlugs} />
    </div>
  );
}
