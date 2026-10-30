"use client";

import { useMemo } from "react";
import { DsEmptyState } from "@beltechi/parabola";
import type { Entry, MediaItem } from "@/lib/cms/types";
import type { Category } from "./post-grid-shared";
import { FeedEntry } from "./feed-entry";

interface HomeFeedProps {
  posts: Entry[];
  mediaItems: MediaItem[];
  categories: Category[];
}

/**
 * The homepage (Figma 602:2410): every post, newest first. An empty site says
 * so quietly. A homepage with its own words is a page with the slug "home"
 *.
 */
export function HomeFeed({ posts, mediaItems, categories }: HomeFeedProps) {
  const mediaMap = useMemo(
    () => new Map(mediaItems.map((item) => [item.id, item])),
    [mediaItems]
  );
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // An empty site says so in the middle of the page.
  if (posts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center">
        <DsEmptyState>Nothing published yet.</DsEmptyState>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pb-24">
      <div className="pt-ds-160" />

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
