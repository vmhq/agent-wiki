import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock, Tags } from "lucide-react";
import { getMaintenanceReport, listEntries } from "@/lib/wiki";

export function AppSidebar() {
  const entries = listEntries().sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
  const recent = entries.slice(0, 6);
  const tags = Array.from(new Set(entries.flatMap((entry) => entry.tags))).sort().slice(0, 16);
  const maintenance = getMaintenanceReport();
  const issueCount = maintenance.missing.length + maintenance.orphans.length + maintenance.stale.length + maintenance.untagged.length;

  return (
    <aside className="hidden xl:block w-72 shrink-0 border-r border-[var(--color-wiki-border)] bg-[var(--color-wiki-bg)]/80">
      <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-5 py-6">
        <section className="mb-7">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-wiki-muted)]">
            <Clock size={13} />
            Recent
          </div>
          <div className="space-y-1">
            {recent.map((entry) => (
              <Link
                key={entry.slug}
                href={`/wiki/${entry.slug}`}
                className="block rounded-lg px-2 py-2 hover:bg-[var(--color-wiki-subtle)]"
              >
                <p className="truncate text-sm font-medium text-[var(--color-wiki-text)]">{entry.title}</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-wiki-muted)]">
                  {formatDistanceToNow(new Date(entry.updated), { addSuffix: true })}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {tags.length > 0 && (
          <section className="mb-7">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-wiki-muted)]">
              <Tags size={13} />
              Tags
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-[var(--color-wiki-tag)] px-2 py-1 text-[11px] text-[var(--color-wiki-tag-text)] hover:opacity-80"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <Link
            href="/maintenance"
            className="wiki-card wiki-card-hover flex items-center justify-between gap-3 rounded-lg bg-[var(--color-wiki-surface)] px-3 py-2.5"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-wiki-text)]">
              <AlertTriangle size={15} />
              Maintenance
            </span>
            <span className="rounded-full bg-[var(--color-wiki-tag)] px-2 py-0.5 text-[11px] text-[var(--color-wiki-tag-text)]">{issueCount}</span>
          </Link>
        </section>
      </div>
    </aside>
  );
}
