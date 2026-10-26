"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** The three silhouettes a category tile can take, picked per tile. */
export type CategoryTileShape = "square" | "circle" | "rounded";

const SHAPE_CLASS: Record<CategoryTileShape, string> = {
  square: "rounded-none",
  circle: "rounded-full",
  rounded: "rounded-[16px]",
};

export interface CategoryTileData {
  slug: string;
  label: string;
  color: string;
  count: number;
  shape: CategoryTileShape;
}

/**
 * A square colour block that sits in the masonry alongside the media and links
 * through to its category page. The colour is the category's 500 shade from
 * admin, so the label is always white.
 */
export function CategoryTile({ slug, label, color, count, shape }: CategoryTileData) {
  return (
    <Link
      href={`/${slug}`}
      className={`flex aspect-square w-full items-center justify-center px-4 py-2 text-center transition-opacity hover:opacity-90 ${SHAPE_CLASS[shape]}`}
      style={{ backgroundColor: color }}
    >
      <span className="inline-flex min-w-0 items-center justify-center text-p text-white">
        <span className="truncate">
          {label} ({count})
        </span>
        <ChevronRight className="size-6 shrink-0" />
      </span>
    </Link>
  );
}
