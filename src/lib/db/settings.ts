/**
 * MongoDB Site Settings Storage
 *
 * Global, site-wide settings stored as a single singleton document in the
 * `settings` collection (identified by a fixed key). Holds the site name, the
 * original post link and the image quality for new uploads, and grows with
 * more settings over time.
 */

import { getDb, Collections } from "@/lib/db/mongodb";
import { DS_DEFAULT_THEME, parseDsThemeConfig, type DsThemeConfig } from "@beltechi/parabola";
import { DEFAULT_IMAGE_QUALITY } from "@/lib/cms/image-processing";
import { parseHomeHero, parseSiteName, type HomeHero } from "@/lib/cms/site";
import {
  DEFAULT_SOURCE_LABELS,
  DEFAULT_SOURCE_LINE,
  isPlatform,
  type SourceLabel,
  type SourceLineSettings,
} from "@/lib/integrations/types";

export const SETTINGS_KEY = "site";

export interface SiteSettings {
  /** The brand: the admin's mark, the site's logo, the footer, browser titles. */
  siteName: string;
  /** The homepage's headline over the feed; null shows the feed alone. */
  homeHero: HomeHero | null;
  /** Presets for a post's "Source:" line. */
  sourceLabels: SourceLabel[];
  sourceLine: SourceLineSettings;
  /** AVIF quality for new uploads (50–90). Uploads already made keep theirs. */
  imageQuality: number;
  /** The Parabola theme the site and admin wear: fonts for now (Settings › Design). */
  theme: DsThemeConfig;
  updatedAt: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  // Until the first-run setup names the site.
  siteName: "My site",
  homeHero: null,
  sourceLabels: DEFAULT_SOURCE_LABELS,
  sourceLine: DEFAULT_SOURCE_LINE,
  imageQuality: DEFAULT_IMAGE_QUALITY,
  theme: DS_DEFAULT_THEME,
  updatedAt: new Date(0).toISOString(),
};

/**
 * Clean a source label list: trimmed names (1–40 chars), unique ids, at most
 * one label per platform. Throws on anything that isn't a list of labels.
 */
export function parseSourceLabels(value: unknown): SourceLabel[] {
  if (!Array.isArray(value)) throw new Error("sourceLabels must be a list");
  if (value.length > 30) throw new Error("At most 30 source labels");

  const ids = new Set<string>();
  const platforms = new Set<string>();
  return value.map((item) => {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const id = typeof item?.id === "string" ? item.id.trim() : "";
    if (!name || name.length > 40) throw new Error("Source label names need 1–40 characters");
    if (!id || ids.has(id)) throw new Error("Source labels need unique ids");
    ids.add(id);

    const platform = isPlatform(item.platform) && !platforms.has(item.platform) ? item.platform : null;
    if (platform) platforms.add(platform);
    return { id, name, platform };
  });
}

export function parseSourceLine(value: unknown): SourceLineSettings {
  const v = (value ?? {}) as Record<string, unknown>;
  if (typeof v.enabled !== "boolean") throw new Error("sourceLine.enabled must be true or false");
  const prefix = typeof v.prefix === "string" ? v.prefix.trim() : "";
  if (prefix.length > 40) throw new Error("The source line text can be at most 40 characters");
  return { enabled: v.enabled, prefix };
}

export function parseImageQuality(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 50 || value > 90) {
    throw new Error("imageQuality must be a whole number from 50 to 90");
  }
  return value;
}

function tryParse<T>(parse: (v: unknown) => T, value: unknown, fallback: T): T {
  if (value === undefined) return fallback;
  try {
    return parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Read the site settings, falling back to defaults for any missing fields.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const db = await getDb();
  const collection = db.collection(Collections.SETTINGS);

  const doc = await collection.findOne({ key: SETTINGS_KEY });
  if (!doc) return { ...DEFAULT_SETTINGS };

  return {
    siteName: tryParse(parseSiteName, doc.siteName, DEFAULT_SETTINGS.siteName),
    homeHero: tryParse(parseHomeHero, doc.homeHero, DEFAULT_SETTINGS.homeHero),
    sourceLabels: tryParse(parseSourceLabels, doc.sourceLabels, DEFAULT_SETTINGS.sourceLabels),
    sourceLine: tryParse(parseSourceLine, doc.sourceLine, DEFAULT_SETTINGS.sourceLine),
    imageQuality: tryParse(parseImageQuality, doc.imageQuality, DEFAULT_SETTINGS.imageQuality),
    theme: parseDsThemeConfig(doc.theme),
    updatedAt: (doc.updatedAt as string) || DEFAULT_SETTINGS.updatedAt,
  };
}

/**
 * Update (upsert) the site settings. Only known fields are persisted.
 */
export async function updateSiteSettings(
  updates: Partial<Omit<SiteSettings, "updatedAt">>
): Promise<SiteSettings> {
  const db = await getDb();
  const collection = db.collection(Collections.SETTINGS);

  const set: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.siteName !== undefined) {
    set.siteName = parseSiteName(updates.siteName);
  }

  if (updates.homeHero !== undefined) {
    set.homeHero = parseHomeHero(updates.homeHero);
  }

  if (updates.sourceLabels !== undefined) {
    set.sourceLabels = parseSourceLabels(updates.sourceLabels);
  }

  if (updates.sourceLine !== undefined) {
    set.sourceLine = parseSourceLine(updates.sourceLine);
  }

  if (updates.imageQuality !== undefined) {
    set.imageQuality = parseImageQuality(updates.imageQuality);
  }

  if (updates.theme !== undefined) {
    set.theme = parseDsThemeConfig(updates.theme);
  }

  await collection.updateOne(
    { key: SETTINGS_KEY },
    { $set: set, $setOnInsert: { key: SETTINGS_KEY } },
    { upsert: true }
  );

  return getSiteSettings();
}
