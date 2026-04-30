"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const distanceFromBottom = scrollable - window.scrollY;

      setVisible(scrollable > 900 && distanceFromBottom < 700);
    }

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`wiki-ring fixed bottom-5 right-5 z-40 grid h-10 w-10 place-items-center rounded-md bg-[var(--color-wiki-surface)] text-[var(--color-wiki-text)] transition duration-150 hover:bg-[var(--color-wiki-subtle)] sm:bottom-6 sm:right-6 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <ArrowUp size={18} />
    </button>
  );
}
