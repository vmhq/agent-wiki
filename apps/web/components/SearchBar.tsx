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
        className="wiki-ring w-full rounded-lg bg-[var(--color-wiki-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-wiki-text)] placeholder-[var(--color-wiki-muted)] transition-shadow focus:shadow-[var(--shadow-wiki-focus)] focus:outline-none"
      />
    </form>
  );
}
