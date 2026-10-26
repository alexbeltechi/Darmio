import type { GalleryBlock, MediaItem } from "@/lib/cms/types";

export type GalleryLayout = NonNullable<GalleryBlock["layout"]>;

/** How wide a gallery runs: see GalleryBlock["width"]. */
export type GalleryWidth = NonNullable<GalleryBlock["width"]>;

/**
 * Unified gallery props used across the application
 */
export interface GalleryProps {
  /** Resolved media items to display */
  mediaItems: MediaItem[];
  
  /** Layout preset */
  layout?: GalleryLayout;
  
  /** For grid layout: number of columns (default: 3) */
  columns?: number;
  
  /** Optional CSS class name */
  className?: string;
    
  /** `auto` (default): inline up to three images, full width for more; `large`/`normal` inline (1024px); `full`. */
  width?: GalleryWidth;
}

