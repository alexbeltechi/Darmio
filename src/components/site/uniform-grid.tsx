"use client";

import { DS_GUTTER_PX } from "@beltechi/parabola";
import type { Entry, MediaItem } from "@/lib/cms/types";
import { PostCard } from "./post-card";
import { getPostMediaItems, type Category } from "./post-grid-shared";

interface UniformGridProps {
  posts: Entry[];
  mediaMap: Map<string, MediaItem>;
  categoryMap: Map<string, Category>;
  /** Include the default outer gutters (px-6 pb-8). Disable when embedding. */
  padded?: boolean;
  /** Denser layout: one extra column at every breakpoint (min 2 on mobile). */
  dense?: boolean;
}

/**
 * Uniform grid layout: a responsive CSS grid where every tile shares the same
 * fixed aspect ratio (see GRID_ASPECT_RATIO) and images are cover-fit so the
 * grid lines up cleanly edge-to-edge.
 */
export function UniformGrid({ posts, mediaMap, categoryMap, padded = true, dense = false }: UniformGridProps) {
  const items = posts
    .map((post) => ({ post, mediaItems: getPostMediaItems(post, mediaMap) }))
    .filter(({ mediaItems }) => mediaItems.length > 0);

  const gridColsClass = dense
    ? "grid-cols-1 @min-[500px]:grid-cols-3 @min-[1300px]:grid-cols-4 @min-[1900px]:grid-cols-5 @min-[2500px]:grid-cols-6"
    : "grid-cols-1 @min-[500px]:grid-cols-2 @min-[1300px]:grid-cols-3 @min-[1900px]:grid-cols-4 @min-[2500px]:grid-cols-5";

  return (
    <div className={`@container ${padded ? "px-6 pb-8" : ""}`}>
      {/* The gutter across and down, as in every gallery and grid. */}
      <div className={`grid ${gridColsClass}`} style={{ gap: `${DS_GUTTER_PX}px` }}>
        {items.map(({ post, mediaItems }) => (
          <PostCard
            key={post.id}
            post={post}
            mediaItems={mediaItems}
            categoryMap={categoryMap}
            layout="grid"
          />
        ))}
      </div>
    </div>
  );
}
