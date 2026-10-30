import { getMediaByIds } from "@/lib/cms/media";
import type { Block, Entry } from "@/lib/cms/types";
import { parsePageFormat } from "@/lib/cms/page-formats";
import type { PostMeta } from "./markdown";

/** Names media ids for Markdown output, from the files' alt text, title or file name. */
export async function mediaLabeller(blocks: Block[]): Promise<(id: string) => string> {
  const ids = blocks.flatMap((b) => (b.type === "gallery" ? b.mediaIds : b.type === "video" || b.type === "image" ? [b.mediaId] : []));
  const items = ids.length > 0 ? await getMediaByIds([...new Set(ids)]) : [];
  const names = new Map(items.map((m) => [m.id, m.alt || m.title || m.originalName || m.filename]));
  return (id) => names.get(id) || "";
}

/** The post's working content (unpublished changes over the live version). */
export function workingContent(entry: Entry): Block[] {
  return ((({ ...entry.data, ...entry.pendingData }) as Record<string, unknown>).content as Block[]) || [];
}

/** Front matter fields that were given, as post data. A bare date keeps the post's time of day. */
export function metaToData(meta: PostMeta, current?: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (meta.title !== undefined) data.title = meta.title;
  if (meta.categories !== undefined) data.categories = meta.categories;
  if (meta.tags !== undefined) data.tags = meta.tags;
  if (meta.description !== undefined) data.description = meta.description;
  if (meta.docs !== undefined) data.docs = meta.docs;
  if (meta.format !== undefined) data.format = parsePageFormat(meta.format) ?? "blocks";
  if (meta.parent !== undefined) data.parent = meta.parent;
  if (meta.nav !== undefined) data.nav = meta.nav;
  if (meta.links !== undefined) data.links = meta.links;
  if (meta.postsCategory !== undefined) data.postsCategory = meta.postsCategory;
  if (meta.newsletter !== undefined) data.newsletter = meta.newsletter;
  if (meta.date) {
    const existing = typeof current?.date === "string" ? current.date : "";
    data.date = existing.startsWith(meta.date) ? existing : new Date(`${meta.date}T12:00:00.000Z`).toISOString();
  }
  return data;
}
