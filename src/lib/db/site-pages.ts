import { getPublishedEntries } from "@/lib/db/entries";
import { pageSettings, type PageSettings } from "@/lib/cms/page-formats";
import type { Entry } from "@/lib/cms/types";

/** A published page as the site's nav, home and page lists need it. */
export type SitePage = {
  slug: string;
  title: string;
  description?: string;
  settings: PageSettings;
};

export function toSitePage(entry: Entry): SitePage {
  const data = entry.data as Record<string, unknown>;
  return {
    slug: entry.slug,
    title: (data.title as string) || entry.slug,
    ...(typeof data.description === "string" && data.description.trim() ? { description: data.description.trim() } : {}),
    settings: pageSettings(data),
  };
}

/**
 * Every published page, in the order they were made, which is the order
 * pages under another page are listed in. The home page is left out: it's
 * the site's front, not a page in a list.
 */
export async function listSitePages(): Promise<SitePage[]> {
  const entries = await getPublishedEntries("pages");
  return entries
    .filter((entry) => entry.slug !== "home")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(toSitePage);
}

/** The pages under `slug`, in order. */
export function childPages(pages: SitePage[], slug: string): SitePage[] {
  return pages.filter((p) => p.settings.parent === slug);
}
