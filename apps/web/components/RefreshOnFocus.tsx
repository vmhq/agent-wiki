"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    const handleFocus = () => router.refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    // Refresh on mount as well
    router.refresh();

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);

  return null;
}
