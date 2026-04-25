"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useState } from "react";

interface Props {
  defaultValue?: string;
}

export function SearchBar({ defaultValue = "" }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    } else {
      router.push("/search");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-wiki-muted)] pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search"
        className="wiki-ring w-full rounded-lg bg-[var(--color-wiki-surface)] py-2.5 pl-10 pr-10 text-sm text-[var(--color-wiki-text)] placeholder-[var(--color-wiki-muted)] transition-shadow focus:shadow-[var(--shadow-wiki-focus)] focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => { setValue(""); router.push("/search"); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-wiki-muted)] hover:text-[var(--color-wiki-text)]"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </form>
  );
}
