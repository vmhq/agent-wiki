"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import Link from "next/link";
import type { Components } from "react-markdown";
import "highlight.js/styles/github-dark.css";

interface Props {
  content: string;
}

// Convert [[wikilinks]] to markdown links before parsing
function preprocessWikilinks(content: string): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const [slug, label] = inner.split("|").map((s: string) => s.trim());
    const href = `/wiki/${slug.toLowerCase().replace(/\s+/g, "-")}`;
    return `[${label ?? slug}](${href})`;
  });
}

const components: Components = {
  a: ({ href, children, ...props }) => {
    if (href?.startsWith("/wiki/") || href?.startsWith("/")) {
      return (
        <Link href={href} className="text-[var(--color-wiki-link)] hover:underline" {...props}>
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

export function MarkdownRenderer({ content }: Props) {
  const processed = preprocessWikilinks(content);

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
