"use client";

import Image from "next/image";
import type { MediaItem } from "@/lib/cms/types";

interface MediaImageProps {
  item: MediaItem;
  alt: string;
  /** Which width the image renders at, as for any srcset, e.g. "(max-width: 640px) 50vw, 400px". */
  sizes: string;
  /** Fill the nearest positioned parent, like next/image's `fill`. Otherwise it's sized by the item's own width and height. */
  fill?: boolean;
  className?: string;
  priority?: boolean;
  draggable?: boolean;
  onLoad?: () => void;
  /** Uploads made before renditions (and video posters): the file to serve through next/image, as before. */
  legacySrc?: string;
  /** next/image quality, for the legacy path only. */
  quality?: number;
}

/**
 * An uploaded image on the page. Uploads with renditions are a plain
 * <picture>: the AVIF renditions as one srcset, so the browser picks the
 * width it needs, and the JPEG/PNG fallback for browsers without AVIF. The
 * files were made at upload, so nothing is resized on request (no Vercel
 * image service). Older uploads go through next/image as they always did.
 */
export function MediaImage({
  item,
  alt,
  sizes,
  fill,
  className,
  priority,
  draggable,
  onLoad,
  legacySrc,
  quality = 80,
}: MediaImageProps) {
  const renditions = item.renditions;
  const width = item.width || 1200;
  const height = item.height || 800;

  if (!renditions?.length) {
    const src = legacySrc || item.url;
    return fill ? (
      <Image src={src} alt={alt} fill sizes={sizes} quality={quality} priority={priority} draggable={draggable} className={className} onLoad={onLoad} />
    ) : (
      <Image src={src} alt={alt} width={width} height={height} sizes={sizes} quality={quality} priority={priority} draggable={draggable} className={className} onLoad={onLoad} />
    );
  }

  const fallback = item.fallback ?? renditions[renditions.length - 1];

  return (
    <picture>
      <source type="image/avif" srcSet={renditions.map((r) => `${r.url} ${r.width}w`).join(", ")} sizes={sizes} />
      {/* A plain <img>: the renditions are already sized, next/image would resize them again. */}
      <img
        // A server-rendered image can finish loading before React attaches
        // onLoad. Reported once per image: this runs again on every render.
        ref={(el) => {
          if (el?.complete && el.naturalWidth && !el.dataset.loaded) {
            el.dataset.loaded = "1";
            onLoad?.();
          }
        }}
        src={fallback.url}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        draggable={draggable}
        className={className}
        style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : undefined}
        onLoad={(e) => {
          if (!e.currentTarget.dataset.loaded) {
            e.currentTarget.dataset.loaded = "1";
            onLoad?.();
          }
        }}
      />
    </picture>
  );
}
