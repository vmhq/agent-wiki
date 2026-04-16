"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
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
        placeholder="Search wiki entries..."
        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-wiki-surface)] border border-[var(--color-wiki-border)] text-[var(--color-wiki-text)] placeholder-[var(--color-wiki-muted)] text-sm focus:outline-none focus:border-[var(--color-wiki-accent)] transition-colors"
      />
    </form>
  );
}
