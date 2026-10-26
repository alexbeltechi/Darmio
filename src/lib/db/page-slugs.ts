import { listCategories } from "@/lib/db/categories";
import { reservedPageSlugReason } from "@/lib/cms/system-pages";

/**
 * Why a custom page in the "pages" collection can't take this slug (it
 * belongs to a system page or an admin route), or null. Other collections
 * aren't restricted.
 */
export async function pageSlugError(collection: string, slug: string | undefined): Promise<string | null> {
  if (collection !== "pages" || !slug) return null;
  const categories = await listCategories();
  return reservedPageSlugReason(slug, categories);
}
