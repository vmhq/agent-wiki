import Link from "next/link";
import { Clock, Tag } from "lucide-react";
import type { WikiMeta } from "@/lib/wiki";
import { formatRelativeDate } from "@/lib/utils";

interface Props {
  entry: WikiMeta;
}

export function WikiCard({ entry }: Props) {
  return (
    <Link
      href={`/wiki/${entry.slug}`}
      className="wiki-card wiki-card-hover group block rounded-lg bg-[var(--color-wiki-surface)] p-5"
    >
      <h2 className="mb-2 line-clamp-2 text-base font-semibold text-[var(--color-wiki-text)] transition-colors">
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
          {formatRelativeDate(entry.updated)}
        </span>
      </div>
    </Link>
  );
}
