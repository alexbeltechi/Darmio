"use client";

import { useState } from "react";
import type { MediaItem } from "@/lib/cms/types";
import { DS_GUTTER_PX } from "@beltechi/parabola";
import { cn } from "@/lib/utils";
import { GalleryLightbox } from "../../gallery-lightbox";
import { FadeInOnScroll } from "../../fade-in-on-scroll";
import { GalleryMedia, GalleryRow } from "../gallery-media";
import { largestImageUrl } from "@/lib/cms/media-url";

interface GridLayoutProps {
  mediaItems: MediaItem[];
  columns?: number;
  className?: string;
}

/**
 * Grid Gallery Layout
 * 
 * Fixed column grid with equal spacing and aspect ratios
 */

export function GridLayout({ 
  mediaItems, 
  columns = 3,
  className,
}: GridLayoutProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // The gutter between images at every width, as in every gallery and grid (DS_GUTTER_PX).
  const effectiveGap = DS_GUTTER_PX;

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const rows: MediaItem[][] = [];
  for (let i = 0; i < mediaItems.length; i += columns) {
    rows.push(mediaItems.slice(i, i + columns));
  }

  return (
    <>
      <div className={cn("flex flex-col", className)} style={{ gap: `${effectiveGap}px` }}>
        {rows.map((row, rowIndex) => (
          <GalleryRow
            key={rowIndex}
            items={row}
            columns={columns}
            gap={effectiveGap}
            renderItem={(item) => (
              <FadeInOnScroll>
                <GalleryMedia
                  item={item}
                  src={largestImageUrl(item)}
                  sizes={`${Math.round(100 / columns)}vw`}
                  onClick={() => handleImageClick(mediaItems.indexOf(item))}
                />
              </FadeInOnScroll>
            )}
          />
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

