import { listEntries } from "@/lib/wiki";
import { WikiCard } from "@/components/WikiCard";
import { SearchBar } from "@/components/SearchBar";

export const dynamic = "force-dynamic";

export default function IndexPage() {
  const entries = listEntries().sort(
    (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
  );

  const allTags = Array.from(new Set(entries.flatMap((e) => e.tags))).sort();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Agent Wiki
        </h1>
        <p className="text-[var(--color-wiki-muted)] text-sm">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} · AI-maintained knowledge base
        </p>
      </div>

      <div className="mb-8">
        <SearchBar />
      </div>

      {allTags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <a
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-wiki-tag)] text-[var(--color-wiki-tag-text)] hover:opacity-80 transition-opacity"
            >
              #{tag}
            </a>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-wiki-muted)]">
          <p className="text-lg mb-2">No entries yet.</p>
          <p className="text-sm">Use the MCP server or API to create your first wiki entry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <WikiCard key={entry.slug} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
