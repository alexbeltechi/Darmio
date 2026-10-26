"use client";

import { useMemo } from "react";
import type { Entry, MediaItem } from "@/lib/cms/types";
import type { Category } from "./post-grid-shared";
import { FeedEntry } from "./feed-entry";
import { PageHero } from "./page-hero";
import type { HOME_HERO } from "./site-views";

interface HomeFeedProps {
  posts: Entry[];
  mediaItems: MediaItem[];
  categories: Category[];
  hero: typeof HOME_HERO;
}

/**
 * The homepage (Figma 602:2410): the shared PageHero with a CTA into the
 * Design view, then the chronological column.
 */
export function HomeFeed({ posts, mediaItems, categories, hero }: HomeFeedProps) {
  const mediaMap = useMemo(
    () => new Map(mediaItems.map((item) => [item.id, item])),
    [mediaItems]
  );
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <div className="flex flex-col items-center pb-24">
      <PageHero title={hero.title} cta={hero.cta} />

      <section className="flex w-full max-w-[700px] flex-col items-center gap-4 px-5">
        <div className="flex w-full flex-col items-center gap-18">
          {posts.map((post) => (
            <FeedEntry key={post.id} post={post} mediaMap={mediaMap} categoryMap={categoryMap} />
          ))}
        </div>
      </section>
    </div>
  );
}
