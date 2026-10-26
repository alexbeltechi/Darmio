"use client";

import Link from "next/link";
import { FixedFadeHeader } from "./fixed-fade-header";

interface PostHeaderProps {
  title: string;
  categories: { id: string; slug: string; label: string }[];
  dateLabel: string;
}

/** Pinned post date, title (Display on large screens) and categories, fading out as the article scrolls up under it. */
export function PostHeader({ title, categories, dateLabel }: PostHeaderProps) {
  return (
    <FixedFadeHeader className="px-ds-20 pt-ds-80 pb-ds-40 sm:pt-ds-160 sm:pb-ds-80">
      <header className="mx-auto flex max-w-[661px] flex-col items-center gap-ds-8 text-center lg:max-w-[1000px]">
        <p className="text-p text-ds-fg-muted">{dateLabel}</p>
        <h1 className="text-h2 break-words text-ds-fg sm:text-h1 lg:text-display">
          {title}
        </h1>
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-ds-8 text-h3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/${category.slug}`}
                className="text-ds-fg underline transition-opacity hover:opacity-70"
              >
                {category.label}
              </Link>
            ))}
          </div>
        )}
      </header>
    </FixedFadeHeader>
  );
}
