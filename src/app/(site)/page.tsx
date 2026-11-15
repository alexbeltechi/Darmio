import { connection } from "next/server";
import { HomeFeed } from "@/components/site/home-feed";
import { getPublishedEntries, getEntry } from "@/lib/db/entries";
import { getMediaByIds } from "@/lib/cms/media";
import { listCategories } from "@/lib/db/categories";
import { PageView } from "@/components/site/page-view";
import { feedCategory, getPreviewCandidateIds } from "@/components/site/post-grid-shared";
import { pageSettings } from "@/lib/cms/page-formats";
import type { Entry } from "@/lib/cms/types";

// Use ISR - the feed is chronological, so the same output serves everyone.
export const revalidate = 60;

function entryDate(entry: Entry): number {
  return new Date((entry.data.date as string) || entry.createdAt).getTime();
}

export default async function HomePage() {
  // No database (a fresh install, or a preview built before one is connected):
  // render per request, so the build doesn't prerender a page that can't read
  // anything; the site's layout shows the no-database screen instead.
  if (!process.env.MONGODB_URI) await connection();

  // If a published "home" builder page exists (a Home-format page, or one
  // with blocks), render it. Otherwise fall back to the default homepage
  // below (safe rollback path).
  const homePage = await getEntry("pages", "home");
  if (
    homePage?.status === "published" &&
    (pageSettings(homePage.data).format === "home" || (homePage.data.content as unknown[] | undefined)?.length)
  ) {
    return <PageView page={homePage} />;
  }

  const posts = await getPublishedEntries("posts");

  // Newest first.
  const allEntries = [...posts].sort((a, b) => entryDate(b) - entryDate(a));

  // Only each post's preview media is needed for the feed.
  const mediaIds = new Set(allEntries.flatMap(getPreviewCandidateIds));

  const [mediaItems, categories] = await Promise.all([getMediaByIds(Array.from(mediaIds)), listCategories()]);

  return (
    <main className="flex w-full flex-1 flex-col">
      <HomeFeed
        posts={allEntries}
        mediaItems={mediaItems}
        categories={categories.map(feedCategory)}
      />
    </main>
  );
}
