"use client";

import { useMemo } from "react";
import type { Entry, MediaItem } from "@/lib/cms/types";
import type { Category } from "./post-grid-shared";
import { FeedEntry } from "./feed-entry";
import { PageHero } from "./page-hero";
import type { HomeHero } from "@/lib/cms/site";

interface HomeFeedProps {
  posts: Entry[];
  mediaItems: MediaItem[];
  categories: Category[];
  /** The headline over the feed (Settings › Site); none shows the feed alone. */
  hero: HomeHero | null;
}

/**
 * The homepage (Figma 602:2410): the headline from Settings › Site, if set,
 * then every post, newest first. An empty site says so quietly.
 */
export function HomeFeed({ posts, mediaItems, categories, hero }: HomeFeedProps) {
  const mediaMap = useMemo(
    () => new Map(mediaItems.map((item) => [item.id, item])),
    [mediaItems]
  );
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <div className="flex flex-col items-center pb-24">
      {hero ? (
        <PageHero
          title={hero.title}
          cta={hero.ctaLabel && hero.ctaHref ? { label: hero.ctaLabel, href: hero.ctaHref } : undefined}
        />
      ) : (
        <div className="pt-ds-160" />
      )}

      {posts.length === 0 && <p className="px-ds-20 text-p text-ds-fg-muted">Nothing published yet.</p>}

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
