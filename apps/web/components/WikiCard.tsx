import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Clock, Tag } from "lucide-react";
import type { WikiMeta } from "@/lib/wiki";

interface Props {
  entry: WikiMeta;
}

export function WikiCard({ entry }: Props) {
  return (
    <Link
      href={`/wiki/${entry.slug}`}
      className="group block p-5 rounded-xl border border-[var(--color-wiki-border)] bg-[var(--color-wiki-surface)] hover:border-[var(--color-wiki-accent)]/50 hover:bg-[var(--color-wiki-surface)]/80 transition-all duration-200"
    >
      <h2 className="text-base font-semibold text-white group-hover:text-[var(--color-wiki-accent)] transition-colors mb-2 line-clamp-2">
        {entry.title}
      </h2>

      {entry.excerpt && (
        <p className="text-sm text-[var(--color-wiki-muted)] line-clamp-3 mb-3 leading-relaxed">
          {entry.excerpt}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto">
        {entry.tags.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag size={11} className="text-[var(--color-wiki-muted)]" />
            {entry.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--color-wiki-tag)] text-[var(--color-wiki-tag-text)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <span />
        )}

        <span className="flex items-center gap-1 text-[11px] text-[var(--color-wiki-muted)] whitespace-nowrap shrink-0">
          <Clock size={11} />
          {formatDistanceToNow(new Date(entry.updated), { addSuffix: true })}
        </span>
      </div>
    </Link>
  );
}
