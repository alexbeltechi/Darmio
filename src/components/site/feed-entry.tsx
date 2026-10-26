"use client";

import { useEffect, useRef, useState } from "react";
import { Film } from "lucide-react";
import { DsMediaTile } from "@beltechi/parabola";
import { MediaImage } from "@/components/shared/media-image";
import type { Entry, MediaItem } from "@/lib/cms/types";
import {
  getMasonryAspectRatio,
  getPostCategoryLine,
  getPostMediaItems,
  getPreviewText,
  type Category,
} from "./post-grid-shared";

interface FeedEntryProps {
  post: Entry;
  mediaMap: Map<string, MediaItem>;
  categoryMap: Map<string, Category>;
}

/**
 * One entry in the single-column feed: a Parabola DsMediaTile (image, then
 * title, its categories and description, centred; one link, title underlined
 * on hover), the same tile the post page's "More to explore" grid uses.
 *
 * The image reserves its aspect ratio as a stone-50 (`ds-surface-subtle`) box and only mounts once it
 * scrolls near the viewport, so the column fills in as you go. The box is
 * never wider than the image's own pixels, so nothing is enlarged.
 */
export function FeedEntry({ post, mediaMap, categoryMap }: FeedEntryProps) {
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
      { rootMargin: "600px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const mediaItems = getPostMediaItems(post, mediaMap);
  const media = mediaItems[0];

  const aspectRatio = media ? getMasonryAspectRatio(post, mediaItems) : 1;
  const postUrl = `/post/${post.slug}`;
  const title = (post.data.title as string) || post.slug;
  // The caption is the post's first text block, clamped to 3 lines below.
  const description = getPreviewText(post);

  const categories = getPostCategoryLine(post, categoryMap);

  // Tiles render up to 700px — the 600px "thumb" variant would need to be
  // upscaled to fill them (soft/blocky). `media.url` is the "display" variant
  // (2400px), the same source the full-size carousel uses; Next's image
  // optimizer downscales it to whatever the device actually needs, so this
  // only ever shrinks the source, never stretches it.
  const isVideo = media?.mime.startsWith("video/");
  const imageUrl = media ? (isVideo ? media.poster?.url || null : media.url) : null;

  return (
    <DsMediaTile
      ref={containerRef}
      href={postUrl}
      title={title}
      meta={categories || undefined}
      description={description || undefined}
      // Text-only posts (no preview media) skip the image box entirely.
      mediaStyle={
        media
          ? {
              width: aspectRatio >= 1 ? "100%" : `min(${aspectRatio * 100}%, 600px)`,
              // Never wider than the image itself: a small image shows at its
              // own size, centred, rather than being enlarged to fill.
              maxWidth: media.width ? `${media.width}px` : undefined,
              aspectRatio,
            }
          : undefined
      }
      media={
        media && (
          <>
            {isNear && imageUrl ? (
              <MediaImage
                item={media}
                legacySrc={imageUrl}
                alt={title}
                fill
                sizes="(max-width: 740px) calc(100vw - 40px), 700px"
                className={`object-contain transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setIsLoaded(true)}
              />
            ) : null}
            {isNear && !imageUrl ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Film className="size-6 text-ds-fg-subtle" />
              </div>
            ) : null}
          </>
        )
      }
    />
  );
}
