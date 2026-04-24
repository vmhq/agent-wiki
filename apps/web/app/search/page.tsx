import { searchEntries, listEntries } from "@/lib/wiki";
import { WikiCard } from "@/components/WikiCard";
import { SearchBar } from "@/components/SearchBar";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? searchEntries(query) : listEntries().map(e => ({ ...e, content: "" }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--color-wiki-text)] mb-4">
          {query ? `Search results for "${query}"` : "Browse all entries"}
        </h1>
        <SearchBar defaultValue={query} />
      </div>

      <div className="mb-4 text-sm text-[var(--color-wiki-muted)]">
        {results.length} {results.length === 1 ? "result" : "results"}
        {query && ` for "${query}"`}
      </div>

      {results.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-wiki-muted)]">
          <Search size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No entries match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((entry) => (
            <WikiCard key={entry.slug} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
