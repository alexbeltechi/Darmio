"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DS_GUTTER_PX } from "@beltechi/parabola";
import type { Entry, MediaItem } from "@/lib/cms/types";
import { PostCard } from "./post-card";
import { CategoryTile, type CategoryTileData } from "./category-tile";
import {
  MAX_ASPECT_RATIO,
  getColumnsForWidth,
  getMasonryAspectRatio,
  getPostMediaItems,
  type Category,
} from "./post-grid-shared";

// The gutter between columns and between tiles within a column, as in every
// gallery and grid.
const GAP_PX = DS_GUTTER_PX;
// Rough height of a post tile's text (title and categories), for balancing
// columns; tiles are estimated at 220px wide.
const TILE_TEXT_PX = 80;

/** A post, or a colour block linking to a category page. */
export type FeedItem =
  | { kind: "post"; id: string; post: Entry }
  | { kind: "category"; id: string; category: CategoryTileData };

// One column per 336px of width, so `target` (5) columns arrive at 1680px and
// each narrower step drops one, down to two on a phone: always a grid.
const MIN_TILE_PX = 336;
// Below this a page is a phone's: `dense` adds no column there.
const PHONE_MAX_PX = 640;
function getRampedColumns(width: number, target: number): number {
  return Math.max(2, Math.min(target, Math.floor(width / MIN_TILE_PX)));
}

interface MasonryGridProps {
  items: FeedItem[];
  mediaMap: Map<string, MediaItem>;
  categoryMap: Map<string, Category>;
  /** Include the default outer gutters. Disable when embedding. */
  padded?: boolean;
  /** Denser layout: one extra column at every width except a phone's, which stays at two. */
  dense?: boolean;
  /** Column count at desktop width; narrower containers step down from it. */
  targetColumns?: number;
  /** Where the columns sit when there are fewer than fit: centred, or from the left under a heading that starts there. */
  align?: "center" | "start";
}

/**
 * Masonry layout: distributes items across responsive columns, always placing
 * the next one in the currently shortest column. Heights are estimated from
 * each item's aspect ratio so columns stay balanced. Columns share a top edge.
 */
export function MasonryGrid({
  items,
  mediaMap,
  categoryMap,
  padded = true,
  dense = false,
  targetColumns,
  align = "center",
}: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Start at the desktop target rather than 1: the server has no width to
  // measure, and a single full-width column would paint one enormous
  // placeholder before the first client measurement corrects it.
  const [columns, setColumns] = useState((targetColumns ?? 3) + (dense ? 1 : 0));


  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateColumns = () => {
      const width = el.clientWidth;
      const base = targetColumns
        ? getRampedColumns(width, targetColumns)
        : getColumnsForWidth(width);
      setColumns(base + (dense && width >= PHONE_MAX_PX ? 1 : 0));
    };

    updateColumns();
    const observer = new ResizeObserver(updateColumns);
    observer.observe(el);
    return () => observer.disconnect();
  }, [dense, targetColumns]);

  const distributeItems = useCallback(() => {
    type Placed = { item: FeedItem; mediaItems: MediaItem[] };
    const columnArrays: Array<Placed[]> = Array.from({ length: columns }, () => []);
    const columnHeights = Array(columns).fill(0);

    items.forEach((item) => {
      let mediaItems: MediaItem[] = [];
      let aspectRatio = 1;

      if (item.kind === "post") {
        mediaItems = getPostMediaItems(item.post, mediaMap);
        if (mediaItems.length === 0) return;
        aspectRatio = getMasonryAspectRatio(item.post, mediaItems) || MAX_ASPECT_RATIO;
      }

      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      columnArrays[shortestColumn].push({ item, mediaItems });
      columnHeights[shortestColumn] += 220 / aspectRatio + (item.kind === "post" ? TILE_TEXT_PX : 0) + GAP_PX;
    });

    return columnArrays;
  }, [items, columns, mediaMap]);

  const columnArrays = distributeItems().filter((columnItems) => columnItems.length > 0);
  const columnWidth = `calc((100% - ${(columns - 1) * GAP_PX}px) / ${columns})`;

  return (
    <div
      ref={containerRef}
      className={`flex items-start ${align === "start" ? "justify-start" : "justify-center"} ${padded ? "px-5" : ""}`}
      style={{ gap: `${GAP_PX}px` }}
    >
      {columnArrays.map((columnItems, columnIndex) => (
        <div
          key={columnIndex}
          className="flex flex-col"
          style={{ width: columnWidth, flex: "0 0 auto", gap: `${GAP_PX}px` }}
        >
          {columnItems.map(({ item, mediaItems }) =>
            item.kind === "post" ? (
              <PostCard
                key={item.id}
                post={item.post}
                mediaItems={mediaItems}
                categoryMap={categoryMap}
                layout="masonry"
              />
            ) : (
              <CategoryTile key={item.id} {...item.category} />
            )
          )}
        </div>
      ))}
    </div>
  );
}
