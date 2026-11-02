/**
 * Example sites: a site a fresh install can start as, and take out again in
 * one action. Each is a folder in `seed/<name>/`: `site.json` (its name, a
 * label and one line for the setup screen, and its categories), `media/` (the
 * images and videos), and `posts/*.md` and `pages/*.md` in the agent's
 * Markdown format (lib/agent/markdown.ts), pages in file-name order, which is
 * the order they're listed in. An image is written `![alt](file:name.jpg)`
 * and a video `::video media=file:name.mp4`, and each becomes that upload.
 *
 * Loaded from the setup screen, Settings › Examples or `npm run seed -- <name>`.
 * Everything is published and marked as an example (`metadata.example`), and
 * anything already there (a category or an entry with the same slug) is left
 * alone, so loading twice changes nothing. Server only: it reads the folder.
 */

import { promises as fs } from "fs";
import path from "path";
import { uploadMedia, deleteMedia } from "./media";
import { isExample, planExampleRemoval } from "./examples-plan";
import { parsePostMarkdown } from "@/lib/agent/markdown";
import { metaToData } from "@/lib/agent/post-markdown-io";
import { createCategory, deleteCategory, listCategories, parseCategoryLayout } from "@/lib/db/categories";
import { countExampleEntries, createEntry, deleteEntry, getEntry, listAllEntries } from "@/lib/db/entries";
import { listExampleMedia } from "@/lib/db/media";
import { getCurrentProject } from "@/lib/db/mongodb";
import { deletePageBelongings, pageDeletionPlan } from "@/lib/db/page-cascade";
import { updateProject } from "@/lib/db/projects";
import { DEFAULT_SETTINGS, getSiteSettings, updateSiteSettings } from "@/lib/db/settings";

// Next copies the folder into the server build for the routes that read it (next.config.ts).
const SEED_DIR = path.join(process.cwd(), "seed");

/** Prevent two concurrent example loads on the same server instance. */
let exampleLoadInProgress = false;

type SeedSite = {
  siteName?: string;
  /** What the setup screen and Settings call it ("… site"). */
  label?: string;
  /** One line on what's in it. */
  about?: string;
  categories?: {
    slug: string;
    label: string;
    layout?: string;
    nav?: boolean;
    headline?: string;
    description?: string;
    /** The top-level category it sits inside (its slug), listed before it. */
    parent?: string;
  }[];
};

/** An example site as the setup screen and Settings offer it; `entries` is how many posts and pages it has. */
export type ExampleSite = { name: string; label: string; about?: string; entries: number };

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

async function readSeed(name: string): Promise<SeedSite> {
  return JSON.parse(await fs.readFile(path.join(SEED_DIR, name, "site.json"), "utf8")) as SeedSite;
}

async function markdownFiles(name: string, collection: "posts" | "pages"): Promise<string[]> {
  const files = await fs.readdir(path.join(SEED_DIR, name, collection)).catch(() => []);
  return files.filter((f) => f.endsWith(".md")).sort();
}

/** Every example site this install carries, by folder name. */
export async function listExampleSites(): Promise<ExampleSite[]> {
  const folders = await fs.readdir(SEED_DIR, { withFileTypes: true }).catch(() => []);
  const sites: ExampleSite[] = [];
  for (const folder of folders.filter((f) => f.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const site = await readSeed(folder.name).catch(() => null);
    if (!site) continue;
    const entries = (await markdownFiles(folder.name, "posts")).length + (await markdownFiles(folder.name, "pages")).length;
    sites.push({ name: folder.name, label: site.label || site.siteName || folder.name, ...(site.about ? { about: site.about } : {}), entries });
  }
  return sites;
}

/** The example site `value` names, or a thrown reason with the ones there are. */
export async function parseExampleName(value: unknown): Promise<string> {
  const names = (await listExampleSites()).map((site) => site.name);
  if (typeof value !== "string" || !names.includes(value)) {
    throw new Error(`example must be one of: ${names.join(", ") || "(none in this install)"}`);
  }
  return value;
}

/** One name: the site's name is also its project's (as Settings › Project saves it). */
async function nameSite(siteName: string) {
  const settings = await updateSiteSettings({ siteName });
  const project = await getCurrentProject();
  if (project && project.name !== settings.siteName) await updateProject(project.slug, { name: settings.siteName });
}

export type ExampleCounts = { posts: number; pages: number; categories: number; media: number };

/**
 * Load an example site into the current project. It takes the example's name
 * only while the site still has the name setup gave it, so a site someone
 * already named keeps theirs. `log` hears each step (the script prints them).
 */
export async function loadExampleSite(name: string, log: (line: string) => void = () => {}): Promise<ExampleCounts> {
  if (exampleLoadInProgress) {
    throw new Error("An example load is already in progress");
  }
  exampleLoadInProgress = true;
  try {
  const dir = path.join(SEED_DIR, await parseExampleName(name));
  const site = await readSeed(name);
  const source = { origin: "script" as const, batchId: `seed-${name}`, ingestedAt: new Date().toISOString() };
  const metadata = { example: true, seed: name };
  const made: ExampleCounts = { posts: 0, pages: 0, categories: 0, media: 0 };

  if (site.siteName && (await getSiteSettings()).siteName === DEFAULT_SETTINGS.siteName) {
    await nameSite(site.siteName);
    log(`Site name: ${site.siteName}`);
  }

  let categories = await listCategories();
  for (const c of site.categories ?? []) {
    if (categories.some((existing) => existing.slug === c.slug)) {
      log(`Category ${c.slug}: already there`);
      continue;
    }
    const parentId = c.parent ? categories.find((existing) => existing.slug === c.parent)?.id : undefined;
    if (c.parent && !parentId) throw new Error(`Category ${c.slug}: no "${c.parent}" to sit inside (list it first)`);
    await createCategory({
      slug: c.slug,
      name: c.label,
      label: c.label,
      color: "stone",
      nav: c.nav ?? true,
      headline: c.headline,
      description: c.description,
      layout: parseCategoryLayout(c.layout),
      metadata,
      ...(parentId ? { parentId } : {}),
    });
    made.categories++;
    log(`Category ${c.slug}: made`);
    categories = await listCategories();
  }
  const categoryId = (slug: string) => {
    const found = categories.find((c) => c.slug === slug || c.id === slug);
    if (!found) throw new Error(`No category "${slug}"`);
    return found.id;
  };

  // `file:name` media → uploads, once each: images as `![alt](file:name)`,
  // video as `::video media=file:name caption="…"`.
  const uploaded = new Map<string, string>();
  async function withMedia(md: string): Promise<string> {
    const refs = [
      ...[...md.matchAll(/!\[([^\]]*)\]\(file:([^)\s]+)\)/g)].map(([, alt, file]) => ({ alt, file })),
      ...[...md.matchAll(/media=file:(\S+)(?:\s+caption="([^"]*)")?/g)].map(([, file, caption]) => ({ alt: caption ?? "", file })),
    ];
    for (const { alt, file } of refs) {
      if (uploaded.has(file)) continue;
      const bytes = await fs.readFile(path.join(dir, "media", file));
      const mime = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
      const { item, error, deduped } = await uploadMedia(bytes, file, mime, { alt, source, metadata });
      if (!item) throw new Error(`Couldn't upload ${file}: ${error}`);
      if (!deduped) made.media++;
      uploaded.set(file, item.id);
    }
    return md
      .replace(/\]\(file:([^)\s]+)\)/g, (_, file: string) => `](media:${uploaded.get(file)})`)
      .replace(/media=file:(\S+)/g, (_, file: string) => `media=${uploaded.get(file)}`);
  }

  async function seedFolder(collection: "posts" | "pages") {
    const folder = path.join(dir, collection);
    for (const file of await markdownFiles(name, collection)) {
      const { meta, blocks } = parsePostMarkdown(await withMedia(await fs.readFile(path.join(folder, file), "utf8")));
      const slug = meta.slug || file.replace(/^\d+-/, "").replace(/\.md$/, "");
      if (await getEntry(collection, slug)) {
        log(`${collection}/${slug}: already there`);
        continue;
      }
      const data: Record<string, unknown> = {
        ...metaToData(meta),
        content: blocks.map((b) => b.block),
        ...(collection === "posts" ? { categories: (meta.categories ?? []).map(categoryId), tags: meta.tags ?? "" } : {}),
      };
      const date = typeof data.date === "string" ? data.date : undefined;
      const { error } = await createEntry(collection, {
        slug,
        status: "published",
        data,
        publishedAt: date ?? new Date().toISOString(),
        metadata,
        source,
      });
      if (error) throw new Error(`${collection}/${slug}: ${error}`);
      made[collection]++;
      log(`${collection}/${slug}: made`);
      // Pages list in the order they were made: keep each a moment apart.
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  await seedFolder("posts");
  await seedFolder("pages");
  return made;
  } finally {
    exampleLoadInProgress = false;
  }
}

/** Seeds present in the current project, inferred from example-marked items and seed batches. */
async function detectLoadedSeeds(): Promise<Set<string>> {
  const seeds = new Set<string>();
  // Example entries carry metadata.seed
  for (const entry of await listAllEntries()) {
    if (isExample(entry) && typeof entry.metadata?.seed === "string") seeds.add(String(entry.metadata.seed));
  }
  // Categories may carry it now; older ones don't.
  for (const category of await listCategories()) {
    if (isExample(category) && typeof category.metadata?.seed === "string") seeds.add(String(category.metadata.seed));
  }
  // Media uploaded by the seed script carries batchId "seed-<name>"
  for (const item of await listExampleMedia(await seedBatches())) {
    const batch = item.source?.batchId;
    if (item.source?.origin === "script" && typeof batch === "string" && batch.startsWith("seed-")) {
      seeds.add(batch.slice("seed-".length));
    }
  }
  return seeds;
}

/** Slugs of categories that belong to loaded seeds but may predate example marking (legacy seed runs). */
async function legacyExampleCategorySlugs(seeds: Set<string>): Promise<Set<string>> {
  const slugs = new Set<string>();
  for (const seed of seeds) {
    const site = await readSeed(seed).catch(() => null);
    if (!site?.categories) continue;
    for (const c of site.categories) slugs.add(c.slug);
  }
  return slugs;
}

/** The batches the seed script gave uploads before media carried the example mark. */
async function seedBatches(): Promise<string[]> {
  return (await listExampleSites()).map((site) => `seed-${site.name}`);
}

const countOf = (entries: { collection: string }[], collection: string) => entries.filter((e) => e.collection === collection).length;

/** How much of the current project is examples. */
export async function exampleCounts(): Promise<ExampleCounts> {
  const entries = await countExampleEntries();
  const allCategories = await listCategories();
  const seeds = await detectLoadedSeeds();
  const legacySlugs = await legacyExampleCategorySlugs(seeds);
  const categories = allCategories.filter((c) => isExample(c) || legacySlugs.has(c.slug)).length;
  const media = (await listExampleMedia(await seedBatches())).length;
  return {
    posts: entries.posts ?? 0,
    pages: entries.pages ?? 0,
    categories,
    media,
  };
}

export type ExampleRemoval = {
  removed: ExampleCounts;
  /** Examples left because the maker's own work uses them (see examples-plan.ts). */
  kept: Omit<ExampleCounts, "posts">;
};

/**
 * Take every example out of the current project, leaving the plain feed and
 * whatever the maker made or changed (examples-plan.ts). A page's wireframes and its own docs go with it,
 * as when it's deleted by hand. The site goes back to setup's name if it
 * still has the example's.
 */
export async function removeExamples(): Promise<ExampleRemoval> {
  const entries = await listAllEntries();
  const categoriesInDb = await listCategories();
  const media = await listExampleMedia(await seedBatches());
  // Treat legacy seed categories (matching loaded seeds' slugs) as examples for planning purposes,
  // so earlier runs without metadata.example are still removable when unused.
  const seeds = await detectLoadedSeeds();
  const legacySlugs = await legacyExampleCategorySlugs(seeds);
  const categories = categoriesInDb.map((c) => (legacySlugs.has(c.slug) ? { ...c, metadata: { ...(c.metadata || {}), example: true } } : c));
  const plan = planExampleRemoval({ entries, categories, exampleMedia: media.map((item) => item.id) });

  for (const entry of plan.entries) {
    const belongings = entry.collection === "pages" ? await pageDeletionPlan(entry) : null;
    await deleteEntry(entry.collection, entry.slug);
    if (belongings) await deletePageBelongings(entry, belongings);
  }
  for (const category of plan.categories) await deleteCategory(category.id);
  let mediaRemoved = 0;
  for (const id of plan.media) if ((await deleteMedia(id)).success) mediaRemoved++;

  const touchedSeeds = new Set<string>();
  for (const item of [...entries, ...categories]) if (isExample(item) && typeof item.metadata?.seed === "string") touchedSeeds.add(item.metadata.seed);
  for (const item of media) if (item.source?.batchId?.startsWith("seed-")) touchedSeeds.add(item.source.batchId.slice("seed-".length));
  const { siteName } = await getSiteSettings();
  for (const seed of touchedSeeds) {
    const site = await readSeed(seed).catch(() => null);
    if (site?.siteName && site.siteName === siteName) {
      await nameSite(DEFAULT_SETTINGS.siteName);
      break;
    }
  }

  return {
    removed: {
      posts: countOf(plan.entries, "posts"),
      pages: countOf(plan.entries, "pages"),
      categories: plan.categories.length,
      media: mediaRemoved,
    },
    kept: { pages: plan.keptEntries.length, categories: plan.keptCategories.length, media: plan.keptMedia.length },
  };
}
