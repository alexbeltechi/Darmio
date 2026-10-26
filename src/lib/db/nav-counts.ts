import { MAIN_CATEGORIES } from "@/components/site/post-grid-shared";
import { listCategories } from "./categories";
import { getPublishedEntries } from "./entries";

/**
 * Published post counts for the site nav, keyed by nav slug: `home` is every
 * post, each main category is the posts on its page (its own tag or any of
 * its sub-categories, so a post in two groups counts in both). Falls back to
 * an empty map when the database is unreachable, so the nav simply shows no
 * counts instead of breaking the page.
 */
export async function getNavCounts(): Promise<Record<string, number>> {
  try {
    const [posts, categories] = await Promise.all([getPublishedEntries("posts"), listCategories()]);
    const slugById = new Map(categories.map((c) => [c.id, c.slug]));

    const counts: Record<string, number> = { home: posts.length };
    for (const main of MAIN_CATEGORIES) {
      const members: readonly string[] = main.members;
      counts[main.slug] = posts.filter((post) =>
        ((post.data.categories as string[] | undefined) || []).some((id) =>
          members.includes(slugById.get(id) ?? "")
        )
      ).length;
    }
    return counts;
  } catch {
    return {};
  }
}
