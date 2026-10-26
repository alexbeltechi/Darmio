/**
 * Push a plan produced during agent-assisted ingest into the CMS.
 *
 * Talks to the running dev/prod server over the admin API using CMS_AGENT_TOKEN,
 * so everything goes through the same validation the admin UI uses.
 *
 *   npx tsx scripts/ingest/push.ts <plan.json> [--publish]
 *
 * Plan shape:
 * {
 *   "title": "Butter",
 *   "date": "2015-07-11T18:40:02.000Z",   // backdates the post and its media
 *   "categories": ["design"],
 *   "tags": "lettering, type",             // optional
 *   "layout": "auto",                      // auto (default) | stack | grid | masonry
 *   "width": "auto",                       // auto (default: 1-3 stacked, 4-19 three a row inline, 20+ full width) | large (inline, 1024px) | full
 *   "intro": "<p>Optional lead text</p>",  // optional text block above the gallery
 *   "sourcePath": "/Users/.../Butter",
 *   "mediaTags": ["Butter", "lettering"],  // the owner's words, confirmed by them: on every image
 *   "keywordsBy": "/post",                 // who wrote the keywords (/curate when from selection.json)
 *   "assets": [{ "path": "...",              // the file to send (an export, or the original)
 *                "source": "...",            // the original, when path is an export: its folder gets the _activity.md log
 *                "title": "...",             // short, plain: "Loaded mountain bike on a granite crag"
 *                "alt": "...",               // one sentence saying what's in it, for screen readers and search
 *                "description": "...",       // optional: a longer line for search
 *                "caption": "...", "capturedAt": "...",
 *                "tags": ["..."],          // more of the owner's tags for this frame only
 *                "keywords": ["tent", "hills", "dusk"] }]   // what's in it, from looking at it
 * }
 *
 * Every image needs `alt` and `keywords`. Files are named for search from
 * their title ("loaded-mountain-bike-on-a-granite-crag.jpg"); `name` overrides.
 *
 * For a story (a case study, say), give `blocks` instead of `intro` + `assets`:
 * text, quote and gallery blocks in order, each gallery with its own assets.
 *   "blocks": [
 *     { "type": "text", "html": "<h2>The problem</h2><p>...</p>" },
 *     { "type": "gallery", "layout": "stack", "assets": [{ "path": "..." }] },
 *     { "type": "quote", "text": "...", "attribution": "..." }
 *   ]
 *
 * Stills are sent at most 2560px (see asSent). Re-running the same plan
 * reuses already-uploaded assets (sha256 match on what was sent) and updates
 * the existing post: the first run writes `slug` and `batchId` back into the
 * plan. A new post whose slug is taken stops instead of overwriting it. An
 * update keeps the post's status: a published post gets unpublished changes.
 *
 * Before uploading, the activity feeds (`_activity.md`, see activity.ts) in
 * the originals' folders are read. If these frames are in a post that still
 * exists, it stops and says which; re-run with `--duplicate=update` to update
 * that post, or `--duplicate=new` for a second one. After the run, each
 * originals folder's feed gets one line, and under it only the frames that
 * changed (added, removed, replaced).
 */

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { AGENT, api, BASE_URL, loadPosts, TOKEN } from "./cms";
import { ACTIVITY_FILE, appendActivity, diffFrames, heldFrames, readActivity, type HeldFrame } from "./activity";
import { slugify } from "../../src/lib/slug";
import { GALLERY_LAYOUTS, GALLERY_WIDTHS, type GalleryBlock } from "../../src/lib/cms/types";

interface PlanAsset {
  path: string;
  /** The original, when `path` is an export of it. */
  source?: string;
  /** The uploaded file's name, without extension; defaults to the title, slugified. */
  name?: string;
  title?: string;
  alt?: string;
  description?: string;
  caption?: string;
  capturedAt?: string;
  tags?: string[];
  keywords?: string[];
}

type PlanBlock =
  | { type: "text"; html: string }
  | { type: "quote"; text: string; attribution?: string }
  | {
      type: "gallery";
      assets: PlanAsset[];
      layout?: GalleryBlock["layout"];
      width?: GalleryBlock["width"];
      columns?: number;
    };

interface Plan {
  title: string;
  slug?: string;
  date: string;
  categories: string[];
  tags?: string;
  layout?: GalleryBlock["layout"];
  width?: GalleryBlock["width"];
  columns?: number;
  intro?: string;
  sourcePath?: string;
  /** Tags for every image in the post: the owner's words (place, people, project, camera), confirmed by them. */
  mediaTags?: string[];
  /** Who wrote the assets' keywords: "/curate" (from selection.json) or "/post". */
  keywordsBy?: string;
  batchId?: string;
  assets?: PlanAsset[];
  /** Ordered blocks; replaces `intro` + `assets` when given. */
  blocks?: PlanBlock[];
}

function mimeFor(file: string): string {
  const types: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".m4v": "video/mp4",
  };
  return types[path.extname(file).toLowerCase()] || "application/octet-stream";
}

// The CMS keeps nothing larger than 2560px, so stills are sent at that size:
// small enough for Vercel's 4.5MB request limit, as the admin's uploader does.
const SEND_MAX_EDGE = 2560;
const SHRINKABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/tiff"]);

/** The file as sent: stills shrunk to 2560px (JPEG at 92, or PNG when transparent), anything else as it is. */
async function asSent(file: string): Promise<{ buffer: Buffer; mime: string }> {
  const buffer = await fs.readFile(file);
  const mime = mimeFor(file);
  if (!SHRINKABLE.has(mime)) return { buffer, mime };

  const image = sharp(buffer, { failOn: "none" })
    .rotate()
    .resize(SEND_MAX_EDGE, SEND_MAX_EDGE, { fit: "inside", withoutEnlargement: true });
  const { hasAlpha } = await sharp(buffer, { failOn: "none" }).metadata();
  return hasAlpha
    ? { buffer: await image.png().toBuffer(), mime: "image/png" }
    : { buffer: await image.jpeg({ quality: 92, mozjpeg: true }).toBuffer(), mime: "image/jpeg" };
}

/** A file name search engines can read: the title (or alt) slugified, cut at a word near 60 characters. */
function searchableName(asset: PlanAsset, fallback: string): string {
  const base = slugify(asset.name || asset.title || asset.alt || "") || fallback;
  return base.length <= 60 ? base : base.slice(0, 60).replace(/-[^-]*$/, "");
}

async function uploadAsset(
  asset: PlanAsset,
  plan: Plan,
  fallbackName: string
): Promise<{ id: string; deduped: boolean; fingerprint?: string }> {
  const { buffer, mime } = await asSent(asset.path);
  const ext = mime === "image/jpeg" ? ".jpg" : mime === "image/png" ? ".png" : path.extname(asset.path).toLowerCase();
  const name = `${searchableName(asset, fallbackName)}${ext}`;

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mime }), name);
  if (asset.title) form.append("title", asset.title);
  if (asset.alt) form.append("alt", asset.alt);
  if (asset.description) form.append("description", asset.description);
  if (asset.caption) form.append("caption", asset.caption);
  if (asset.capturedAt) form.append("capturedAt", asset.capturedAt);
  const tags = mergeWords(plan.mediaTags, asset.tags);
  if (tags.length) form.append("tags", tags.join(", "));
  if (asset.keywords?.length) {
    form.append("keywords", asset.keywords.join(", "));
    form.append("keywordsBy", plan.keywordsBy || "/post");
  }
  // The original's path, so the library (and a search for "DSCF6400") leads back to it.
  form.append("sourcePath", asset.source || asset.path);
  form.append("origin", "agent");
  form.append("agent", AGENT);
  if (plan.batchId) form.append("batchId", plan.batchId);

  const response = await api("/api/admin/media", { method: "POST", body: form });
  if (!response.ok) {
    throw new Error(`Upload failed for ${path.basename(asset.path)}: ${response.status} ${await response.text()}`);
  }

  const body = await response.json();
  const id: string = body.data.id;
  // A reused file keeps what it had; add this run's tags and keywords to it.
  if (body.deduped === true && (tags.length || asset.keywords?.length)) {
    const item = body.data as { tags?: string[]; keywords?: string[] };
    const patch = await api(`/api/admin/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tags: mergeWords(item.tags, tags),
        ...(asset.keywords?.length
          ? { keywords: mergeWords(item.keywords, asset.keywords), keywordsBy: plan.keywordsBy || "/post" }
          : {}),
      }),
    });
    if (!patch.ok) throw new Error(`Tagging ${name} failed: ${patch.status} ${await patch.text()}`);
  }
  return { id, deduped: body.deduped === true, fingerprint: body.data.fingerprint };
}

/** Lists of words joined, each word once whatever its case (the first spelling wins). */
function mergeWords(...lists: (string[] | undefined)[]): string[] {
  const seen = new Map<string, string>();
  for (const word of lists.flat()) {
    const clean = word?.trim();
    if (clean && !seen.has(clean.toLowerCase())) seen.set(clean.toLowerCase(), clean);
  }
  return [...seen.values()];
}

/** sha256 of a file, first 16 characters: enough to know the same original under another name. */
async function shortSha(file: string): Promise<string> {
  return crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex").slice(0, 16);
}

interface Frame {
  asset: PlanAsset;
  original: string;
  sha: string;
}

/**
 * Posts in the originals' activity feeds that hold some of these frames now
 * and still exist, other than the one this plan updates. Matched by the
 * original's bytes, or its file name when the feed has no sha for it.
 */
async function earlierPosts(frames: Frame[], ownSlug: string | undefined) {
  const posts = await loadPosts();
  const found = new Map<string, { slug: string; frames: number; status?: string; gone: boolean }>();
  for (const dir of new Set(frames.map((f) => path.dirname(f.original)))) {
    const here = frames.filter((f) => path.dirname(f.original) === dir);
    for (const [slug, held] of heldFrames(await readActivity(dir))) {
      if (slug === ownSlug || !held.length) continue;
      const hits = here.filter((f) => held.some((h) => (h.sha ? h.sha === f.sha : h.file === path.basename(f.original)))).length;
      if (!hits) continue;
      const post = posts?.get(slug);
      const prev = found.get(slug);
      found.set(slug, { slug, frames: (prev?.frames ?? 0) + hits, status: post?.status, gone: posts !== null && !post });
    }
  }
  return [...found.values()];
}

async function main() {
  const planPath = process.argv[2];
  const publish = process.argv.includes("--publish");
  const duplicate = process.argv.find((a) => a.startsWith("--duplicate="))?.split("=")[1];

  if (!planPath) {
    console.error("Usage: npx tsx scripts/ingest/push.ts <plan.json> [--publish] [--duplicate=update|new]");
    process.exit(1);
  }
  if (!TOKEN) {
    console.error("CMS_AGENT_TOKEN is not set - add it to .env.local and restart the dev server.");
    process.exit(1);
  }
  if (duplicate && duplicate !== "update" && duplicate !== "new") {
    throw new Error(`--duplicate is "update" or "new", not "${duplicate}"`);
  }

  const plan: Plan = JSON.parse(await fs.readFile(planPath, "utf8"));
  const batchId = plan.batchId || `ingest-${crypto.randomUUID().slice(0, 8)}`;
  plan.batchId = batchId;

  // A single-gallery plan is a story with one optional text block and one gallery.
  const blocks: PlanBlock[] = plan.blocks ?? [
    ...(plan.intro ? [{ type: "text" as const, html: plan.intro }] : []),
    {
      type: "gallery" as const,
      assets: plan.assets ?? [],
      layout: plan.layout,
      width: plan.width,
      columns: plan.columns,
    },
  ];
  // The plan is hand- or agent-written JSON; catch a bad value before uploading anything.
  for (const block of blocks) {
    if (block.type !== "gallery") continue;
    if (block.layout && !GALLERY_LAYOUTS.includes(block.layout)) {
      throw new Error(`Gallery layout "${block.layout}" isn't one of: ${GALLERY_LAYOUTS.join(", ")}`);
    }
    if (block.width && !GALLERY_WIDTHS.includes(block.width)) {
      throw new Error(`Gallery width "${block.width}" isn't one of: ${GALLERY_WIDTHS.join(", ")}`);
    }
  }
  const assets = blocks.flatMap((b) => (b.type === "gallery" ? b.assets : []));
  const total = assets.length;

  // Every image is findable: no bare uploads (decisions, 2026-10-20).
  const bare = assets.filter((a) => mimeFor(a.path).startsWith("image/") && (!a.alt || !a.keywords?.length));
  if (bare.length) {
    throw new Error(`These images have no alt or no keywords; add them to the plan first:\n  ${bare.map((a) => path.basename(a.path)).join("\n  ")}`);
  }

  const frames: Frame[] = await Promise.all(
    assets.map(async (asset) => {
      const original = asset.source || asset.path;
      return { asset, original, sha: await shortSha(original) };
    })
  );

  // Already posted? Ask before making a second post of the same pictures.
  const earlier = await earlierPosts(frames, plan.slug);
  const live = earlier.filter((e) => !e.gone);
  for (const e of earlier.filter((e) => e.gone)) {
    console.log(`  (${e.frames} of these frames were in "${e.slug}"; that post is gone now)`);
  }
  if (live.length && !duplicate) {
    console.error(`\nAlready posted, per the folder's _activity.md:`);
    for (const e of live) console.error(`  ${e.frames}/${total} frames are in "${e.slug}"${e.status ? ` (${e.status})` : ""}`);
    console.error(`\nNothing uploaded. Re-run with --duplicate=update to update "${live[0].slug}", or --duplicate=new for a second post.`);
    process.exit(2);
  }
  if (duplicate === "update" && live.length) plan.slug = live[0].slug;

  // A new post never lands on someone else's slug; one this plan made before is updated.
  const slug = plan.slug || slugify(plan.title);
  const existing = await api(`/api/admin/collections/posts/entries/${slug}`);
  const existingStatus: string | undefined = existing.ok ? (await existing.json()).data?.status : undefined;
  if (existing.ok && !plan.slug) {
    throw new Error(`A post "${slug}" already exists. Set "slug": "${slug}" in the plan to update it, or give this one another title.`);
  }

  console.log(`→ ${plan.title} (${total} assets, dated ${plan.date.slice(0, 10)}) as ${AGENT}`);

  let uploaded = 0;
  let reused = 0;
  const logged = new Map<PlanAsset, HeldFrame>();
  const content: Record<string, unknown>[] = [];
  for (const block of blocks) {
    if (block.type === "text") {
      content.push({ type: "text", id: crypto.randomUUID(), html: block.html });
    } else if (block.type === "quote") {
      content.push({ type: "quote", id: crypto.randomUUID(), text: block.text, attribution: block.attribution ?? "" });
    } else {
      const mediaIds: string[] = [];
      for (const asset of block.assets) {
        const { id, deduped, fingerprint } = await uploadAsset(
          { capturedAt: plan.date, ...asset },
          plan,
          `${slug}-${String(uploaded + 1).padStart(2, "0")}`
        );
        mediaIds.push(id);
        uploaded++;
        if (deduped) reused++;
        const frame = frames.find((f) => f.asset === asset)!;
        logged.set(asset, { file: path.basename(frame.original), mediaId: id, fp: fingerprint, sha: frame.sha });
        process.stdout.write(`  [${uploaded}/${total}] ${path.basename(asset.path)}${deduped ? " (reused)" : ""}\n`);
      }
      content.push({
        type: "gallery",
        id: crypto.randomUUID(),
        mediaIds,
        layout: block.layout || "auto",
        width: block.width || "auto",
        ...(block.columns ? { columns: block.columns } : {}),
      });
    }
  }

  const payload = {
    slug,
    // A new post is a draft unless --publish. An update keeps its status: on a
    // published post the changes are staged, and the site keeps the live
    // version until they're published.
    ...(publish ? { status: "published" } : existing.ok ? {} : { status: "draft" }),
    ...(existingStatus === "published" && !publish ? { stage: true } : {}),
    // Backdate both: `date` drives the post's displayed date, `publishedAt` drives feed order
    publishedAt: plan.date,
    data: {
      title: plan.title,
      content,
      categories: plan.categories,
      date: plan.date,
      ...(plan.tags ? { tags: plan.tags } : {}),
    },
    source: {
      origin: "agent",
      agent: AGENT,
      path: plan.sourcePath,
      batchId,
      ingestedAt: new Date().toISOString(),
      assetCount: total,
    },
  };

  const method = existing.ok ? "PATCH" : "POST";
  const endpoint = existing.ok
    ? `/api/admin/collections/posts/entries/${slug}`
    : "/api/admin/collections/posts/entries";

  const response = await api(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Post ${method} failed: ${response.status} ${await response.text()}`);
  }

  const { data: entry } = await response.json();

  // The next run of this plan updates this post rather than stopping at its slug.
  await fs.writeFile(planPath, JSON.stringify({ ...plan, slug: entry.slug, batchId }, null, 2));

  // One line per originals folder, and under it only the frames this run changed there.
  const created = method === "POST";
  const feeds: string[] = [];
  for (const dir of new Set(frames.map((f) => path.dirname(f.original)))) {
    const here = frames.filter((f) => path.dirname(f.original) === dir);
    const before = heldFrames(await readActivity(dir)).get(entry.slug) ?? [];
    const sentFrom = [...new Set(here.map((f) => path.dirname(f.asset.path)))].filter((d) => d !== dir);
    const ok = await appendActivity(dir, {
      at: new Date().toISOString(),
      action: created ? "create" : "update",
      slug: entry.slug,
      status: entry.status,
      title: created ? plan.title : undefined,
      batch: created ? batchId : undefined,
      from: created && sentFrom.length ? sentFrom.join(", ") : undefined,
      frames: diffFrames(before, here.map((f) => logged.get(f.asset)!)),
    });
    feeds.push(ok ? `  log:     ${path.join(dir, ACTIVITY_FILE)}` : `  log:     couldn't write in ${dir} (read-only?)`);
  }

  console.log(`\n✓ ${method === "PATCH" ? "Updated" : "Created"} ${entry.status} post "${entry.slug}"`);
  if (reused) console.log(`  ${reused} asset(s) reused from a previous run`);
  console.log(`  batchId: ${batchId}`);
  console.log(`  edit:    ${BASE_URL}/admin/posts/${entry.slug}`);
  console.log(feeds.join("\n"));
}

main().catch((error) => {
  console.error(`\n✗ ${error.message}`);
  process.exit(1);
});
