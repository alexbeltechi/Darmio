/**
 * What Remove examples takes out, worked out from the site as it is, with no
 * database access (so it can be checked on its own). An example site's posts,
 * pages, categories and media carry `metadata.example`. They all go, edited
 * or not (Remove means the example is gone), except what the maker's own
 * work still needs:
 * - an example page one of their pages sits under;
 * - an example category one of their posts is in, one of their pages lists
 *   (Home's posts), or one of their categories sits inside;
 * - example media their posts, pages or categories show.
 */

import type { Entry } from "./types";
import { getEntryMediaIds } from "./entry-media";

/** Anything that can be marked as an example: entries, categories, media. */
export function isExample(item: { metadata?: Record<string, unknown> }): boolean {
  return item.metadata?.example === true;
}

type CategoryLike = { id: string; slug: string; parentId?: string | null; image?: string; metadata?: Record<string, unknown> };

export type ExampleRemovalPlan<C extends CategoryLike = CategoryLike> = {
  /** Example posts and pages to delete. */
  entries: Entry[];
  /** Example pages kept because one of the maker's pages sits under them. */
  keptEntries: Entry[];
  /** Example categories to delete, the ones inside others first. */
  categories: C[];
  /** Example categories kept because something that stays is in them. */
  keptCategories: C[];
  /** Example media ids to delete. */
  media: string[];
  /** Example media ids kept because something that stays shows them. */
  keptMedia: string[];
};

/** Both versions of an entry: what's live and the edits not yet published. */
function versions(entry: Entry): Record<string, unknown>[] {
  return [entry.data, entry.pendingData].filter(Boolean) as Record<string, unknown>[];
}

/** The page (by slug) an entry sits under, in either version. */
function parentsOf(entry: Entry): string[] {
  return versions(entry)
    .map((data) => data.parent)
    .filter((parent): parent is string => typeof parent === "string" && parent.length > 0);
}

/** The categories an entry is in (ids), and the one a page lists (Home's posts, a slug). */
function categoriesOf(entry: Entry): string[] {
  return versions(entry)
    .flatMap((data) => [...(Array.isArray(data.categories) ? (data.categories as unknown[]) : []), data.postsCategory])
    .filter((ref): ref is string => typeof ref === "string" && ref.length > 0);
}

export function planExampleRemoval<C extends CategoryLike>(input: {
  /** Every post and page on the site, examples and not. */
  entries: Entry[];
  /** Every category. */
  categories: C[];
  /** The ids of media marked as examples. */
  exampleMedia: string[];
}): ExampleRemovalPlan<C> {
  const keptEntries = new Set(input.entries.filter((entry) => !isExample(entry)));

  // A page that stays keeps the example page it sits under (and that one's own parent).
  for (let grew = true; grew; ) {
    grew = false;
    const neededPages = new Set([...keptEntries].filter((e) => e.collection === "pages").flatMap(parentsOf));
    for (const entry of input.entries) {
      if (keptEntries.has(entry) || entry.collection !== "pages" || !neededPages.has(entry.slug)) continue;
      keptEntries.add(entry);
      grew = true;
    }
  }

  const keptCategories = new Set(input.categories.filter((category) => !isExample(category)));
  const usedCategories = new Set([...keptEntries].flatMap(categoriesOf));
  for (const category of input.categories) {
    if (usedCategories.has(category.id) || usedCategories.has(category.slug)) keptCategories.add(category);
  }
  // A category that stays keeps the one it sits inside.
  for (let grew = true; grew; ) {
    grew = false;
    const parents = new Set([...keptCategories].map((c) => c.parentId).filter(Boolean));
    for (const category of input.categories) {
      if (keptCategories.has(category) || !parents.has(category.id)) continue;
      keptCategories.add(category);
      grew = true;
    }
  }

  const usedMedia = new Set([
    ...[...keptEntries].flatMap(getEntryMediaIds),
    ...[...keptCategories].map((c) => c.image).filter((id): id is string => Boolean(id)),
  ]);
  const exampleMedia = [...new Set(input.exampleMedia)];

  const goingCategories = input.categories.filter((category) => !keptCategories.has(category));
  return {
    entries: input.entries.filter((entry) => !keptEntries.has(entry)),
    keptEntries: input.entries.filter((entry) => isExample(entry) && keptEntries.has(entry)),
    // Inside ones first, so a category is never left inside one that's gone.
    categories: [...goingCategories.filter((c) => c.parentId), ...goingCategories.filter((c) => !c.parentId)],
    keptCategories: input.categories.filter((category) => isExample(category) && keptCategories.has(category)),
    media: exampleMedia.filter((id) => !usedMedia.has(id)),
    keptMedia: exampleMedia.filter((id) => usedMedia.has(id)),
  };
}
