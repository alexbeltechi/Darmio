/** Doc types, shared by the server (lib/db/docs.ts) and the admin. */
import type { Actor } from "@/lib/agent/actor";
import { slugify } from "@/lib/slug";

export const DOC_KINDS = ["brief", "source", "guide"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

/**
 * Where a brief's page is in the process (see .claude/skills/landing-page):
 * writing the brief, wireframing it, building it from blocks, done.
 */
export const DOC_STAGES = ["writing", "wireframe", "building", "done"] as const;
export type DocStage = (typeof DOC_STAGES)[number];

/** A link kept with a doc: a reference, the preview, the live page. */
export type DocLink = { label: string; url: string };

export type Doc = {
  id: string;
  title: string;
  kind: DocKind;
  /** The Markdown itself. */
  body: string;
  /** The uploaded file's name, when it came from a file. */
  filename?: string;
  /** Briefs only: where the page is in the process. */
  stage?: DocStage;
  links?: DocLink[];
  createdBy: Actor;
  createdAt: string;
  updatedAt: string;
};

/** Where a doc is attached: a post or page, by collection and slug. */
export type DocUsage = { collection: string; slug: string; title: string };

export type DocWithUsage = Doc & { usedBy: DocUsage[] };

/** The files a document can be: anything Claude can read as text. */
export const DOC_EXTENSIONS = ["md", "markdown", "txt", "html", "htm", "csv", "json"] as const;
export const DOC_ACCEPT = DOC_EXTENSIONS.map((e) => `.${e}`).join(",");
export const isDocFilename = (name: string) => new RegExp(`\\.(${DOC_EXTENSIONS.join("|")})$`, "i").test(name);

/** The name a document shows under: its uploaded file name, or its title as a file ("work-with-me.md"). */
export function mdName(doc: Pick<Doc, "title" | "filename">): string {
  if (doc.filename) return doc.filename;
  if (/\.md$/i.test(doc.title.trim())) return doc.title.trim();
  return `${slugify(doc.title) || "untitled"}.md`;
}

/** "3 KB", "1.2 MB": a file's size for a list row. */
export function sizeLabel(bytes: number): string {
  return bytes < 1024 * 100 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** An MD's size: its Markdown in UTF-8 bytes. */
export const mdBytes = (doc: Pick<Doc, "body">) => new TextEncoder().encode(doc.body).length;

/** "4 Oct": the short date list rows use. */
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function isDocKind(value: unknown): value is DocKind {
  return typeof value === "string" && (DOC_KINDS as readonly string[]).includes(value);
}

export function isDocStage(value: unknown): value is DocStage {
  return typeof value === "string" && (DOC_STAGES as readonly string[]).includes(value);
}

/**
 * Links as given, kept only if each has a URL that's a site path ("/…") or
 * http(s). Returns null when the input isn't a list.
 */
export function cleanDocLinks(value: unknown): DocLink[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((l): l is DocLink => typeof l?.url === "string")
    .map((l) => ({ label: String(l.label || "").trim(), url: l.url.trim() }))
    .filter((l) => /^\/(?!\/)/.test(l.url) || /^https?:\/\//i.test(l.url))
    .map((l) => ({ ...l, label: l.label || l.url }));
}
