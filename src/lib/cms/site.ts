/**
 * The site's name, as settings store it and the shell shows it. Pure, so the
 * admin shell (a client) and the settings storage share one rule.
 */

export const SITE_NAME_MAX = 60;

/** A clean site name, or a thrown reason. */
export function parseSiteName(value: unknown): string {
  if (typeof value !== "string") throw new Error("siteName must be text");
  const name = value.trim();
  if (!name || name.length > SITE_NAME_MAX) {
    throw new Error(`The site name needs 1–${SITE_NAME_MAX} characters`);
  }
  return name;
}

/** The mark the admin rail wears: the name's first character, upper-cased. */
export function siteInitial(name: string): string {
  return (Array.from(name.trim())[0] ?? "").toUpperCase();
}

/** The homepage's headline over the feed, with an optional button. */
export type HomeHero = { title: string; ctaLabel?: string; ctaHref?: string };

/** A clean home headline, null to have none, or a thrown reason. */
export function parseHomeHero(value: unknown): HomeHero | null {
  if (value === null || value === undefined) return null;
  const v = value as Record<string, unknown>;
  const text = (key: string, max: number) => {
    const t = typeof v[key] === "string" ? (v[key] as string).trim() : "";
    if (t.length > max) throw new Error(`homeHero.${key} can be at most ${max} characters`);
    return t;
  };
  const title = text("title", 200);
  if (!title) return null;
  const ctaLabel = text("ctaLabel", 40);
  const ctaHref = text("ctaHref", 300);
  if (Boolean(ctaLabel) !== Boolean(ctaHref)) throw new Error("The home button needs both a label and a link");
  if (ctaHref && !/^(\/|https?:\/\/)/.test(ctaHref)) throw new Error("The home button's link starts with / or http");
  return { title, ...(ctaLabel ? { ctaLabel, ctaHref } : {}) };
}
