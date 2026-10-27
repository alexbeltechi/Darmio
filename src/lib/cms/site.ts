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

