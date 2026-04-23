"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Search, GitGraph, Terminal, SquarePen } from "lucide-react";
import clsx from "clsx";

const MCP_PORT = process.env.NEXT_PUBLIC_MCP_PORT ?? "3001";

const links = [
  { href: "/", label: "Wiki", icon: BookOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/graph", label: "Graph", icon: GitGraph },
  { href: "/edit", label: "New", icon: SquarePen },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--color-wiki-border)] bg-[var(--color-wiki-bg)]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-white hover:text-[var(--color-wiki-accent)] transition-colors">
              <span className="text-lg leading-none">📚</span>
              Agent Wiki
            </Link>

            <div className="hidden sm:flex items-center gap-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === href
                      ? "bg-[var(--color-wiki-surface)] text-white"
                      : "text-[var(--color-wiki-muted)] hover:text-[var(--color-wiki-text)] hover:bg-[var(--color-wiki-surface)]"
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`http://localhost:${MCP_PORT}/health`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-wiki-muted)] hover:text-[var(--color-wiki-text)] hover:bg-[var(--color-wiki-surface)] transition-colors"
            >
              <Terminal size={13} />
              MCP
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
