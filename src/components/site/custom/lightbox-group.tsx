"use client";

import { createContext, useContext, useState } from "react";
import { GalleryLightbox } from "@/components/shared/gallery-lightbox";
import type { MediaItem } from "@/lib/cms/types";

const OpenAt = createContext<(index: number) => void>(() => {});

/**
 * The site's full-screen viewer for a custom page: wrap the part of the page
 * that shows these files, and any `LightboxButton` inside opens the viewer
 * at its file and cycles through the rest. The same viewer the standard
 * layout's galleries open, so pictures behave the same on every page.
 */
export function LightboxGroup({ items, children }: { items: MediaItem[]; children: React.ReactNode }) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  return (
    <OpenAt.Provider value={setOpenAt}>
      {children}
      <GalleryLightbox mediaItems={items} initialIndex={openAt ?? 0} isOpen={openAt !== null} onClose={() => setOpenAt(null)} />
    </OpenAt.Provider>
  );
}

/** Whatever it wraps opens the viewer at the group's file number `index`. */
export function LightboxButton({
  index,
  label,
  className,
  style,
  children,
}: {
  index: number;
  /** What the picture shows, for someone who can't see it. */
  label: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const openAt = useContext(OpenAt);
  return (
    <button type="button" aria-label={`Open: ${label}`} onClick={() => openAt(index)} className={className} style={style}>
      {children}
    </button>
  );
}
