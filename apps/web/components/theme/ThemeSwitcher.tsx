"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { ThemeChoice, useTheme } from "./ThemeProvider";

const options: Array<{ value: ThemeChoice; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
  { value: "system", label: "System theme", icon: Monitor },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="wiki-ring flex h-8 items-center gap-0.5 rounded-md bg-[var(--color-wiki-surface)] p-1">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={clsx(
            "grid h-6 w-6 place-items-center rounded-[4px] transition-colors",
            theme === value
              ? "bg-[var(--color-wiki-text)] text-[var(--color-wiki-bg)]"
              : "text-[var(--color-wiki-muted)] hover:bg-[var(--color-wiki-subtle)] hover:text-[var(--color-wiki-text)]"
          )}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}
