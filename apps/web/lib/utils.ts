import { formatDistanceToNow } from "date-fns";
import type { WikiMeta } from "@/lib/wiki";

export function computeTagFrequency(entries: WikiMeta[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

export function getTagsByFrequency(entries: WikiMeta[], limit?: number): string[] {
  const counts = computeTagFrequency(entries);
  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
  return limit ? sorted.slice(0, limit) : sorted;
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}
