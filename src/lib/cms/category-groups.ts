/**
 * Category groups: how a site's categories become its sections. A category
 * with no parent is top-level: it has a page, can be in the nav, and rolls
 * up the categories inside it (Photography holds Portrait, Travel…). One
 * level only. Pure, so the site's server and browser code share it.
 */
import type { CategoryLayout } from "./types";

export type CategoryLike = {
  id: string;
  slug: string;
  label: string;
  parentId?: string | null;
  nav?: boolean;
  headline?: string;
  description?: string;
  layout?: CategoryLayout;
};

export type CategoryGroup = {
  slug: string;
  label: string;
  /** Its own slug and the slugs of the categories inside it. */
  members: string[];
  nav: boolean;
  headline?: string;
  description?: string;
  layout?: CategoryLayout;
};

/** The top-level category a category rolls up to: its parent, else itself. */
export function topLevelOf<T extends CategoryLike>(category: T, byId: Map<string, T>): T {
  const parent = category.parentId ? byId.get(category.parentId) : undefined;
  return parent && !parent.parentId ? parent : category;
}

/** The site's sections, in the categories' own order. */
export function categoryGroups(categories: CategoryLike[]): CategoryGroup[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return categories
    .filter((c) => topLevelOf(c, byId) === c)
    .map((top) => ({
      slug: top.slug,
      label: top.label,
      members: [top.slug, ...categories.filter((c) => c !== top && topLevelOf(c, byId) === top).map((c) => c.slug)],
      nav: top.nav !== false,
      headline: top.headline || undefined,
      description: top.description || undefined,
      layout: top.layout,
    }));
}

/** The group a category slug belongs to, if any. */
export function groupOfSlug(groups: CategoryGroup[], slug: string): CategoryGroup | undefined {
  return groups.find((g) => g.members.includes(slug));
}
