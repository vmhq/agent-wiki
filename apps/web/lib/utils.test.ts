import { test, expect } from "bun:test";
import { computeTagFrequency, getTagsByFrequency, formatRelativeDate } from "./utils";

test("computeTagFrequency counts tags correctly", () => {
  const entries = [
    { slug: "a", title: "A", tags: ["foo", "bar"], created: "", updated: "", excerpt: "" },
    { slug: "b", title: "B", tags: ["foo"], created: "", updated: "", excerpt: "" },
  ];

  const freq = computeTagFrequency(entries);
  expect(freq.get("foo")).toBe(2);
  expect(freq.get("bar")).toBe(1);
});

test("getTagsByFrequency returns tags sorted by frequency", () => {
  const entries = [
    { slug: "a", title: "A", tags: ["foo", "bar"], created: "", updated: "", excerpt: "" },
    { slug: "b", title: "B", tags: ["foo"], created: "", updated: "", excerpt: "" },
  ];

  const tags = getTagsByFrequency(entries);
  expect(tags[0]).toBe("foo");
  expect(tags[1]).toBe("bar");
});

test("getTagsByFrequency respects limit", () => {
  const entries = [
    { slug: "a", title: "A", tags: ["foo", "bar", "baz"], created: "", updated: "", excerpt: "" },
  ];

  const tags = getTagsByFrequency(entries, 2);
  expect(tags).toHaveLength(2);
});

test("formatRelativeDate formats dates", () => {
  const date = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago
  const result = formatRelativeDate(date);
  expect(result).toContain("hour");
});
