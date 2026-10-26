import { categoryGroups } from "@/lib/cms/category-groups";
import { listCategories } from "./categories";
import { getPublishedEntries } from "./entries";

/**
 * Published post counts for the site nav, keyed by nav slug: `home` is every
 * post, each top-level category is the posts on its page (its own tag or any
 * category inside it, so a post in two groups counts in both). Falls back to
 * an empty map when the database is unreachable, so the nav simply shows no
 * counts instead of breaking the page.
 */
export async function getNavCounts(): Promise<Record<string, number>> {
  try {
    const [posts, categories] = await Promise.all([getPublishedEntries("posts"), listCategories()]);
    const slugById = new Map(categories.map((c) => [c.id, c.slug]));

    const counts: Record<string, number> = { home: posts.length };
    for (const group of categoryGroups(categories)) {
      const members = group.members;
      counts[group.slug] = posts.filter((post) =>
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
