"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  tags: string[];
  maxVisible?: number;
}

export function TagCloud({ tags, maxVisible = 32 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tags : tags.slice(0, maxVisible);
  const hasMore = tags.length > maxVisible;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {visible.map((tag) => (
          <a
            key={tag}
            href={`/search?q=${encodeURIComponent(tag)}`}
            className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-wiki-tag)] text-[var(--color-wiki-tag-text)] hover:opacity-80 transition-opacity"
          >
            #{tag}
          </a>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-[var(--color-wiki-muted)] hover:text-[var(--color-wiki-accent)] transition-colors mt-1"
        >
          {expanded ? (
            <><ChevronUp size={12} /> Show less</>
          ) : (
            <><ChevronDown size={12} /> +{tags.length - maxVisible} more tags</>
          )}
        </button>
      )}
    </div>
  );
}
