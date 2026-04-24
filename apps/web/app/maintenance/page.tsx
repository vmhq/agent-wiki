import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CircleDashed, Clock3, FilePlus, Tags } from "lucide-react";
import { getMaintenanceReport } from "@/lib/wiki";

export const dynamic = "force-dynamic";

function Panel({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="wiki-card rounded-xl bg-[var(--color-wiki-surface)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-wiki-border)] px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-wiki-text)]">
          {icon}
          {title}
        </h2>
        <span className="rounded-full bg-[var(--color-wiki-bg)] px-2 py-0.5 text-xs text-[var(--color-wiki-muted)]">{count}</span>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

export default function MaintenancePage() {
  const report = getMaintenanceReport();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--color-wiki-text)] mb-2">Maintenance</h1>
        <p className="text-sm text-[var(--color-wiki-muted)]">
          {report.missing.length} missing links · {report.orphans.length} orphans · {report.stale.length} stale · {report.untagged.length} untagged
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Missing Pages" count={report.missing.length} icon={<AlertTriangle size={15} className="text-[#fbbf24]" />}>
          {report.missing.length === 0 ? (
            <p className="px-1 py-2 text-sm text-[var(--color-wiki-muted)]">No missing links.</p>
          ) : (
            <div className="space-y-2">
              {report.missing.map((item) => (
                <div key={item.slug} className="rounded-lg bg-[var(--color-wiki-subtle)] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--color-wiki-text)]">[[{item.slug}]]</p>
                    <Link
                      href={`/edit/${item.slug}`}
                      className="wiki-ring inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-wiki-muted)] hover:text-[var(--color-wiki-text)]"
                    >
                      <FilePlus size={12} />
                      Create
                    </Link>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-wiki-muted)]">
                    Referenced by {item.sources.map((source) => source.title).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Orphans" count={report.orphans.length} icon={<CircleDashed size={15} className="text-[var(--color-wiki-muted)]" />}>
          <div className="space-y-2">
            {report.orphans.map((entry) => (
              <Link key={entry.slug} href={`/wiki/${entry.slug}`} className="block rounded-lg bg-[var(--color-wiki-subtle)] px-3 py-2 hover:opacity-80">
                <p className="text-sm font-medium text-[var(--color-wiki-text)]">{entry.title}</p>
                <p className="text-xs text-[var(--color-wiki-muted)]">/{entry.slug}</p>
              </Link>
            ))}
            {report.orphans.length === 0 && <p className="px-1 py-2 text-sm text-[var(--color-wiki-muted)]">No orphan entries.</p>}
          </div>
        </Panel>

        <Panel title="Stale" count={report.stale.length} icon={<Clock3 size={15} className="text-[var(--color-wiki-muted)]" />}>
          <div className="space-y-2">
            {report.stale.map((entry) => (
              <Link key={entry.slug} href={`/edit/${entry.slug}`} className="block rounded-lg bg-[var(--color-wiki-subtle)] px-3 py-2 hover:opacity-80">
                <p className="text-sm font-medium text-[var(--color-wiki-text)]">{entry.title}</p>
                <p className="text-xs text-[var(--color-wiki-muted)]">
                  Updated {formatDistanceToNow(new Date(entry.updated), { addSuffix: true })}
                </p>
              </Link>
            ))}
            {report.stale.length === 0 && <p className="px-1 py-2 text-sm text-[var(--color-wiki-muted)]">No stale entries.</p>}
          </div>
        </Panel>

        <Panel title="Untagged" count={report.untagged.length} icon={<Tags size={15} className="text-[var(--color-wiki-muted)]" />}>
          <div className="space-y-2">
            {report.untagged.map((entry) => (
              <Link key={entry.slug} href={`/edit/${entry.slug}`} className="block rounded-lg bg-[var(--color-wiki-subtle)] px-3 py-2 hover:opacity-80">
                <p className="text-sm font-medium text-[var(--color-wiki-text)]">{entry.title}</p>
                <p className="text-xs text-[var(--color-wiki-muted)]">/{entry.slug}</p>
              </Link>
            ))}
            {report.untagged.length === 0 && <p className="px-1 py-2 text-sm text-[var(--color-wiki-muted)]">All entries have tags.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
