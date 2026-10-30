"use client";

import type { GalleryProps } from "./types";
import { AutoLayout } from "./layouts/auto-layout";
import { GridLayout } from "./layouts/grid-layout";
import { MasonryLayout } from "./layouts/masonry-layout";
import { galleryIsFull, galleryMaxWidth } from "@/lib/cms/justified-rows";

/**
 * Universal Gallery Component
 * 
 * A flexible gallery that works across the CMS:
 * - Articles & Posts (content blocks)
 * - Custom Pages (page builder)
 * - Any other content type
 * 
 * Supports multiple layout presets inspired by WordPress galleries.
 */
export function Gallery({
  mediaItems,
  layout = "auto",
  columns = 3,
  className,
  width = "normal",
}: GalleryProps) {
  if (!mediaItems || mediaItems.length === 0) {
    return (
      <div className="rounded-ds-lg bg-ds-surface-subtle p-8 text-center text-p text-ds-fg-muted">
        No images in gallery
      </div>
    );
  }

  const renderLayout = () => {
    switch (layout) {
      case "auto":
        return <AutoLayout mediaItems={mediaItems} full={galleryIsFull(width, mediaItems.length)} className={className} />;

      case "stack":
        return (
          <AutoLayout mediaItems={mediaItems} full={galleryIsFull(width, mediaItems.length)} stacked className={className} />
        );

      case "grid":
        return (
          <GridLayout
            mediaItems={mediaItems}
            columns={columns}
           
            className={className}
          />
        );

      case "masonry":
        return (
          <MasonryLayout
            mediaItems={mediaItems}
            maxColumns={columns}
           
            className={className}
          />
        );

      default:
        return <AutoLayout mediaItems={mediaItems} full={galleryIsFull(width, mediaItems.length)} className={className} />;
    }
  };

  // Stacked at the reading width, side by side up to INLINE_GALLERY_MAX (centred), or the
  // page's whole width inside its side margins (galleryMaxWidth).
  const maxWidth = galleryMaxWidth(layout, width, mediaItems.length);
  return (
    <div className="mx-auto w-full" style={maxWidth === undefined ? undefined : { maxWidth }}>
      {renderLayout()}
    </div>
  );
}

