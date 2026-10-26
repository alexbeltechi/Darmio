"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/cms/types";
import { DS_GUTTER_PX } from "@beltechi/parabola";
import { aspectOf, galleryColumns, justifiedRows } from "@/lib/cms/justified-rows";
import { cn } from "@/lib/utils";
import { GalleryLightbox } from "../../gallery-lightbox";
import { FadeInOnScroll } from "../../fade-in-on-scroll";
import { GalleryMedia } from "../gallery-media";
import { largestImageUrl } from "@/lib/cms/media-url";

interface AutoLayoutProps {
  mediaItems: MediaItem[];
  /** Runs the page's whole width (more images a row) rather than inline (three a row). */
  full: boolean;
  /** The Stacked layout: one image a row, whatever the count. */
  stacked?: boolean;
  className?: string;
}


/**
 * Auto Gallery Layout
 *
 * Rows that read left to right, at most `galleryColumns` images each (up to
 * three images inline stack one a row; then three a row inline, more at full
 * width), each image at its own shape and each full row filling the
 * width, never enlarged past an image's own pixels (see `justified-rows.ts`).
 * A row that can't fill the width, or a short last row, sits centred. Rows are worked out for
 * the gallery's real width and again whenever it changes; within a row the
 * sizes are percentages, so the page never waits on a measurement to scale.
 */
export function AutoLayout({ mediaItems, full, stacked = false, className }: AutoLayoutProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Until measured (and on the server), lay out for a desktop-width gallery.
  const [containerWidth, setContainerWidth] = useState(1280);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setContainerWidth(Math.round(el.clientWidth) || 1280);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const aspects = mediaItems.map((item) => aspectOf(item.width, item.height));
  // Each image's own height in pixels, so no row is enlarged past it.
  const rows = justifiedRows(
    aspects,
    containerWidth,
    DS_GUTTER_PX,
    mediaItems.map((item) => item.height),
    galleryColumns(containerWidth, full, mediaItems.length, stacked)
  );

  return (
    <>
      <div ref={ref} className={cn("flex w-full flex-col", className)} style={{ gap: `${DS_GUTTER_PX}px` }}>
        {rows.map((row, r) => {
          const total = row.items.reduce((sum, i) => sum + aspects[i], 0);
          return (
            <div key={r} className="flex justify-center" style={{ gap: `${DS_GUTTER_PX}px` }}>
              {row.items.map((i) => {
                const item = mediaItems[i];
                // Each image's share of the gallery's width.
                const share = row.mode === "fill" ? aspects[i] / total : aspects[i] * row.height;
                const width =
                  row.mode === "fill"
                    ? `calc((100% - ${(row.items.length - 1) * DS_GUTTER_PX}px) * ${share})`
                    : `${share * 100}%`;
                return (
                  <div key={item.id} className="min-w-0 shrink-0" style={{ width }}>
                    <FadeInOnScroll>
                      <GalleryMedia
                        item={item}
                        src={largestImageUrl(item)}
                        sizes={`${Math.min(100, Math.ceil(share * 100))}vw`}
                        onClick={() => {
                          setLightboxIndex(i);
                          setLightboxOpen(true);
                        }}
                      />
                    </FadeInOnScroll>
                  </div>
                );
              })}
            </div>
          );
        })}
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
