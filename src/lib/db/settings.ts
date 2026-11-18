/**
 * MongoDB Site Settings Storage
 *
 * Global, site-wide settings stored as a single singleton document in the
 * `settings` collection (identified by a fixed key). Holds the site name, the
 * Link back line and the image quality for new uploads, and grows with
 * more settings over time.
 */

import { getDb, Collections } from "@/lib/db/mongodb";
import {
  DS_DEFAULT_LIBRARY,
  dsActiveTheme,
  parseDsThemeConfig,
  parseDsThemeLibrary,
  type DsThemeEntry,
  type DsThemeLibrary,
} from "@beltechi/parabola";
import { DEFAULT_IMAGE_QUALITY } from "@/lib/cms/image-processing";
import { SCHEMA_VERSION } from "@/lib/cms/schema-version";
import { parseSiteName } from "@/lib/cms/site";
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
  /** Presets for a post's "Source:" line. */
  sourceLabels: SourceLabel[];
  sourceLine: SourceLineSettings;
  /** AVIF quality for new uploads (50–90). Uploads already made keep theirs. */
  imageQuality: number;
  /** The project's Parabola themes as saved on /parabola (Save), and which is the site's. */
  themes: DsThemeLibrary;
  /**
   * The theme the website wears, as it was published (Publish on /parabola,
   * or a pick in Settings › Design): its own copy, so saving changes to a
   * theme never touches the site until it's published. Null before the
   * first: the site wears the library's own (`sitePublishedTheme`).
   */
  publishedTheme: DsThemeEntry | null;
  /**
   * The site menu's order, by slug (categories and pages share the site's
   * paths, so a slug names one of either). What it doesn't name follows, in
   * its own order (lib/cms/menu-order.ts). Set by dragging in admin › Pages.
   */
  menuOrder: string[];
  /**
   * Custom pages whose post was deleted on a deployed site, which can't
   * change its own code: their keys, until the site next runs from its
   * folder and removes the code (lib/cms/custom-page-files.ts).
   */
  customPagesToRemove: string[];
  updatedAt: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  // Until the first-run setup names the site.
  siteName: "My site",
  sourceLabels: DEFAULT_SOURCE_LABELS,
  sourceLine: DEFAULT_SOURCE_LINE,
  imageQuality: DEFAULT_IMAGE_QUALITY,
  themes: DS_DEFAULT_LIBRARY,
  publishedTheme: null,
  menuOrder: [],
  customPagesToRemove: [],
  updatedAt: new Date(0).toISOString(),
};

/** The theme the website wears: the one published, or (before any) the library's own. */
export function sitePublishedTheme(settings: Pick<SiteSettings, "themes" | "publishedTheme">): DsThemeEntry {
  return settings.publishedTheme ?? dsActiveTheme(settings.themes);
}

function parsePublishedTheme(value: unknown): DsThemeEntry | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.name !== "string") return null;
  return { id: v.id, name: v.name, theme: parseDsThemeConfig(v.theme) };
}

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

/** A list of slugs, each once, at most 100. Throws on anything else. */
export function parseMenuOrder(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error("menuOrder must be a list of slugs");
  if (value.length > 100) throw new Error("menuOrder can name at most 100 items");
  const slugs = value.map((item) => (typeof item === "string" ? item.trim() : ""));
  if (slugs.some((slug) => !/^[a-z0-9][a-z0-9-]*$/.test(slug))) throw new Error("menuOrder takes slugs: lowercase letters, numbers and dashes");
  return [...new Set(slugs)];
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
    sourceLabels: tryParse(parseSourceLabels, doc.sourceLabels, DEFAULT_SETTINGS.sourceLabels),
    sourceLine: tryParse(parseSourceLine, doc.sourceLine, DEFAULT_SETTINGS.sourceLine),
    imageQuality: tryParse(parseImageQuality, doc.imageQuality, DEFAULT_SETTINGS.imageQuality),
    // `theme` was one theme, before the library; it becomes Default.
    themes: parseDsThemeLibrary(doc.themes, doc.theme),
    publishedTheme: parsePublishedTheme(doc.publishedTheme),
    menuOrder: tryParse(parseMenuOrder, doc.menuOrder, DEFAULT_SETTINGS.menuOrder),
    // The same shape: a list of slugs, each once.
    customPagesToRemove: tryParse(parseMenuOrder, doc.customPagesToRemove, DEFAULT_SETTINGS.customPagesToRemove),
    updatedAt: (doc.updatedAt as string) || DEFAULT_SETTINGS.updatedAt,
  };
}

/**
 * Update (upsert) the site settings. Only known fields are persisted. The
 * version is stamped when the document is first written, and an edit leaves it.
 */
export async function updateSiteSettings(
  updates: Partial<Omit<SiteSettings, "updatedAt">> & {
    /** The library theme the site wears, by id: one it has. It's published as it is. */
    activeTheme?: string;
  }
): Promise<SiteSettings> {
  const db = await getDb();
  const collection = db.collection(Collections.SETTINGS);

  const set: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.siteName !== undefined) {
    set.siteName = parseSiteName(updates.siteName);
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

  if (updates.themes !== undefined) {
    set.themes = parseDsThemeLibrary(updates.themes);
    // Saving themes never changes the site: before anything was published on its own, what the site wears now is.
    if (updates.publishedTheme === undefined) {
      const current = await getSiteSettings();
      if (!current.publishedTheme) set.publishedTheme = sitePublishedTheme(current);
    }
  }

  if (updates.publishedTheme !== undefined) {
    const entry = parsePublishedTheme(updates.publishedTheme);
    if (!entry) throw new Error("A published theme needs an id, a name and a theme");
    set.publishedTheme = entry;
  }

  if (updates.menuOrder !== undefined) {
    set.menuOrder = parseMenuOrder(updates.menuOrder);
  }

  if (updates.customPagesToRemove !== undefined) {
    set.customPagesToRemove = parseMenuOrder(updates.customPagesToRemove);
  }

  if (updates.activeTheme !== undefined) {
    const library = (set.themes as DsThemeLibrary | undefined) ?? (await getSiteSettings()).themes;
    const entry = library.themes.find((t) => t.id === updates.activeTheme);
    if (!entry) throw new Error(`No theme "${updates.activeTheme}"`);
    set.themes = { ...library, active: updates.activeTheme };
    // A pick in Settings › Design is live at once.
    set.publishedTheme = entry;
  }

  await collection.updateOne(
    { key: SETTINGS_KEY },
    { $set: set, $setOnInsert: { key: SETTINGS_KEY, schemaVersion: SCHEMA_VERSION } },
    { upsert: true }
  );

  return getSiteSettings();
}
