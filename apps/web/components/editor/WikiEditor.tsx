"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileText, KeyRound, Save, Trash2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { WikiEntry } from "@/lib/wiki";

interface Props {
  entry?: WikiEntry;
}

function splitTags(value: string): string[] {
  return Array.from(new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean)));
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getStoredKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("agent-wiki-api-key") ?? "";
}

export function WikiEditor({ entry }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [slug, setSlug] = useState(entry?.slug ?? "");
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [content, setContent] = useState(entry?.content ?? "# Untitled\n\nStart writing...");
  const [apiKey, setApiKey] = useState(getStoredKey);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const isExisting = Boolean(entry);
  const canSave = title.trim() && slug.trim() && content.trim();
  const normalizedSlug = useMemo(() => slugify(slug || title), [slug, title]);

  async function request(path: string, init: RequestInit) {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (apiKey.trim()) headers.set("Authorization", `Bearer ${apiKey.trim()}`);
    const res = await fetch(path, { ...init, headers });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? `Request failed with ${res.status}`);
    return body;
  }

  async function save() {
    if (!canSave) return;
    setIsSaving(true);
    setStatus("");
    try {
      if (apiKey.trim()) window.localStorage.setItem("agent-wiki-api-key", apiKey.trim());
      const nextSlug = normalizedSlug;
      const body = JSON.stringify({ slug: nextSlug, title: title.trim(), content, tags: splitTags(tags) });
      if (isExisting) {
        await request(`/api/wiki/${entry!.slug}`, {
          method: "PUT",
          body: JSON.stringify({ title: title.trim(), content, tags: splitTags(tags) }),
        });
      } else {
        await request("/api/wiki", { method: "POST", body });
      }
      router.push(`/wiki/${nextSlug}`);
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    if (!entry) return;
    if (!window.confirm(`Delete '${entry.slug}'? A history snapshot will be kept.`)) return;
    setIsSaving(true);
    setStatus("");
    try {
      if (apiKey.trim()) window.localStorage.setItem("agent-wiki-api-key", apiKey.trim());
      await request(`/api/wiki/${entry.slug}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
        <label className="block">
          <span className="block text-xs font-medium text-[var(--color-wiki-muted)] mb-1.5">Title</span>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!isExisting) setSlug(slugify(event.target.value));
            }}
            className="w-full rounded-lg bg-[var(--color-wiki-surface)] border border-[var(--color-wiki-border)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-wiki-accent)]"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-[var(--color-wiki-muted)] mb-1.5">Slug</span>
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            disabled={isExisting}
            className="w-full rounded-lg bg-[var(--color-wiki-surface)] border border-[var(--color-wiki-border)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-wiki-accent)] disabled:opacity-70"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3">
        <label className="block">
          <span className="block text-xs font-medium text-[var(--color-wiki-muted)] mb-1.5">Tags</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="mcp, notes, research"
            className="w-full rounded-lg bg-[var(--color-wiki-surface)] border border-[var(--color-wiki-border)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-wiki-accent)]"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-[var(--color-wiki-muted)] mb-1.5">API key</span>
          <div className="relative">
            <KeyRound size={14} className="absolute left-3 top-2.5 text-[var(--color-wiki-muted)]" />
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              type="password"
              className="w-full rounded-lg bg-[var(--color-wiki-surface)] border border-[var(--color-wiki-border)] pl-8 pr-3 py-2 text-sm text-white outline-none focus:border-[var(--color-wiki-accent)]"
            />
          </div>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-0.5 p-1 rounded-lg bg-[var(--color-wiki-surface)] border border-[var(--color-wiki-border)]">
          <button
            type="button"
            onClick={() => setMode("edit")}
            title="Edit"
            className={`p-1.5 rounded-md transition-colors ${mode === "edit" ? "bg-[var(--color-wiki-accent)] text-white" : "text-[var(--color-wiki-muted)] hover:text-white"}`}
          >
            <FileText size={15} />
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            title="Preview"
            className={`p-1.5 rounded-md transition-colors ${mode === "preview" ? "bg-[var(--color-wiki-accent)] text-white" : "text-[var(--color-wiki-muted)] hover:text-white"}`}
          >
            <Eye size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {entry && (
            <button
              type="button"
              onClick={remove}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!canSave || isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-wiki-accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-wiki-accent-hover)] disabled:opacity-50"
          >
            <Save size={14} />
            {isSaving ? "Saving" : "Save"}
          </button>
        </div>
      </div>

      {status && (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{status}</p>
      )}

      {mode === "edit" ? (
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          spellCheck={false}
          className="min-h-[560px] w-full resize-y rounded-lg bg-[#0a0c12] border border-[var(--color-wiki-border)] px-4 py-3 font-mono text-sm leading-6 text-[var(--color-wiki-text)] outline-none focus:border-[var(--color-wiki-accent)]"
        />
      ) : (
        <article className="prose min-h-[560px] rounded-lg border border-[var(--color-wiki-border)] bg-[#0a0c12] px-5 py-4">
          <MarkdownRenderer content={content} />
        </article>
      )}
    </div>
  );
}
