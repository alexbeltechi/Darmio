"use client";

import { useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import type { MediaItem } from "@/lib/cms/types";
import { MediaImage } from "../media-image";

const MAX_HEIGHT = 1200;

/** Widest a tile may render: its natural width, or whatever keeps it ≤1200px tall. */
function maxTileWidth(item: MediaItem): string {
  const width = item.width || 1200;
  const height = item.height || 800;
  return `min(${width}px, ${Math.round((MAX_HEIGHT * width) / height)}px)`;
}

interface GalleryRowProps {
  items: MediaItem[];
  /** Column count the row is laid out on; a short last row keeps the same tile width. */
  columns: number;
  gap: number;
  renderItem: (item: MediaItem) => ReactNode;
}

/**
 * One row of tiles. Each tile takes a column's width unless its size cap
 * makes it narrower, and the row is centred as a group, so capped images sit
 * `gap` apart instead of drifting to the centre of their own columns.
 */
export function GalleryRow({ items, columns, gap, renderItem }: GalleryRowProps) {
  const basis = `calc((100% - ${(columns - 1) * gap}px) / ${columns})`;
  return (
    <div className="flex items-start justify-center" style={{ gap: `${gap}px` }}>
      {items.map((item) => (
        <div
          key={item.id}
          className="min-w-0"
          style={{ flex: `0 1 ${basis}`, maxWidth: maxTileWidth(item) }}
        >
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

interface GalleryMediaProps {
  item: MediaItem;
  src: string;
  sizes: string;
  onClick?: () => void;
}

/**
 * One gallery tile, centred in its column. It fills the column's width but
 * never grows past the media's natural width (no upscaling) or 1200px tall.
 * The frame reserves the exact shape as a grey box, a blurred preview fades
 * in at 30% opacity, then the real image fades in over it. The image is
 * fitted, never cropped: if the stored size is off (or missing), it shows
 * whole inside the frame instead of losing its edges.
 *
 * Videos render as a muted inline <video> showing their poster with a play
 * badge; clicking opens the gallery's full-screen viewer, which plays them.
 */
export function GalleryMedia({ item, src, sizes, onClick }: GalleryMediaProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const width = item.width || 1200;
  const height = item.height || 800;
  const isVideo = item.mime.startsWith("video/");

  return (
    <div
      className="relative mx-auto w-full cursor-pointer overflow-hidden bg-ds-surface-subtle"
      style={{ aspectRatio: `${width} / ${height}`, maxWidth: maxTileWidth(item) }}
      onClick={onClick}
    >
      {isVideo ? (
        <>
          <video
            src={item.url}
            poster={item.poster?.url}
            muted
            playsInline
            preload="metadata"
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
          <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
            <Play className="size-5 fill-current" />
          </span>
        </>
      ) : (
        <>
          {item.blurDataURL && (
            <img
              src={item.blurDataURL}
              alt=""
              aria-hidden
              className={`absolute inset-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-300 ${
                isLoaded ? "opacity-0" : "opacity-30"
              }`}
            />
          )}
          <MediaImage
            item={item}
            legacySrc={src}
            alt={item.alt || item.originalName}
            fill
            className={`object-contain transition-opacity duration-500 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            sizes={sizes}
            onLoad={() => setIsLoaded(true)}
          />
        </>
      )}
    </div>
  );
}
