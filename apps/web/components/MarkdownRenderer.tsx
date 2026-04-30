"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import Link from "next/link";
import type { Components } from "react-markdown";
import "highlight.js/styles/github.css";

interface Props {
  content: string;
  existingSlugs?: string[];
}

// Convert [[wikilinks]] to markdown links before parsing
function preprocessWikilinks(content: string, existingSlugs?: Set<string>): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const [slug, label] = inner.split("|").map((s: string) => s.trim());
    const href = `/wiki/${slug.toLowerCase().replace(/\s+/g, "-")}`;
    const normalizedSlug = href.replace("/wiki/", "");
    const target = existingSlugs && !existingSlugs.has(normalizedSlug) ? `/edit/${normalizedSlug}` : href;
    return `[${label ?? slug}](${target})`;
  });
}

const components: Components = {
  a: ({ href, children, ...props }) => {
    if (href?.startsWith("/wiki/") || href?.startsWith("/") || href?.startsWith("#")) {
      const isMissingWikilink = href.startsWith("/edit/");
      return (
        <Link
          href={href}
          className={
            isMissingWikilink
              ? "rounded border border-dashed border-[#fbbf24]/50 px-1 text-[#fbbf24] no-underline hover:bg-[#fbbf24]/10"
              : "text-[var(--color-wiki-link)] hover:underline"
          }
          {...props}
        >
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--color-wiki-link)] hover:underline" {...props}>
        {children}
      </a>
    );
  },
};

export function MarkdownRenderer({ content, existingSlugs }: Props) {
  const processed = preprocessWikilinks(content, existingSlugs ? new Set(existingSlugs) : undefined);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight, rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]]}
      components={components}
    >
      {processed}
    </ReactMarkdown>
  );
}
