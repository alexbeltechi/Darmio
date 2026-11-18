/**
 * Custom pages: a post that's drawn by a page of its own, not the standard
 * layout. One rule holds it together: **everything a reader reads or sees as
 * content stays in the post** (its words, pictures, video, captions, links),
 * and the custom page only arranges and decorates it. So there's one copy of
 * the content: editing the post changes the custom page, a file replaced in
 * the Library is replaced there too, and with the custom page off the
 * standard layout shows the same content, complete.
 *
 * - The post says which page it wants: `data.customPage = { key, off? }`.
 * - The page itself is code in the site's own `src/extensions/` (see
 *   `src/extensions/post-pages.ts`), found by that key.
 * - A custom page asks for the post's parts by name: a block may carry a
 *   short `name` ("intro", "photos"), written `<!-- block:ID name=intro -->`
 *   in the post's Markdown. What a page doesn't place still shows, in the
 *   standard way, so nothing is ever lost (`unplaced`).
 * - Deleting the post deletes the page's code with it, unless another post
 *   uses the same page (`custom-page-files.ts`).
 *
 * Pure (no database, no components), so the site, the admin and the agent
 * API share it.
 */
import type { Block, Entry, MediaItem } from "@/lib/cms/types";

/** What a post stores when it has a custom page. `off` keeps the page and shows the standard layout. */
export type CustomPageSetting = { key: string; off?: boolean };

/** What a custom page is given: the post's own content, nothing copied. */
export type CustomPostPageProps = {
  post: Entry;
  title: string;
  /** "15 Nov 2026". */
  dateLabel: string;
  /** The post's blocks, in order. */
  blocks: Block[];
  /** The Library files those blocks use. */
  media: MediaItem[];
  /** The admin's preview: placeholders for images still to come. */
  preview: boolean;
};

/** A post's custom page setting, if it has one. Anything malformed reads as none. */
export function customPageOf(data: Record<string, unknown> | undefined): CustomPageSetting | null {
  const raw = data?.customPage as Partial<CustomPageSetting> | undefined;
  if (!raw || typeof raw.key !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(raw.key)) return null;
  return { key: raw.key, ...(raw.off === true ? { off: true } : {}) };
}

/** The block with this name: the part of the post a custom page puts somewhere. */
export function part<T extends Block["type"]>(blocks: Block[], name: string, type?: T): Extract<Block, { type: T }> | undefined {
  const found = blocks.find((block) => block.name === name && (!type || block.type === type));
  return found as Extract<Block, { type: T }> | undefined;
}

/** The blocks a custom page didn't place, in the post's order: they show after it, in the standard way. */
export function unplaced(blocks: Block[], placed: string[]): Block[] {
  return blocks.filter((block) => !block.name || !placed.includes(block.name));
}

/** A block's Library files, in order. */
export function blockMedia(block: Block | undefined, media: MediaItem[]): MediaItem[] {
  if (!block) return [];
  const ids = block.type === "gallery" ? block.mediaIds : block.type === "image" || block.type === "video" ? [block.mediaId] : [];
  return ids.map((id) => media.find((item) => item.id === id)).filter((item): item is MediaItem => Boolean(item));
}
