/**
 * How a view's intro is set. What each section says and how it's laid out
 * lives on its category (headline, description, layout). The homepage is
 * the posts, or a page with the slug "home".
 */
import type { CategoryLayout } from "@/lib/cms/types";

export interface ViewIntro {
  title: string;
  description?: string;
}

/**
 * Where a category view's intro sits relative to its feed column:
 * - hero: a big headline above the feed, fading as it scrolls
 * - left: sticky text column to the left of the feed
 * - wall: no intro, just a masonry grid of every post
 */
export type IntroLayout = CategoryLayout;
