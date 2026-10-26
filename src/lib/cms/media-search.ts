import type { MediaItem } from "./types";

/**
 * Whether a media item matches a library search: its names (including the
 * file it was uploaded from, so "DSCF6400" finds it), title, caption, the owner's
 * tags and the keywords an agent wrote. The one search for the media
 * page and the picker, so a word finds the same images in both.
 */
export function mediaMatches(item: MediaItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const sourceFile = item.source?.path?.split(/[\\/]/).pop();
  return [item.originalName, item.filename, sourceFile, item.title, item.caption, ...(item.tags ?? []), ...(item.keywords ?? [])].some(
    (text) => text?.toLowerCase().includes(q)
  );
}
