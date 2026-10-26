import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageView } from "@/components/site/page-view";
import { CategoryFeed } from "@/components/site/category-feed";
import { MAIN_CATEGORIES, getPreviewCandidateIds } from "@/components/site/post-grid-shared";
import { CATEGORY_VIEWS } from "@/components/site/site-views";
import { getEntry, getPublishedEntries } from "@/lib/db/entries";
import { getMediaByIds } from "@/lib/cms/media";
import { listCategories } from "@/lib/db/categories";
import type { Entry } from "@/lib/cms/types";

// Use ISR - regenerate every 60 seconds for instant navigation
export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

function entryDate(entry: Entry): number {
  return new Date((entry.data.date as string) || entry.createdAt).getTime();
}

/** A published page from the page builder at this slug, if there's no category here. */
async function publishedPage(slug: string) {
  const page = await getEntry("pages", slug);
  return page?.status === "published" ? page : null;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const categories = await listCategories();
  if (categories.some((c) => c.slug === slug || c.id === slug)) return {};
  const page = await publishedPage(slug);
  if (!page) return {};
  return {
    title: page.data.title as string,
    description: (page.data.description as string) || undefined,
  };
}

/**
 * /<slug>: a category's feed, or else a page made in the page builder (a
 * page can't take a category's slug, see lib/cms/system-pages.ts).
 */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params;

  const [posts, categories] = await Promise.all([
    getPublishedEntries("posts"),
    listCategories(),
  ]);

  const category = categories.find((c) => c.slug === categorySlug || c.id === categorySlug);
  if (!category) {
    const page = await publishedPage(categorySlug);
    if (!page) notFound();
    return <PageView page={page} />;
  }

  // A main category rolls up its sub-categories (Photography includes
  // Portrait, Wedding, …); a sub-category shows only its own work.
  const main = MAIN_CATEGORIES.find((m) => m.slug === category.slug);
  const memberSlugs: readonly string[] = main ? main.members : [category.slug];
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));

  const entries = posts
    .filter((entry) =>
      ((entry.data.categories as string[] | undefined) || []).some((id) =>
        memberSlugs.includes(slugById.get(id) ?? "")
      )
    )
    .sort((a, b) => entryDate(b) - entryDate(a));

  const mediaIds = new Set(entries.flatMap(getPreviewCandidateIds));
  const mediaItems = await getMediaByIds(Array.from(mediaIds));

  const view = CATEGORY_VIEWS[category.slug] ?? {
    layout: "hero" as const,
    intro: { title: category.label, description: category.description },
  };

  return (
    <main className="w-full">
      <CategoryFeed
        layout={view.layout}
        sections={[{ intro: view.intro, posts: entries }]}
        mediaItems={mediaItems}
        categories={categories.map(({ id, slug, label }) => ({ id, slug, label }))}
      />
    </main>
  );
}
