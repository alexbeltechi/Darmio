/**
 * Load an example site into the database in `.env.local`: its settings,
 * categories, media, posts and pages (roadmap, pre-release step 4; the Ilo
 * Odena seed).
 *
 * Usage: npm run seed -- ilo
 *
 * The seed is a folder in `seed/<name>/`: `site.json` (the site's name and
 * categories), `media/` (the images), `posts/*.md` and `pages/*.md` in the
 * agent's Markdown format (src/lib/agent/markdown.ts), pages in file-name
 * order, which is the order they're listed in. An image is written
 * `![alt](file:name.jpg)` and a video `::video media=file:name.mp4`, and each
 * becomes that upload. Everything is published
 * and marked as an example (`metadata.example`). Anything already there (a
 * category or an entry with the same slug) is left alone, so running it
 * twice changes nothing.
 */

import * as dotenv from "dotenv";
import { promises as fs } from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

type SeedSite = {
  siteName?: string;
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

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error("Usage: npm run seed -- <name>   (a folder in seed/, e.g. ilo)");
    process.exit(1);
  }
  const dir = path.join(process.cwd(), "seed", name);
  const site = JSON.parse(await fs.readFile(path.join(dir, "site.json"), "utf8")) as SeedSite;

  // Imported after dotenv so the database helper sees MONGODB_URI.
  const { updateSiteSettings } = await import("../src/lib/db/settings");
  const { createCategory, listCategories } = await import("../src/lib/db/categories");
  const { parseCategoryLayout } = await import("../src/lib/db/categories");
  const { createEntry, getEntry } = await import("../src/lib/db/entries");
  const { uploadMedia } = await import("../src/lib/cms/media");
  const { parsePostMarkdown } = await import("../src/lib/agent/markdown");
  const { metaToData } = await import("../src/lib/agent/post-markdown-io");

  const batchId = `seed-${name}`;
  const source = { origin: "script" as const, batchId, ingestedAt: new Date().toISOString() };
  const example = { example: true, seed: name };

  if (site.siteName) {
    await updateSiteSettings({ siteName: site.siteName });
    console.log(`Site name: ${site.siteName}`);
  }

  let categories = await listCategories();
  for (const c of site.categories ?? []) {
    if (categories.some((existing) => existing.slug === c.slug)) {
      console.log(`Category ${c.slug}: already there`);
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
      ...(parentId ? { parentId } : {}),
    });
    console.log(`Category ${c.slug}: made`);
    categories = await listCategories();
  }
  categories = await listCategories();
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
      const { item, error } = await uploadMedia(bytes, file, MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream", {
        alt,
        source,
      });
      if (!item) throw new Error(`Couldn't upload ${file}: ${error}`);
      uploaded.set(file, item.id);
    }
    return md
      .replace(/\]\(file:([^)\s]+)\)/g, (_, file: string) => `](media:${uploaded.get(file)})`)
      .replace(/media=file:(\S+)/g, (_, file: string) => `media=${uploaded.get(file)}`);
  }

  async function seedFolder(collection: "posts" | "pages") {
    const folder = path.join(dir, collection);
    const files = (await fs.readdir(folder).catch(() => [])).filter((f) => f.endsWith(".md")).sort();
    for (const file of files) {
      const { meta, blocks } = parsePostMarkdown(await withMedia(await fs.readFile(path.join(folder, file), "utf8")));
      const slug = meta.slug || file.replace(/^\d+-/, "").replace(/\.md$/, "");
      if (await getEntry(collection, slug)) {
        console.log(`${collection}/${slug}: already there`);
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
        metadata: example,
        source,
      });
      if (error) throw new Error(`${collection}/${slug}: ${error}`);
      console.log(`${collection}/${slug}: made`);
      // Pages list in the order they were made: keep each a moment apart.
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  await seedFolder("posts");
  await seedFolder("pages");
  console.log(`Done. ${uploaded.size} media files; everything is published and marked as an example.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
