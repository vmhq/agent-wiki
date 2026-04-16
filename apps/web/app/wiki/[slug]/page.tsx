import { getEntry, listEntries } from "@/lib/wiki";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Clock, Tag, ArrowLeft, Edit } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return listEntries().map((e) => ({ slug: e.slug }));
}

export default async function WikiPage({ params }: Props) {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) notFound();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-wiki-muted)] hover:text-[var(--color-wiki-text)] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to index
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 pb-6 border-b border-[var(--color-wiki-border)]">
        <h1 className="text-4xl font-bold text-white mb-4">{entry.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-wiki-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} />
            Updated {formatDistanceToNow(new Date(entry.updated), { addSuffix: true })}
          </span>

          {entry.tags.length > 0 && (
            <div className="inline-flex items-center gap-2">
              <Tag size={14} />
              <div className="flex gap-1.5">
                {entry.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-wiki-tag)] text-[var(--color-wiki-tag-text)] hover:opacity-80 transition-opacity"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <article className="prose">
        <MarkdownRenderer content={entry.content} />
      </article>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-[var(--color-wiki-border)] text-xs text-[var(--color-wiki-muted)] flex justify-between items-center">
        <span>
          Created {formatDistanceToNow(new Date(entry.created), { addSuffix: true })}
        </span>
        <span className="flex items-center gap-1.5">
          <Edit size={12} />
          <code className="text-xs">/wiki/{slug}</code>
        </span>
      </div>
    </div>
  );
}
