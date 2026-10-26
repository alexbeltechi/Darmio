"use client";

import type { Entry, MediaItem } from "@/lib/cms/types";
import { MasonryGrid } from "./masonry-grid";
import { UniformGrid } from "./uniform-grid";
import type { Category, GridLayout } from "./post-grid-shared";

interface PostGridProps {
  posts: Entry[];
  mediaMap: Map<string, MediaItem>;
  categories: Category[];
  /** Which layout to render. Defaults to "masonry" for backward compatibility. */
  layout?: GridLayout;
  /** Include the default outer gutters (px-6 pb-8). Disable when embedding. */
  padded?: boolean;
  /** Denser layout: one extra column at every width except a phone's. */
  dense?: boolean;
  /** Masonry only: column count at desktop width. */
  targetColumns?: number;
}

/**
 * PostGrid picks between the masonry and uniform-grid layouts. Both layouts
 * reuse the same PostCard, so switching only changes how cards are arranged.
 */
export function PostGrid({
  posts,
  mediaMap,
  categories,
  layout = "masonry",
  padded = true,
  dense = false,
  targetColumns,
}: PostGridProps) {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  if (posts.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-p text-ds-fg-muted">No posts yet</p>
          <p className="text-small text-ds-fg-subtle mt-2">
            Create your first post in the admin panel
          </p>
        </div>
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <UniformGrid posts={posts} mediaMap={mediaMap} categoryMap={categoryMap} padded={padded} dense={dense} />
    );
  }

  return (
    <MasonryGrid
      items={posts.map((post) => ({ kind: "post" as const, id: post.id, post }))}
      mediaMap={mediaMap}
      categoryMap={categoryMap}
      padded={padded}
      dense={dense}
      targetColumns={targetColumns}
    />
  );
}
