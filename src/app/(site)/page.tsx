import { HomeFeed } from "@/components/site/home-feed";
import { HOME_HERO } from "@/components/site/site-views";
import { getPublishedEntries, getEntry } from "@/lib/db/entries";
import { getMediaByIds } from "@/lib/cms/media";
import { listCategories } from "@/lib/db/categories";
import { PageView } from "@/components/site/page-view";
import { getPreviewCandidateIds } from "@/components/site/post-grid-shared";
import type { Entry } from "@/lib/cms/types";

// Use ISR - the feed is chronological, so the same output serves everyone.
export const revalidate = 60;

function entryDate(entry: Entry): number {
  return new Date((entry.data.date as string) || entry.createdAt).getTime();
}

export default async function HomePage() {
  // If a published "home" builder page exists, render it. Otherwise fall back
  // to the default homepage below (safe rollback path).
  const homePage = await getEntry("pages", "home");
  if (homePage?.status === "published" && (homePage.data.content as unknown[] | undefined)?.length) {
    return <PageView page={homePage} />;
  }

  const posts = await getPublishedEntries("posts");

  // Newest first.
  const allEntries = [...posts].sort((a, b) => entryDate(b) - entryDate(a));

  // Only each post's preview media is needed for the feed.
  const mediaIds = new Set(allEntries.flatMap(getPreviewCandidateIds));

  const [mediaItems, categories] = await Promise.all([getMediaByIds(Array.from(mediaIds)), listCategories()]);

  return (
    <main className="w-full">
      <HomeFeed
        posts={allEntries}
        mediaItems={mediaItems}
        categories={categories.map(({ id, slug, label }) => ({ id, slug, label }))}
        hero={HOME_HERO}
      />
    </main>
  );
}
