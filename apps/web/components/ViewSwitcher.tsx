"use client";

import { useState } from "react";
import { LayoutGrid, List, Clock, Tag } from "lucide-react";
import Link from "next/link";
import type { WikiMeta } from "@/lib/wiki";
import { formatRelativeDate } from "@/lib/utils";
import { WikiCard } from "./WikiCard";

interface Props {
  entries: WikiMeta[];
}

function WikiListItem({ entry }: { entry: WikiMeta }) {
  return (
    <Link
      href={`/wiki/${entry.slug}`}
      className="wiki-card wiki-card-hover group flex items-center gap-4 rounded-lg bg-[var(--color-wiki-surface)] px-4 py-3"
    >
      <div className="flex-1 min-w-0">
        <h2 className="truncate text-sm font-semibold text-[var(--color-wiki-text)] transition-colors">
          {entry.title}
        </h2>
        {entry.excerpt && (
          <p className="text-xs text-[var(--color-wiki-muted)] truncate mt-0.5 leading-relaxed">
            {entry.excerpt.slice(0, 140)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {entry.tags.length > 0 && (
          <div className="hidden sm:flex items-center gap-1">
            <Tag size={10} className="text-[var(--color-wiki-muted)]" />
            {entry.tags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--color-wiki-tag)] text-[var(--color-wiki-tag-text)]"
              >
                {tag}
              </span>
            ))}
            {entry.tags.length > 2 && (
              <span className="text-[10px] text-[var(--color-wiki-muted)]">+{entry.tags.length - 2}</span>
            )}
          </div>
        )}
        <span className="flex items-center gap-1 text-[11px] text-[var(--color-wiki-muted)] whitespace-nowrap">
          <Clock size={10} />
          {formatRelativeDate(entry.updated)}
        </span>
      </div>
    </Link>
  );
}

export function ViewSwitcher({ entries }: Props) {
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="wiki-ring flex gap-0.5 rounded-lg bg-[var(--color-wiki-surface)] p-1">
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded-md transition-colors ${
              view === "grid"
                ? "bg-[var(--color-wiki-text)] text-[var(--color-wiki-bg)]"
                : "text-[var(--color-wiki-muted)] hover:text-[var(--color-wiki-text)]"
            }`}
            title="Grid view"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded-md transition-colors ${
              view === "list"
                ? "bg-[var(--color-wiki-text)] text-[var(--color-wiki-bg)]"
                : "text-[var(--color-wiki-muted)] hover:text-[var(--color-wiki-text)]"
            }`}
            title="List view"
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <WikiCard key={entry.slug} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <WikiListItem key={entry.slug} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
