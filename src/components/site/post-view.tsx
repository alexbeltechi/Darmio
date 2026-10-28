import { Suspense } from "react";
import Link from "next/link";
import { DsButton } from "@beltechi/parabola";
import { INLINE_GALLERY_MAX } from "@/lib/cms/justified-rows";
import { getPublishedEntries } from "@/lib/db/entries";
import { getMediaByIds } from "@/lib/cms/media";
import type { SiteSettings } from "@/lib/db/settings";
import { safeExternalUrl, type SourceLineSettings } from "@/lib/integrations/types";
import { ArticleContent } from "@/components/site/article-content";
import { PostGrid } from "@/components/site/post-grid";
import { PostHeader } from "@/components/site/post-header";
import { PostPageWrapper } from "@/components/site/post-page-wrapper";
import { NavHighlight } from "@/components/site/site-nav";
import { feedCategory, getPostGroups, getPreviewCandidateIds } from "@/components/site/post-grid-shared";
import { categoryGroups } from "@/lib/cms/category-groups";
import type { Block, Entry, MediaItem } from "@/lib/cms/types";
import type { Category } from "@/lib/db/categories";

interface CategoryRef {
  id: string;
  slug: string;
  label: string;
}

function entryDate(entry: Entry): number {
  return new Date((entry.data.date as string) || entry.createdAt).getTime();
}

/** Every media id referenced by the post's blocks. */
function blockMediaIds(blocks: Block[]): string[] {
  return blocks.flatMap((block) => {
    if (block.type === "gallery") return block.mediaIds;
    if (block.type === "image" || block.type === "video") return block.mediaId ? [block.mediaId] : [];
    return [];
  });
}

/**
 * A post: title, categories and date, then its blocks stacked as a
 * traditional article. Each gallery opens its own full-screen viewer that
 * cycles only that gallery's media. Shared by the public page and the
 * admin preview, which passes the post with its unpublished changes.
 */
export async function PostView({
  post,
  allCategories,
  settings,
  preview = false,
}: {
  post: Entry;
  allCategories: Category[];
  settings: SiteSettings;
  /** The admin preview: shows placeholders for images still to come. */
  preview?: boolean;
}) {

  const categoryIds = (post.data.categories as string[]) || [];
  const postCategories = categoryIds
    .map((id) => allCategories.find((c) => c.id === id))
    .filter((c): c is (typeof allCategories)[number] => Boolean(c));

  const dateLabel = new Date((post.data.date as string) || post.createdAt).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric" }
  );

  const blocks = (post.data.content as Block[]) || [];
  const mediaItems = await getMediaByIds(blockMediaIds(blocks));

  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));
  const mainCategory = getPostGroups(post, categoryMap)[0];

  return (
    <PostPageWrapper>
      <NavHighlight slug={mainCategory?.slug ?? null} />
      <main className="min-h-screen bg-ds-bg">
        <article className="px-ds-20">
          <PostHeader
            title={post.data.title as string}
            categories={postCategories}
            dateLabel={dateLabel}
          />

          <ArticleContent blocks={blocks} mediaItems={mediaItems} preview={preview} />

          <SourceLine post={post} settings={settings.sourceLine} />
        </article>

        <Suspense fallback={null}>
          <MoreToExplore
            postId={post.id}
            categoryIds={categoryIds}
            allCategories={allCategories}
          />
        </Suspense>
      </main>
    </PostPageWrapper>
  );
}

/**
 * "Source: X", linking to where the post first appeared. Wording and whether
 * it shows at all are in Settings; a link without a label shows its domain.
 */
function SourceLine({ post, settings }: { post: Entry; settings: SourceLineSettings }) {
  if (!settings.enabled) return null;

  const url = safeExternalUrl(post.data.sourceUrl);
  const label = ((post.data.sourceLabel as string) || "").trim() || (url ? new URL(url).hostname.replace(/^www\./, "") : "");
  if (!label) return null;

  return (
    <p className="mx-auto mt-ds-40 w-full max-w-[600px] text-p text-ds-fg-muted">
      {settings.prefix && <>{settings.prefix} </>}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ds-fg underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          {label}
        </a>
      ) : (
        <span className="text-ds-fg">{label}</span>
      )}
    </p>
  );
}

/**
 * Other posts: those sharing a sub-category first, then the rest of the
 * post's top-level group (never another group), newest first within each. An extra
 * under the post: if it can't load (say the database drops for a moment), the
 * post still shows without it.
 */
async function MoreToExplore(props: {
  postId: string;
  categoryIds: string[];
  allCategories: CategoryRef[];
}) {
  try {
    return await moreToExplore(props);
  } catch (error) {
    console.error("More to explore failed to load:", error);
    return null;
  }
}

async function moreToExplore({
  postId,
  categoryIds,
  allCategories,
}: {
  postId: string;
  categoryIds: string[];
  allCategories: CategoryRef[];
}) {
  const MAX_RELATED_POSTS = 12;

  const others = (await getPublishedEntries("posts"))
    .filter((p) => p.id !== postId)
    .sort((a, b) => entryDate(b) - entryDate(a));


  // The post's top-level groups (Design, Photography, Journal) through the
  // sub-category roll-up. After the posts that share a category, the grid
  // fills only from these groups: more Product, then other Design, never
  // Photography under a Design post.
  const slugOf = new Map(allCategories.map((cat) => [cat.id, cat.slug]));
  const slugsOf = (ids: string[]) => ids.map((id) => slugOf.get(id)).filter((slug): slug is string => Boolean(slug));
  const postSlugs = slugsOf(categoryIds);
  const groups = categoryGroups(allCategories);
  const groupSlugs = new Set<string>(
    groups.filter((g) => g.members.some((member) => postSlugs.includes(member))).flatMap((g) => g.members)
  );
  const inGroup = (p: Entry) => slugsOf((p.data.categories as string[]) || []).some((slug) => groupSlugs.has(slug));
  // Sharing a sub-category (Lifestyle) ranks above sharing only a top-level one (Photography).
  const isGroupSlug = (slug: string) => groups.some((g) => g.slug === slug);
  const subSlugs = postSlugs.filter((slug) => !isGroupSlug(slug));
  const sharesSub = (p: Entry) => slugsOf((p.data.categories as string[]) || []).some((slug) => subSlugs.includes(slug));

  const displayPosts = [
    ...others.filter(sharesSub),
    ...others.filter((p) => !sharesSub(p) && inGroup(p)),
  ].slice(0, MAX_RELATED_POSTS);

  if (displayPosts.length === 0) return null;

  const mediaItems = await getMediaByIds([...new Set(displayPosts.flatMap(getPreviewCandidateIds))]);
  const mediaMap = new Map<string, MediaItem>(mediaItems.map((item) => [item.id, item]));

  // Every category, so each card's line can find the group its tags roll up to.
  const categories = allCategories.map(feedCategory);

  // Name one of the post's categories, linked, but only one some other post
  // shares: a sub-category (Travel) over a top-level one (Photography). A post
  // alone in its categories is named by its group instead ("More Journal"),
  // since that's what the grid is filled from.
  const shared = allCategories.filter(
    (cat) =>
      categoryIds.includes(cat.id) &&
      others.some((p) => ((p.data.categories as string[] | undefined) || []).includes(cat.id))
  );
  const primaryCategory = shared.find((cat) => !isGroupSlug(cat.slug)) ?? shared[0];
  // The button goes up a level: to the top-level category the heading's
  // category rolls up to ("See all Photography" under "More Travel"), else
  // to the post's own top-level category, else to every post.
  const parent =
    groups.find((g) => primaryCategory && g.members.includes(primaryCategory.slug)) ??
    groups.find((g) => g.members.some((member) => postSlugs.includes(member)));
  const named = primaryCategory ?? parent;

  return (
    // As wide as an inline gallery (INLINE_GALLERY_MAX, 820px), inside the page's margins.
    <section className="px-ds-20 pt-ds-160 pb-ds-40">
      {/* The title column is as wide as its longest line, so a long category name never runs into the grid. */}
      <div
        className="mx-auto grid w-full gap-ds-80 lg:grid-cols-[auto_minmax(0,1fr)]"
        style={{ maxWidth: INLINE_GALLERY_MAX }}
      >
        {/* Centred above the grid on a phone; beside it from lg, staying put under the fixed nav as the grid scrolls past. */}
        <div className="flex flex-col items-center gap-ds-20 text-center lg:sticky lg:top-28 lg:items-start lg:self-start lg:text-left">
          <h2 className="text-h2 text-ds-fg sm:text-h1 lg:text-display">
            <span className="block">More</span>
            {named ? (
              <Link
                href={`/${named.slug}`}
                className="block text-ds-fg-subtle transition-opacity hover:opacity-70"
              >
                {named.label}
              </Link>
            ) : (
              <span className="block text-ds-fg-subtle">posts</span>
            )}
          </h2>
          <DsButton href={parent ? `/${parent.slug}` : "/"}>{parent ? `See all ${parent.label}` : "See all"}</DsButton>
        </div>
        {/* Two columns plus dense's one: three beside the title, two on a phone. */}
        <PostGrid
          posts={displayPosts}
          mediaMap={mediaMap}
          categories={categories}
          layout="masonry"
          targetColumns={2}
          padded={false}
          dense
        />
      </div>
    </section>
  );
}
