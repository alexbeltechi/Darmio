import type { Entry, MediaItem } from "@/lib/cms/types";
import { getEntryMediaIds } from "@/lib/cms/entry-media";

/**
 * Compact views for listing, so an agent can find things without reading
 * whole posts. A list is for finding; to write, edit or quote a post, read it
 * in full (as Markdown or JSON).
 */

export const POST_FIELDS = [
  "slug", "id", "title", "status", "date", "updatedAt", "publishedAt",
  "categories", "tags", "hasChanges", "source", "sourcePath", "excerpt", "blocks", "mediaIds",
] as const;
export type PostField = (typeof POST_FIELDS)[number];
export const DEFAULT_POST_FIELDS: PostField[] = ["slug", "title", "status", "date", "hasChanges"];

/** Plain text of the first text block, cut to ~200 characters. */
function excerpt(content: unknown): string {
  const blocks = Array.isArray(content) ? (content as { type: string; html?: string }[]) : [];
  const html = blocks.find((b) => b.type === "text" && b.html)?.html || "";
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 200 ? `${text.slice(0, 200).trimEnd()}…` : text;
}

/** A post as the requested fields, taken from the version being edited (unpublished changes included). */
export function summarizePost(entry: Entry, fields: PostField[]): Record<string, unknown> {
  const data = { ...entry.data, ...entry.pendingData } as Record<string, unknown>;
  const all: Record<PostField, () => unknown> = {
    slug: () => entry.slug,
    id: () => entry.id,
    title: () => data.title || "",
    status: () => entry.status,
    date: () => data.date || entry.createdAt,
    updatedAt: () => entry.updatedAt,
    publishedAt: () => entry.publishedAt,
    categories: () => data.categories || [],
    tags: () => data.tags || "",
    hasChanges: () => entry.status === "published" && Boolean(entry.pendingData),
    source: () => entry.source?.origin || "web",
    sourcePath: () => (entry.metadata?.source as { path?: string } | undefined)?.path || "",
    excerpt: () => excerpt(data.content),
    blocks: () => (Array.isArray(data.content) ? data.content.length : 0),
    // Every media item the post uses, so "which post is this image in?" needs no second request.
    mediaIds: () => [...new Set(getEntryMediaIds(entry))],
  };
  return Object.fromEntries(fields.map((f) => [f, all[f]()]));
}

/** `fields=a,b,c` → valid post fields, or the defaults for `fields=` / `fields=summary`. */
export function parsePostFields(param: string | null): PostField[] | null {
  if (param === null) return null;
  const asked = param.split(",").map((f) => f.trim()).filter(Boolean);
  const valid = asked.filter((f): f is PostField => (POST_FIELDS as readonly string[]).includes(f));
  return valid.length > 0 ? valid : DEFAULT_POST_FIELDS;
}

export const MEDIA_FIELDS = [
  "id", "name", "url", "mime", "width", "height", "size", "alt", "caption", "title", "tags", "keywords",
  "createdAt", "fingerprint", "sha256", "description", "sourcePath",
] as const;
export type MediaField = (typeof MEDIA_FIELDS)[number];
export const DEFAULT_MEDIA_FIELDS: MediaField[] = ["id", "name", "mime", "width", "height"];

export function summarizeMedia(item: MediaItem, fields: MediaField[]): Record<string, unknown> {
  const all: Record<MediaField, () => unknown> = {
    id: () => item.id,
    name: () => item.originalName || item.filename,
    url: () => item.url,
    mime: () => item.mime,
    width: () => item.width,
    height: () => item.height,
    size: () => item.size,
    alt: () => item.alt || "",
    caption: () => item.caption || "",
    title: () => item.title || "",
    tags: () => item.tags || [],
    keywords: () => item.keywords || [],
    createdAt: () => item.createdAt,
    // What the image looks like (see MediaItem.fingerprint), for "is this already up?" checks.
    fingerprint: () => item.fingerprint ?? null,
    sha256: () => item.sha256 ?? null,
    description: () => item.description || "",
    sourcePath: () => item.source?.path || "",
  };
  return Object.fromEntries(fields.map((f) => [f, all[f]()]));
}

export function parseMediaFields(param: string | null): MediaField[] | null {
  if (param === null) return null;
  const asked = param.split(",").map((f) => f.trim()).filter(Boolean);
  const valid = asked.filter((f): f is MediaField => (MEDIA_FIELDS as readonly string[]).includes(f));
  return valid.length > 0 ? valid : DEFAULT_MEDIA_FIELDS;
}
