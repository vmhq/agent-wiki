import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import { createWikiStore, WikiError } from "./index.js";

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-wiki-"));
  return { dir, store: createWikiStore(dir) };
}

test("validates slugs at the filesystem boundary", () => {
  const { store } = tempStore();
  assert.throws(() => store.getEntry("../secret"), WikiError);
  assert.throws(() => store.createEntry("Bad Slug", "Bad", "content"), /slug must/);
});

test("creates, updates, searches, and records history", () => {
  const { dir, store } = tempStore();
  store.createEntry("alpha", "Alpha", "Hello [[beta]]", ["notes", "notes"]);
  assert.equal(store.listEntries().length, 1);
  assert.equal(store.searchEntries("hello")[0]?.slug, "alpha");
  store.updateEntry("alpha", "Updated [[missing-page]]");
  assert.equal(store.getEntry("alpha")?.content.trim(), "Updated [[missing-page]]");
  assert.equal(store.listHistory("alpha").length, 1);
  assert.equal(fs.existsSync(path.join(dir, ".history", "alpha")), true);
});

test("builds graph data with missing nodes and backlinks", () => {
  const { store } = tempStore();
  store.createEntry("alpha", "Alpha", "See [[beta]] and [[ghost]]");
  store.createEntry("beta", "Beta", "Back");
  const graph = store.getGraphData();
  assert.equal(graph.nodes.some((node) => node.id === "ghost" && node.missing), true);
  assert.deepEqual(store.getBacklinks("beta").map((link) => link.slug), ["alpha"]);
  const report = store.getMaintenanceReport();
  assert.deepEqual(report.missing.map((item) => item.slug), ["ghost"]);
  assert.deepEqual(report.orphans.map((item) => item.slug), ["alpha"]);
});

test("patch operations fail when anchors are missing", () => {
  const { store } = tempStore();
  store.createEntry("alpha", "Alpha", "Hello");
  assert.throws(() => store.patchEntry("alpha", "insert_after", { anchor: "Nope", content: "x" }), /anchor text/);
});
