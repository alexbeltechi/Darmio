import type { Entry, MediaItem } from "@/lib/cms/types";

/** Homepage grid layout modes. */
export type GridLayout = "masonry" | "grid";

// Safety bounds for the masonry layout (width/height). Tiles follow each
// image's own ratio. Wide images aren't capped (the column width already
// limits them; they just get shorter). Very tall strips get a box no taller
// than 1:3, and the image still shows whole inside it (fitted, never cropped).
// MAX_ASPECT_RATIO only stands in when a ratio is unknown.
export const MIN_ASPECT_RATIO = 1 / 3;
export const MAX_ASPECT_RATIO = 3;

// Fixed tile ratio used by the uniform grid layout (width/height). The image
// is fitted inside the square, not cropped to fill it.
export const GRID_ASPECT_RATIO = 1; // square tiles

export interface Category {
  id: string;
  slug: string;
  label: string;
}

/**
 * The site's top-level categories, in nav order. Everything else in the CMS
 * (Portrait, Wedding, Garments, …) is a sub-category: it tags posts and rolls
 * up into one of these, but never appears in the nav or on a card's tag.
 * `nav: false` is a group of its own that isn't in the nav yet (Bikes): its
 * posts don't roll up into another group, and its page still works.
 */
export const MAIN_CATEGORIES = [
  { slug: "design", label: "Design", members: ["design", "brand", "product"], nav: true },
  {
    slug: "photography",
    label: "Photography",
    members: [
      "photography",
      "portrait",
      "still-life",
      "fashion",
      "wedding",
      "travel",
      "garments",
      "lifestyle",
    ],
    nav: true,
  },
  { slug: "journal", label: "Journal", members: ["journal"], nav: true },
  { slug: "bikes", label: "Bikes", members: ["bikes"], nav: false },
] as const;

export type MainCategory = (typeof MAIN_CATEGORIES)[number];

/** Slugs of every category tagged on the post. */
export function getPostCategorySlugs(
  post: Entry,
  categoryMap: Map<string, Category>
): string[] {
  const ids = (post.data.categories as string[] | undefined) || [];
  return ids.map((id) => categoryMap.get(id)?.slug).filter((s): s is string => Boolean(s));
}

/**
 * Every top-level category the post belongs to, in nav order, through the
 * sub-category roll-up (a post tagged "Portrait" and "Design" gives
 * Design and Photography). Empty when none of its tags roll up to one.
 */
export function getPostMainCategories(
  post: Entry,
  categoryMap: Map<string, Category>
): MainCategory[] {
  const slugs = getPostCategorySlugs(post, categoryMap);
  return MAIN_CATEGORIES.filter((main) => main.members.some((member) => slugs.includes(member)));
}

/**
 * The line under a post's title in feeds and grids: the top-level categories
 * it rolls up to ("Design, Photography"), or, when it rolls up to none (say,
 * only "Journal"), its own category names.
 */
export function getPostCategoryLine(post: Entry, categoryMap: Map<string, Category>): string {
  const main = getPostMainCategories(post, categoryMap).map((m) => m.label);
  if (main.length > 0) return main.join(", ");
  return ((post.data.categories as string[] | undefined) || [])
    .map((id) => categoryMap.get(id)?.label)
    .filter((label): label is string => Boolean(label))
    .join(", ");
}

/**
 * The post's top-level category, resolved through the sub-category roll-up —
 * a post tagged only "Wedding" still reports Photography. Null when nothing
 * matches any group.
 */
export function getMainCategory(
  post: Entry,
  categoryMap: Map<string, Category>
): MainCategory | null {
  const slugs = getPostCategorySlugs(post, categoryMap);
  return (
    MAIN_CATEGORIES.find((main) =>
      main.members.some((member) => slugs.includes(member))
    ) || null
  );
}

/**
 * Column count based on the grid's own width (not the viewport), so the grid
 * shows the right number of columns whether it's full-width or embedded in a
 * narrower column (e.g. the homepage 2/3 layout). Thresholds match the
 * container-query breakpoints used by the uniform grid.
 */
export function getColumnsForWidth(width: number): number {
  if (width < 500) return 1;
  if (width < 1300) return 2;
  if (width < 1900) return 3;
  if (width < 2500) return 4;
  return 5;
}

interface ContentBlockLike {
  type: string;
  mediaIds?: string[];
  mediaId?: string;
  html?: string;
}

function getBlocks(post: Entry): ContentBlockLike[] {
  return (post.data.content as ContentBlockLike[] | undefined) || [];
}

/**
 * Media ids that can represent a post in feeds and grids, in priority order:
 * the explicit `previewImage` override, then the first item of the first
 * gallery (or image/video block). Empty for text-only posts. Callers load all
 * candidates and use the first that exists, so a deleted override falls back
 * to the gallery instead of blanking the tile.
 */
export function getPreviewCandidateIds(post: Entry): string[] {
  const ids: string[] = [];
  const override = post.data.previewImage as string | undefined;
  if (override) ids.push(override);

  for (const block of getBlocks(post)) {
    const first =
      block.type === "gallery"
        ? block.mediaIds?.[0]
        : block.type === "image" || block.type === "video"
          ? block.mediaId
          : undefined;
    if (first) {
      if (!ids.includes(first)) ids.push(first);
      break;
    }
  }
  return ids;
}

/** The preview media resolved against a loaded media map, as a 0/1 item list. */
export function getPostMediaItems(
  post: Entry,
  mediaMap: Map<string, MediaItem>
): MediaItem[] {
  const media = getPreviewCandidateIds(post)
    .map((id) => mediaMap.get(id))
    .find((m): m is MediaItem => m !== undefined);
  return media ? [media] : [];
}

/**
 * The text shown under a post in feeds: its description when it has one,
 * otherwise the plain text of its first non-empty text block.
 */
export function getPreviewText(post: Entry): string {
  const description = typeof post.data.description === "string" ? post.data.description.trim() : "";
  if (description) return description;
  for (const block of getBlocks(post)) {
    if (block.type !== "text" || !block.html) continue;
    const text = block.html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|h\d|li|blockquote)>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    if (text) return text;
  }
  return "";
}

/**
 * Compute the container aspect ratio for the masonry layout.
 * - Multi-image posts use the tallest (smallest ratio) image.
 * - Everything else uses the first image's own ratio.
 * Very tall ratios are raised to MIN_ASPECT_RATIO; wide ones are kept as they are.
 */
export function getMasonryAspectRatio(post: Entry, mediaItems: MediaItem[]): number {
  if (post.collection === "posts" && mediaItems.length > 1) {
    let minRatio = MAX_ASPECT_RATIO;
    for (const media of mediaItems) {
      if (media.width && media.height) {
        const ratio = media.width / media.height;
        const clamped = Math.max(MIN_ASPECT_RATIO, ratio);
        if (clamped < minRatio) minRatio = clamped;
      }
    }
    return minRatio;
  }

  const firstMedia = mediaItems[0];
  const rawAspectRatio =
    firstMedia?.width && firstMedia?.height ? firstMedia.width / firstMedia.height : 1;
  return Math.max(MIN_ASPECT_RATIO, rawAspectRatio);
}
