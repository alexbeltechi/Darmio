import type { MediaItem } from "./types";

/**
 * Bytes a media item takes in storage: each file it points at, counted once
 * (for newer uploads the variants point at renditions). A video's poster has
 * no recorded size and isn't counted.
 */
export function storedBytes(item: MediaItem): number {
  const files = new Map<string, number>();
  for (const f of [...(item.renditions ?? []), item.fallback, ...Object.values(item.variants ?? {}), item.original]) {
    if (f?.url) files.set(f.url, f.size || 0);
  }
  if (!files.has(item.url)) files.set(item.url, item.size || 0);
  let total = 0;
  for (const size of files.values()) total += size;
  return total;
}
