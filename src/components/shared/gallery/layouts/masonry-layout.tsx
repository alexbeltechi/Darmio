"use client";

import { useState, useCallback, useEffect } from "react";
import type { MediaItem } from "@/lib/cms/types";
import { DS_GUTTER_PX } from "@beltechi/parabola";
import { cn } from "@/lib/utils";
import { GalleryLightbox } from "../../gallery-lightbox";
import { FadeInOnScroll } from "../../fade-in-on-scroll";
import { GalleryMedia } from "../gallery-media";
import { largestImageUrl } from "@/lib/cms/media-url";

interface MasonryLayoutProps {
  mediaItems: MediaItem[];
  /** Maximum columns at largest breakpoint (default: 5) */
  maxColumns?: number;
  className?: string;
}

/**
 * Masonry Gallery Layout
 * 
 * Pinterest-style staggered layout where images maintain their original aspect ratios
 * and are distributed across columns to minimize gaps.
 * 
 * Uses responsive column counts based on viewport (like homepage PostGrid):
 * - < 640px:  2 columns (capped by maxColumns)
 * - < 1024px: 3 columns (capped by maxColumns)
 * - < 1280px: 4 columns (capped by maxColumns)
 * - < 1680px: 5 columns (capped by maxColumns)
 * - >= 1680px: 6 columns (capped by maxColumns)
 */


/**
 * Get responsive column count based on viewport width, capped by maxColumns
 */
function getResponsiveColumns(viewportWidth: number, maxColumns: number): number {
  let baseColumns: number;
  if (viewportWidth < 640) baseColumns = 2;
  else if (viewportWidth < 1024) baseColumns = 3;
  else if (viewportWidth < 1280) baseColumns = 4;
  else if (viewportWidth < 1680) baseColumns = 5;
  else baseColumns = 6;
  
  return Math.min(baseColumns, maxColumns);
}

export function MasonryLayout({ 
  mediaItems, 
  maxColumns = 5,
  className,
}: MasonryLayoutProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [columnArrays, setColumnArrays] = useState<MediaItem[][]>([]);
  const [columns, setColumns] = useState(maxColumns);

  // Responsive column count based on viewport (like homepage)
  useEffect(() => {
    const updateColumns = () => {
      setColumns(getResponsiveColumns(window.innerWidth, maxColumns));
    };
    
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, [maxColumns]);

  // The gutter, as in every gallery and grid.
  const effectiveGap = DS_GUTTER_PX;

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Distribute images into columns based on aspect ratios
  // This creates a balanced masonry layout by tracking column heights
  const distributeItems = useCallback(() => {
    if (!mediaItems || mediaItems.length === 0) return [];

    const columnArrays: MediaItem[][] = Array.from({ length: columns }, () => []);
    const columnHeights = Array(columns).fill(0);

    mediaItems.forEach((item) => {
      const aspectRatio = item.width && item.height ? item.width / item.height : 1;
      // Assume a base width for calculation (doesn't matter, just need relative heights)
      const estimatedHeight = 300 / aspectRatio;

      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      
      columnArrays[shortestColumn].push(item);
      
      // Update column height (including gap)
      columnHeights[shortestColumn] += estimatedHeight + effectiveGap;
    });

    return columnArrays;
  }, [mediaItems, columns, effectiveGap]);

  useEffect(() => {
    setColumnArrays(distributeItems());
  }, [distributeItems]);

  return (
    <>
      <div 
        className={cn("flex items-start", className)}
        style={{
          gap: `${effectiveGap}px`,
        }}
      >
        {columnArrays.map((columnItems, columnIndex) => (
          <div
            key={columnIndex}
            className="flex flex-col flex-1"
            style={{
              gap: `${effectiveGap}px`,
            }}
          >
            {columnItems.map((item) => {
              // Find the original index in the full mediaItems array for lightbox
              const originalIndex = mediaItems.findIndex((m) => m.id === item.id);
              const imageSrc = largestImageUrl(item);
              
              const imageSizes = `${Math.round(100 / columns)}vw`;

              return (
                <FadeInOnScroll key={item.id}>
                  <GalleryMedia
                    item={item}
                    src={imageSrc}
                    sizes={imageSizes}
                    onClick={() => handleImageClick(originalIndex)}
                  />
                </FadeInOnScroll>
              );
            })}
          </div>
        ))}
      </div>
      <GalleryLightbox
        mediaItems={mediaItems}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

