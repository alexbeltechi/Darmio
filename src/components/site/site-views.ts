/**
 * Intro copy and placement for each top-level view. Hardcoded for now; each
 * category view is a list of sections so a view can later be split into
 * several groups of posts, each with its own sticky intro.
 */

export interface ViewIntro {
  title: string;
  description?: string;
}

/**
 * Where a category view's intro sits relative to its feed column:
 * - hero: the homepage's PageHero above the feed, fading as it scrolls
 * - left: sticky text column to the left of the feed
 * - wall: no intro, just a masonry grid of every post (same as "More to explore")
 */
export type IntroLayout = "hero" | "left" | "wall";

/** Homepage hero (Figma 602:2410): big display line plus a CTA into Design. */
export const HOME_HERO = {
  title: "I design and build with founders, creators and product teams",
  cta: { label: "See my work", href: "/design" },
};

export const CATEGORY_VIEWS: Record<string, { layout: IntroLayout; intro: ViewIntro }> = {
  design: {
    layout: "left",
    intro: {
      title: "I design with founders, creators and product teams",
      description:
        "I'm Alex. I have over 20 years of design experience working with startups and organisations to launch and grow",
    },
  },
  photography: {
    layout: "wall",
    intro: {
      title: "I document people, places and moments through photography, film and video",
    },
  },
  journal: {
    layout: "hero",
    intro: {
      title: "I work remotely, between Bucharest and my cabin in Transylvania",
    },
  },
};
