"use client";

import { useEffect, useRef, useState } from "react";
import { MediaImage } from "@/components/shared/media-image";
import { Film } from "lucide-react";
import { DsMediaTile } from "@beltechi/parabola";
import type { Entry, MediaItem } from "@/lib/cms/types";
import {
  GRID_ASPECT_RATIO,
  getMasonryAspectRatio,
  getPostCategoryLine,
  type Category,
  type GridLayout,
} from "./post-grid-shared";

interface PostCardProps {
  post: Entry;
  mediaItems: MediaItem[];
  categoryMap: Map<string, Category>;
  /** Layout mode. In "grid", tiles use a fixed square ratio. */
  layout?: GridLayout;
}

/**
 * A post in a grid (the post page's "More to explore"): the same Parabola
 * DsMediaTile as the home feed, so the two always match: a square-cornered image,
 * then the title and its categories (no description; grid columns are
 * narrow). One link, title underlined on hover.
 *
 * The tile reserves its aspect ratio immediately and only mounts the image
 * once it scrolls near the viewport, so a long grid fills in as a ladder of
 * placeholders rather than a wall of pending requests.
 */
export function PostCard({ post, mediaItems, categoryMap, layout = "masonry" }: PostCardProps) {
  const isGrid = layout === "grid";
  const containerRef = useRef<HTMLElement>(null);
  const [isNear, setIsNear] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      // Stay ahead of the scroll without fetching the whole grid at once.
      { rootMargin: "400px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const media = mediaItems[0];
  if (!media) return null;

  const aspectRatio = isGrid ? GRID_ASPECT_RATIO : getMasonryAspectRatio(post, mediaItems);
  const title = (post.data.title as string) || post.slug;
  const categories = getPostCategoryLine(post, categoryMap);

  const isVideo = media.mime.startsWith("video/");
  const imageUrl = isVideo
    ? media.poster?.url || null
    : media.variants?.medium?.url || media.variants?.display?.url || media.url;

  return (
    <DsMediaTile
      ref={containerRef}
      href={`/post/${post.slug}`}
      title={title}
      meta={categories || undefined}
      mediaStyle={{ aspectRatio }}
      media={
        <>
          {isNear && imageUrl ? (
            // The image sits centred in the tile, fitted and never larger
            // than its own pixels (a small logo stays small).
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative max-h-full"
                style={{
                  width: media.width ? `min(100%, ${media.width}px)` : "100%",
                  aspectRatio: media.width && media.height ? `${media.width} / ${media.height}` : undefined,
                  height: media.width && media.height ? undefined : "100%",
                }}
              >
                <MediaImage
                  item={media}
                  legacySrc={imageUrl}
                  alt={title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 400px"
                  className={`object-contain transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setIsLoaded(true)}
                />
              </div>
            </div>
          ) : null}
          {isNear && !imageUrl ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Film className="size-6 text-ds-fg-subtle" />
            </div>
          ) : null}
        </>
      }
    />
  );
}
