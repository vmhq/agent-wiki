"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Search, GitGraph, Terminal, SquarePen, Wrench } from "lucide-react";
import clsx from "clsx";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

const links = [
  { href: "/", label: "Wiki", icon: BookOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/graph", label: "Graph", icon: GitGraph },
  { href: "/maintenance", label: "Audit", icon: Wrench },
  { href: "/edit", label: "New", icon: SquarePen },
];

export function Navbar({
  commandPalette,
  mcpBaseUrl,
}: {
  commandPalette?: React.ReactNode;
  mcpBaseUrl?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--color-wiki-border)] bg-[color-mix(in_srgb,var(--color-wiki-bg)_88%,transparent)] backdrop-blur-md">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[var(--color-wiki-text)] transition-colors hover:opacity-80">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--color-wiki-text)] text-[10px] font-semibold text-[var(--color-wiki-bg)]">AW</span>
              Agent Wiki
            </Link>

            <div className="hidden sm:flex items-center gap-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    pathname === href
                      ? "bg-[var(--color-wiki-text)] text-[var(--color-wiki-bg)]"
                      : "text-[var(--color-wiki-muted)] hover:bg-[var(--color-wiki-subtle)] hover:text-[var(--color-wiki-text)]"
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {commandPalette}
            <ThemeSwitcher />
            {mcpBaseUrl && (
              <a
                href={mcpBaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[var(--color-wiki-muted)] transition-colors hover:bg-[var(--color-wiki-subtle)] hover:text-[var(--color-wiki-text)]"
              >
                <Terminal size={13} />
                MCP
              </a>
            )}
          </div>
        </div>
        <div className="-mx-4 flex gap-1 overflow-x-auto border-t border-[var(--color-wiki-border)] px-4 py-2 sm:hidden">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-[var(--color-wiki-text)] text-[var(--color-wiki-bg)]"
                  : "text-[var(--color-wiki-muted)] hover:bg-[var(--color-wiki-subtle)] hover:text-[var(--color-wiki-text)]"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
