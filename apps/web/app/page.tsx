import { listEntries } from "@/lib/wiki";
import { SearchBar } from "@/components/SearchBar";
import { TagCloud } from "@/components/TagCloud";
import { ViewSwitcher } from "@/components/ViewSwitcher";

export const dynamic = "force-dynamic";

export default function IndexPage() {
  const entries = listEntries().sort(
    (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
  );

  const allTags = Array.from(new Set(entries.flatMap((e) => e.tags))).sort();

  return (
    <div>
      <div className="mb-8 border-b border-[var(--color-wiki-border)] pb-8">
        <p className="mb-3 font-mono text-xs font-medium uppercase text-[var(--color-wiki-muted)]">Knowledge base</p>
        <h1 className="mb-3 text-5xl font-semibold leading-none text-[var(--color-wiki-text)]">Agent Wiki</h1>
        <p className="text-[var(--color-wiki-muted)] text-sm">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} · AI-maintained knowledge base
        </p>
      </div>

      <div className="mb-8">
        <SearchBar />
      </div>

      {allTags.length > 0 && (
        <div className="mb-8">
          <TagCloud tags={allTags} />
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-wiki-muted)]">
          <p className="text-lg mb-2">No entries yet.</p>
          <p className="text-sm">Use the MCP server or API to create your first wiki entry.</p>
        </div>
      ) : (
        <ViewSwitcher entries={entries} />
      )}
    </div>
  );
}
