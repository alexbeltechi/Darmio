/**
 * System pages: the site's pages that are built in code (the homepage and one
 * page per category), listed in admin › Pages beside the custom pages made
 * with the page builder.
 *
 * They aren't entries in the database. Each is keyed by the slug its editable
 * version will take: when a system page becomes editable, a "pages" entry
 * with that slug overrides the coded page, which stays as the fallback (the
 * homepage already works this way, see app/(site)/page.tsx). Custom pages
 * therefore can't take these slugs.
 *
 * Pure (no database), so the admin list and the API share it.
 */

export type SystemPageKind = "home" | "category";

export type SystemPage = {
  /** Its slug in the "pages" collection, reserved for its editable version. */
  slug: string;
  title: string;
  /** Where it lives on the site. */
  path: string;
  kind: SystemPageKind;
};

type CategoryLike = { slug: string; label: string };

/** The homepage, then a page per category, in the categories' own order. */
export function buildSystemPages(categories: CategoryLike[]): SystemPage[] {
  return [
    { slug: "home", title: "Home", path: "/", kind: "home" },
    ...categories.map((c) => ({ slug: c.slug, title: c.label, path: `/${c.slug}`, kind: "category" as const })),
  ];
}

/**
 * Slugs a custom page can never take: admin routes beside the page editor,
 * and the site's own routes (custom pages live at /<slug>).
 */
const RESERVED_ROUTE_SLUGS = ["new", "system", "admin", "api", "post", "page", "parabola", "preview"];

/** Why a custom page can't use this slug, or null when it can. */
export function reservedPageSlugReason(slug: string, categories: CategoryLike[]): string | null {
  const normalized = slug.trim().toLowerCase();
  if (RESERVED_ROUTE_SLUGS.includes(normalized)) {
    return `"${slug}" is reserved by the site. Choose another URL.`;
  }
  // The homepage's editable version is a page at "home" (a Home-format page);
  // category pages can't be taken yet.
  const system = buildSystemPages(categories).find((p) => p.slug === normalized && p.kind !== "home");
  if (system) {
    return `"${slug}" belongs to the ${system.title} system page. Choose another URL.`;
  }
  return null;
}
