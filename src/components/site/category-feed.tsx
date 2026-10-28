"use client";

import { useMemo } from "react";
import { DsEmptyState } from "@beltechi/parabola";
import type { Entry, MediaItem } from "@/lib/cms/types";
import { FeedEntry } from "./feed-entry";
import { IntroText } from "./intro-text";
import { PageHero } from "./page-hero";
import { PostGrid } from "./post-grid";
import { PostList } from "./pages/post-list";
import type { Category } from "./post-grid-shared";
import type { IntroLayout, ViewIntro } from "./site-views";

export interface FeedSectionData {
  intro: ViewIntro;
  posts: Entry[];
}

interface CategoryFeedProps {
  layout: IntroLayout;
  sections: FeedSectionData[];
  mediaItems: MediaItem[];
  categories: Category[];
}

/**
 * A category view: one or more sections, each an intro plus a single
 * chronological column. `wall` skips the intro and shows every post as a
 * masonry grid, like "More to explore". `list` stacks the posts like a
 * blog, left-aligned, with or without pictures. `hero` opens with the homepage's PageHero, which fades
 * as the feed scrolls up. `left` keeps the intro sticky beside its own
 * section's posts (Figma 601:2249), stacking intro-over-feed below 1180px
 * where the two columns no longer fit.
 */
export function CategoryFeed({ layout, sections, mediaItems, categories }: CategoryFeedProps) {
  const mediaMap = useMemo(
    () => new Map(mediaItems.map((item) => [item.id, item])),
    [mediaItems]
  );
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // A category with nothing in it yet: its title, and one line in the middle of the page.
  if (sections.every((section) => section.posts.length === 0)) {
    const intro = sections[0]?.intro;
    return (
      <div className="flex flex-1 flex-col items-center">
        {intro && <PageHero title={intro.title} description={intro.description} />}
        <DsEmptyState>Nothing here yet.</DsEmptyState>
      </div>
    );
  }

  if (layout === "list") {
    return <PostList intro={sections[0].intro} posts={sections.flatMap((section) => section.posts)} mediaMap={mediaMap} />;
  }

  if (layout === "wall") {
    return (
      <div data-content-start="" className="pt-24 pb-24 sm:pt-20">
        <PostGrid
          posts={sections.flatMap((section) => section.posts)}
          mediaMap={mediaMap}
          categories={categories}
          layout="masonry"
          targetColumns={5}
          dense
        />
      </div>
    );
  }

  if (layout === "hero") {
    return (
      <div className="flex flex-col items-center gap-24 pb-24">
        {sections.map((section, index) => (
          <div key={index} className="flex w-full flex-col items-center">
            <PageHero title={section.intro.title} description={section.intro.description} />
            <div className="w-full px-5">
              <FeedColumn posts={section.posts} mediaMap={mediaMap} categoryMap={categoryMap} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-ds-40 px-5 pt-24 pb-24 sm:pt-36">
      {sections.map((section, index) => (
        <section
          key={index}
          data-content-start=""
          className="flex flex-col items-center gap-14 sm:gap-ds-40 min-[1180px]:grid min-[1180px]:grid-cols-[359px_700px] min-[1180px]:items-start min-[1180px]:justify-center min-[1180px]:gap-x-[74px]"
        >
          <IntroText
            intro={section.intro}
            className="max-w-[585px] text-center min-[1180px]:sticky min-[1180px]:top-[144px] min-[1180px]:max-w-none min-[1180px]:text-left"
          />
          <FeedColumn posts={section.posts} mediaMap={mediaMap} categoryMap={categoryMap} />
        </section>
      ))}
    </div>
  );
}

function FeedColumn({
  posts,
  mediaMap,
  categoryMap,
}: {
  posts: Entry[];
  mediaMap: Map<string, MediaItem>;
  categoryMap: Map<string, Category>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[700px] flex-col items-center gap-18">
      {posts.map((post) => (
        <FeedEntry key={post.id} post={post} mediaMap={mediaMap} categoryMap={categoryMap} />
      ))}
    </div>
  );
}
