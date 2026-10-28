/**
 * Page formats: what kind of page a page is, and the few settings that come
 * with it (decisions, 2026-10-28). A format is a fixed layout; what's on the
 * page is its blocks, written by hand or by an agent. There is no layout
 * editor: a page picks a format and fills it.
 *
 * - `blocks`: the page is its blocks, full width, with no header. What every
 *   page was before formats, so a page without one is this.
 * - `text`: a title, a line under it, then the blocks in a reading column,
 *   and the pages under it listed at the end. About, an autobiography, a press
 *   kit, a FAQ, ways to work with you.
 * - `home`: the blocks (a portrait, a few lines about you), then, made from
 *   the rest of the site: your latest posts, each page that has pages under
 *   it with those pages, each links page with its links, and the newsletter.
 * - `links`: a title and a list of links, each with a short note. Where to
 *   follow you.
 *
 * Pure (no database), so the admin, the site and the agent API share it.
 */

export const PAGE_FORMATS = ["blocks", "text", "home", "links"] as const;
export type PageFormat = (typeof PAGE_FORMATS)[number];

export const PAGE_FORMAT_LABELS: Record<PageFormat, { label: string; description: string }> = {
  text: { label: "Text", description: "A title, a line under it, then your text in a reading column." },
  home: {
    label: "Home",
    description: "Your intro, then your latest posts, your pages and links, and the newsletter, made from the rest of the site.",
  },
  links: { label: "Links", description: "A title and a list of links, each with a short note." },
  blocks: { label: "Blocks", description: "The page is its blocks, full width, with no title above them." },
};

/** One link on a links page: where it goes, and an optional note on the right (a handle, "free"). */
export type PageLink = { label: string; url: string; note?: string };

/** The newsletter at the foot of a home page. */
export type HomeNewsletter = { heading?: string; text?: string };

/** A page's format settings, read from its data. Anything missing or malformed reads as unset. */
export type PageSettings = {
  format: PageFormat;
  /** The page it sits under (its slug), one level deep. */
  parent?: string;
  /** Top-level only: in the site's nav. */
  nav: boolean;
  /** Links pages. */
  links: PageLink[];
  /** Home: the category whose posts it lists (its slug); the first one in the nav when unset. */
  postsCategory?: string;
  /** Home: the newsletter at its foot; none without it. */
  newsletter?: HomeNewsletter;
};

/** How many posts a home page lists before "All N posts". */
export const HOME_POSTS = 7;

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/** Links as stored, cleaned: a label and a URL each, the note only when given. */
export function parsePageLinks(value: unknown): PageLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { label, url, note } = item as Record<string, unknown>;
    const l = text(label);
    const u = text(url);
    if (!l || !u) return [];
    const n = text(note);
    return [{ label: l, url: u, ...(n ? { note: n } : {}) }];
  });
}

export function pageSettings(data: Record<string, unknown>): PageSettings {
  const format = PAGE_FORMATS.includes(data.format as PageFormat) ? (data.format as PageFormat) : "blocks";
  const parent = text(data.parent);
  const newsletter =
    data.newsletter && typeof data.newsletter === "object"
      ? { heading: text((data.newsletter as HomeNewsletter).heading), text: text((data.newsletter as HomeNewsletter).text) }
      : undefined;
  return {
    format,
    ...(parent ? { parent } : {}),
    nav: !parent && data.nav === true,
    links: parsePageLinks(data.links),
    ...(text(data.postsCategory) ? { postsCategory: text(data.postsCategory) } : {}),
    ...(newsletter && (newsletter.heading || newsletter.text) ? { newsletter } : {}),
  };
}

/** Throws unless `format` is one of PAGE_FORMATS (empty means unset). */
export function parsePageFormat(value: unknown): PageFormat | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (!PAGE_FORMATS.includes(value as PageFormat)) {
    throw new Error(`format must be one of: ${PAGE_FORMATS.join(", ")}`);
  }
  return value as PageFormat;
}

// ---------------------------------------------------------------------------
// Links as Markdown, for agents: one per line, `Label | URL | note`.

export function linksToLines(links: PageLink[]): string[] {
  return links.map((l) => [l.label, l.url, l.note].filter(Boolean).join(" | "));
}

export function linesToLinks(lines: string[]): PageLink[] {
  return parsePageLinks(
    lines.map((line) => {
      const [label, url, ...note] = line.split("|").map((part) => part.trim());
      return { label, url, note: note.join(" | ") };
    })
  );
}

// ---------------------------------------------------------------------------
// Presets: the pages a maker can start from in admin › Pages › New page. Each
// sets a title, URL, format and place, and starts with a line saying what the
// page is for, to replace by hand or by asking your agent.

export type PagePreset = {
  id: string;
  /** In the New page menu. */
  label: string;
  title: string;
  slug: string;
  format: PageFormat;
  parent?: string;
  nav?: boolean;
  description: string;
  /** The starting text: what goes here, as Markdown. */
  starter: string;
  links?: PageLink[];
  newsletter?: HomeNewsletter;
};

const ASK = "Write this page by hand, or ask your agent to write it from your notes.";

export const PAGE_PRESETS: PagePreset[] = [
  {
    id: "home",
    label: "Home",
    title: "Home",
    slug: "home",
    format: "home",
    description: "",
    starter: `Two or three short paragraphs about you, in the third person: what you make, for whom, and where you are. ${ASK}`,
    newsletter: { heading: "Newsletter", text: "A few letters a year about what I'm making." },
  },
  {
    id: "about",
    label: "About",
    title: "About",
    slug: "about",
    format: "text",
    nav: true,
    description: "Who you are, in a few lines.",
    starter: `A short page: who you are, what you make and why, in a few paragraphs, with an image or two. The longer story goes in Autobiography. ${ASK}`,
  },
  {
    id: "autobiography",
    label: "Autobiography",
    title: "Autobiography",
    slug: "autobiography",
    format: "text",
    parent: "about",
    description: "The longer story.",
    starter: `Your story, in the first person: where you started, what changed, what you make now. ${ASK}`,
  },
  {
    id: "press-kit",
    label: "Press kit",
    title: "Press kit",
    slug: "press-kit",
    format: "text",
    parent: "about",
    description: "For anyone writing about you.",
    starter: `## Short bio\n\nOne sentence.\n\n## Long bio\n\nA paragraph.\n\n## Fast facts\n\n- What you make\n- Where you're based\n\n## Contact\n\nHow to reach you. ${ASK}`,
  },
  {
    id: "faq",
    label: "FAQ",
    title: "Frequently asked questions",
    slug: "faq",
    format: "text",
    parent: "about",
    description: "Quick answers to what people ask most.",
    starter: `## The first question people ask\n\nIts answer, in two or three sentences. ${ASK}`,
  },
  {
    id: "follow",
    label: "Follow",
    title: "Follow",
    slug: "follow",
    format: "links",
    description: "Where else to find you.",
    starter: "",
    links: [{ label: "Newsletter", url: "/#newsletter" }],
  },
  {
    id: "work-with-me",
    label: "Work with me",
    title: "Work with me",
    slug: "work-with-me",
    format: "text",
    nav: true,
    description: "The ways to work with you.",
    starter: `## The first way to work with you\n\nWhat it is, who it's for, and how to ask. ${ASK}`,
  },
];

export function pagePreset(id: string | null | undefined): PagePreset | undefined {
  return PAGE_PRESETS.find((p) => p.id === id);
}
