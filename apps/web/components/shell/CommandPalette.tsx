"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FilePlus, GitGraph, Search, Wrench, X } from "lucide-react";
import type { WikiMeta } from "@/lib/wiki";

interface Props {
  entries: WikiMeta[];
}

const staticActions = [
  { href: "/edit", label: "New entry", icon: FilePlus },
  { href: "/search", label: "Search", icon: Search },
  { href: "/graph", label: "Graph", icon: GitGraph },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
];

export function CommandPalette({ entries }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, 8);
    return entries
      .filter((entry) =>
        entry.title.toLowerCase().includes(q) ||
        entry.slug.includes(q) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [entries, query]);

  const palette = (
    <div className="fixed inset-0 z-[80] bg-black/55 px-4 pt-24 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div
        className="wiki-card mx-auto max-w-2xl overflow-hidden rounded-xl bg-[var(--color-wiki-bg)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--color-wiki-border)] px-4 py-3">
          <Search size={17} className="text-[var(--color-wiki-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            className="h-8 flex-1 bg-transparent text-sm text-[var(--color-wiki-text)] outline-none"
          />
          <button type="button" onClick={() => setOpen(false)} className="text-[var(--color-wiki-muted)] hover:text-[var(--color-wiki-text)]">
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query && (
            <div className="mb-2 grid grid-cols-2 gap-1">
              {staticActions.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-wiki-text)] hover:bg-[var(--color-wiki-subtle)]"
                >
                  <Icon size={15} className="text-[var(--color-wiki-muted)]" />
                  {label}
                </Link>
              ))}
            </div>
          )}

          <div className="space-y-1">
            {results.map((entry) => (
              <Link
                key={entry.slug}
                href={`/wiki/${entry.slug}`}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 hover:bg-[var(--color-wiki-subtle)]"
              >
                <p className="text-sm font-medium text-[var(--color-wiki-text)]">{entry.title}</p>
                <p className="text-xs text-[var(--color-wiki-muted)]">/{entry.slug}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="wiki-ring hidden h-8 min-w-44 items-center justify-between gap-3 rounded-md bg-[var(--color-wiki-surface)] px-2.5 text-xs text-[var(--color-wiki-muted)] hover:text-[var(--color-wiki-text)] md:flex"
      >
        <span className="flex items-center gap-2">
          <Search size={13} />
          Go to...
        </span>
        <kbd className="wiki-ring rounded px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      {open && createPortal(palette, document.body)}
    </>
  );
}
