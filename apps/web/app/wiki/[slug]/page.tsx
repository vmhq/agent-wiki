import { getBacklinks, getEntry, listEntries } from "@/lib/wiki";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Tag, ArrowLeft, Edit } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function WikiPage({ params }: Props) {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) notFound();
  const backlinks = getBacklinks(slug);
  const existingSlugs = listEntries().map((item) => item.slug);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-wiki-muted)] hover:text-[var(--color-wiki-text)] transition-colors"
          >
            <ArrowLeft size={14} />
            Back to index
          </Link>
          <Link
            href={`/edit/${slug}`}
            className="wiki-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--color-wiki-muted)] transition-colors hover:text-[var(--color-wiki-text)]"
          >
            <Edit size={14} />
            Edit
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8 pb-6 border-b border-[var(--color-wiki-border)]">
        <h1 className="text-4xl font-semibold text-[var(--color-wiki-text)] mb-4">{entry.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-wiki-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} />
            Updated {formatRelativeDate(entry.updated)}
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
        <MarkdownRenderer content={entry.content} existingSlugs={existingSlugs} />
      </article>

      {backlinks.length > 0 && (
        <section className="mt-12 pt-6 border-t border-[var(--color-wiki-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-wiki-text)] mb-3">Backlinks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {backlinks.map((link) => (
              <Link
                key={link.slug}
                href={`/wiki/${link.slug}`}
                className="wiki-card wiki-card-hover block rounded-lg bg-[var(--color-wiki-surface)] px-4 py-3"
              >
                <p className="text-sm font-medium text-[var(--color-wiki-text)]">{link.title}</p>
                {link.excerpt && (
                  <p className="mt-1 text-xs leading-5 text-[var(--color-wiki-muted)] line-clamp-2">{link.excerpt}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-[var(--color-wiki-border)] text-xs text-[var(--color-wiki-muted)] flex justify-between items-center">
        <span>
          Created {formatRelativeDate(entry.created)}
        </span>
        <span className="flex items-center gap-1.5">
          <Edit size={12} />
          <code className="text-xs">/wiki/{slug}</code>
        </span>
      </div>
    </div>
  );
}
