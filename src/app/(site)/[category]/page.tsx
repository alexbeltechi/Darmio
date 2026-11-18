import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageView } from "@/components/site/page-view";
import { CategoryFeed } from "@/components/site/category-feed";
import { feedCategory, getPreviewCandidateIds } from "@/components/site/post-grid-shared";
import { categoryGroups } from "@/lib/cms/category-groups";
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
  const category = categories.find((c) => c.slug === slug || c.id === slug);
  if (category) return { title: category.label, description: category.description || undefined };
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

  // A top-level category rolls up the categories inside it (Photography
  // includes Portrait, Wedding, …); one inside another shows only its own work.
  const group = categoryGroups(categories).find((g) => g.slug === category.slug);
  const memberSlugs = group ? group.members : [category.slug];
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

  // A category inside another looks like the one it's in, unless it has a layout of its own.
  const parent = category.parentId ? categories.find((c) => c.id === category.parentId) : undefined;
  const view = {
    layout: category.layout ?? parent?.layout ?? ("hero" as const),
    intro: { title: category.headline || category.label, description: category.description },
  };

  return (
    <main className="flex w-full flex-1 flex-col">
      <CategoryFeed
        layout={view.layout}
        sections={[{ intro: view.intro, posts: entries }]}
        mediaItems={mediaItems}
        categories={categories.map(feedCategory)}
      />
    </main>
  );
}
