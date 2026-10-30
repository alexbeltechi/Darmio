/**
 * The Auto gallery layout: images in order, left to right, each at its own
 * shape, in rows of at most `galleryColumns`: an inline gallery of up to
 * three images is stacked, one large image a row; otherwise three a row
 * inline, more at full width. Every row, the last one too, is scaled to fill the width exactly,
 * like printed proofs, unless that would make it taller than its smallest
 * image really is (nothing is enlarged past its own pixels) or than the row
 * height limit; such a row stops there and sits centred.
 *
 * Heights come out as a fraction of the container's width, so a row scales
 * with the page in plain CSS; the width is only needed to decide where rows
 * break and how big they may get.
 */

import { DS_GUTTER_PX } from "@beltechi/parabola";
import type { GalleryBlock } from "./types";

/** Width over height, kept sane: missing sizes are 3:2, panoramas and slivers are capped. */
export function aspectOf(width?: number, height?: number): number {
  if (!width || !height) return 3 / 2;
  return Math.min(4, Math.max(0.4, width / height));
}

/**
 * The most images a row holds at this gallery width: two on a phone, up to
 * seven on a very large screen. Each step keeps a portrait about 250px wide
 * or more.
 */
function maxColumns(containerWidth: number): number {
  if (containerWidth < 640) return 2;
  if (containerWidth < 1024) return 3;
  if (containerWidth < 1280) return 4;
  if (containerWidth < 1680) return 5;
  if (containerWidth < 2200) return 6;
  return 7;
}

/**
 * The most images a row holds: at full width, `maxColumns`. Inline, up to
 * three images stack one a row (each as large as it may be, a "focus"
 * gallery); more go three a row (two on a phone).
 */
export function galleryColumns(containerWidth: number, full: boolean, count: number, stacked = false): number {
  if (stacked) return 1;
  if (full) return maxColumns(containerWidth);
  return count <= STACKED_GALLERY_COUNT ? 1 : Math.min(3, maxColumns(containerWidth));
}

/** Up to this many images, an inline gallery stacks them, one a row. */
export const STACKED_GALLERY_COUNT = 3;

/**
 * No row is taller than this, about a laptop screen, so a stretched row never
 * runs off screen. The inline width matches it, so a square fills an inline
 * gallery edge to edge (decisions, 2026-10-28).
 */
const MAX_ROW_PX = 820;

/**
 * How tall a row may get, in pixels: as tall as the gallery is wide, so a
 * square image fills the width (decisions, 2026-10-28); taller on a phone so
 * a portrait isn't left as a thumbnail; never more than MAX_ROW_PX.
 */
function rowCap(containerWidth: number): number {
  const ratio = containerWidth < 640 ? 1.5 : 1;
  return Math.min(ratio * containerWidth, MAX_ROW_PX);
}

export interface JustifiedRow {
  /** Indexes into the input, in order. */
  items: number[];
  /**
   * `fill`: the row spans the width, each image's share in proportion to its
   * shape. `fixed`: images are `height` (a fraction of the container's width)
   * tall, and the row is centred.
   */
  mode: "fill" | "fixed";
  height: number;
}

/**
 * Rows for images of these aspects, in a container this many pixels wide,
 * `gap` pixels apart, at most `columns` a row. `nativeHeights` are the
 * images' own heights in pixels (unknown ones don't limit).
 */
export function justifiedRows(
  aspects: number[],
  containerWidth: number,
  gap: number,
  nativeHeights: (number | undefined)[],
  columns: number
): JustifiedRow[] {
  const width = Math.max(containerWidth, 1);
  // The height a row would need to fill the width exactly, in pixels.
  const fit = (row: number[]) => (width - (row.length - 1) * gap) / row.reduce((sum, i) => sum + aspects[i], 0);
  // The tallest a row may be without enlarging any of its images.
  const native = (row: number[]) => Math.min(...row.map((i) => nativeHeights[i] || Infinity));

  const rows: number[][] = [];
  for (let i = 0; i < aspects.length; i += columns) rows.push(aspects.slice(i, i + columns).map((_, j) => i + j));

  return rows.map((items) => {
    const cap = Math.min(native(items), rowCap(width));
    const full = fit(items);
    return full <= cap
      ? { items, mode: "fill" as const, height: full / width }
      : { items, mode: "fixed" as const, height: cap / width };
  });
}

/**
 * The reading width: the text column of posts and pages (`max-w-[600px]` in
 * their markup), and the width of a gallery that stacks its images one a row,
 * so a picture lines up with the text and a square fills it (decisions,
 * 2026-10-28; was 661px).
 */
export const READING_WIDTH = 600;

/**
 * The widest an inline gallery with images side by side runs (Auto from four
 * images, grid, masonry, `large`): the tallest a row may be, so rows of three
 * stay big enough to see. Was 1024px.
 */
export const INLINE_GALLERY_MAX = MAX_ROW_PX;

/**
 * Whether a gallery shows one image a row: the Stacked layout, or Auto with
 * up to STACKED_GALLERY_COUNT images, inline.
 */
export function galleryStacks(layout: GalleryBlock["layout"], width: GalleryBlock["width"], count: number): boolean {
  if (galleryIsFull(width, count)) return false;
  if (layout === "stack") return true;
  return (layout === "auto" || layout === undefined) && count <= STACKED_GALLERY_COUNT;
}

/**
 * How wide a gallery may run, in pixels: the reading width when it stacks,
 * INLINE_GALLERY_MAX inline otherwise, none (the page's width) when full.
 */
export function galleryMaxWidth(
  layout: GalleryBlock["layout"],
  width: GalleryBlock["width"],
  count: number
): number | undefined {
  if (galleryIsFull(width, count)) return undefined;
  return galleryStacks(layout, width, count) ? READING_WIDTH : INLINE_GALLERY_MAX;
}

/**
 * From this many images an Auto-width gallery runs the page's whole width:
 * enough for about four rows on a laptop (five a row), so a wall of
 * pictures earns the space and a handful stays inline, three a row.
 */
export const FULL_GALLERY_COUNT = 20;

/**
 * Whether a gallery takes the page's whole width: `full` always, `auto` (and
 * a gallery that says nothing) from FULL_GALLERY_COUNT images, and the
 * inline widths never.
 */
export function galleryIsFull(width: GalleryBlock["width"], count: number): boolean {
  if (width === "full") return true;
  if (width === "auto" || width === undefined) return count >= FULL_GALLERY_COUNT;
  return false;
}

/** Live post pages keep the gutter (20px, `px-ds-20` in post-view) either side of a gallery. */
const PAGE_MARGIN = DS_GUTTER_PX;

/**
 * The width a gallery gets on the live post page in a window this wide: the
 * window less the page's margins, at most galleryMaxWidth.
 * The editor lays its rows out at this width, so it shows the rows a visitor
 * on the same screen sees, breakpoints included.
 */
export function liveGalleryWidth(
  viewportWidth: number,
  width: GalleryBlock["width"],
  count: number,
  layout: GalleryBlock["layout"] = "auto"
): number {
  const available = Math.max(viewportWidth - 2 * PAGE_MARGIN, 1);
  const max = galleryMaxWidth(layout, width, count);
  return max === undefined ? available : Math.min(available, max);
}
