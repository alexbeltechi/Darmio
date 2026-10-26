import type { MediaItem } from "./types";

/*
 * Plain URLs for a media item, safe on client and server. Images with
 * renditions should be drawn with MediaImage (components/shared), which
 * serves the srcset; these are for uploads made before renditions (its
 * `legacySrc`) and for small previews in the admin.
 */

/** The sharpest stored copy: the display variant, then medium, then the file itself. */
export function largestImageUrl(item: MediaItem): string {
  return item.variants?.display?.url || item.variants?.medium?.url || item.url;
}

/** A small preview for admin lists and pickers. */
export function thumbnailUrl(item: MediaItem): string {
  return item.variants?.thumb?.url || item.url;
}
