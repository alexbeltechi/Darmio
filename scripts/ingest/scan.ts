/**
 * Scan a folder of assets and emit a manifest for agent-assisted ingest.
 *
 * Read-only: touches nothing in the CMS. Deduces a post date from the assets
 * themselves (EXIF capture date where present, filesystem mtime otherwise),
 * since archive folders have been copied around and folder dates are unreliable.
 *
 *   npx tsx scripts/ingest/scan.ts "<folder>" [--depth 1]
 */

import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tif", ".tiff"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".m4v"]);

interface Asset {
  path: string;
  name: string;
  group: string; // Immediate parent folder, relative to the scan root
  kind: "image" | "video";
  ext: string;
  size: number;
  width?: number;
  height?: number;
  orientation?: "landscape" | "portrait" | "square";
  capturedAt: string;
  dateSource: "exif" | "mtime";
}

/**
 * EXIF DateTimeOriginal is the only date that survives copying, so prefer it
 * and fall back to mtime (which held up across this archive's copies).
 */
async function readCapturedAt(file: string, stat: { mtime: Date }): Promise<{ at: string; source: "exif" | "mtime" }> {
  try {
    const meta = await sharp(file).metadata();
    const raw = (meta as { exif?: Buffer }).exif;
    if (raw) {
      const match = raw.toString("latin1").match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (match) {
        const [, y, mo, d, h, mi, s] = match;
        const parsed = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);
        if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 1970) {
          return { at: parsed.toISOString(), source: "exif" };
        }
      }
    }
  } catch {
    // Not an image, or no readable EXIF - mtime is the fallback
  }
  return { at: stat.mtime.toISOString(), source: "mtime" };
}

async function walk(dir: string, root: string, depth: number, out: Asset[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // `_curate_…`, `_scan_…` and the like hold contact sheets and exports, not more originals.
      if (depth > 0 && !entry.name.startsWith("_")) await walk(full, root, depth - 1, out);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    const kind = IMAGE_EXT.has(ext) ? "image" : VIDEO_EXT.has(ext) ? "video" : null;
    if (!kind) continue;

    const stat = await fs.stat(full);
    const { at, source } = await readCapturedAt(full, stat);

    let width: number | undefined;
    let height: number | undefined;
    if (kind === "image") {
      try {
        const meta = await sharp(full).metadata();
        width = meta.width;
        height = meta.height;
      } catch {
        // Unreadable dimensions are not fatal - the upload path re-derives them
      }
    }

    const relative = path.relative(root, path.dirname(full));

    out.push({
      path: full,
      name: entry.name,
      group: relative || ".",
      kind,
      ext,
      size: stat.size,
      width,
      height,
      orientation:
        width && height
          ? width > height
            ? "landscape"
            : width < height
              ? "portrait"
              : "square"
          : undefined,
      capturedAt: at,
      dateSource: source,
    });
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function titleFromFolder(folder: string): string {
  return path
    .basename(folder)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function main() {
  const args = process.argv.slice(2);
  const root = args.find((a) => !a.startsWith("--"));
  if (!root) {
    console.error('Usage: npx tsx scripts/ingest/scan.ts "<folder>" [--depth 1]');
    process.exit(1);
  }

  const depthArg = args.indexOf("--depth");
  const depth = depthArg !== -1 ? parseInt(args[depthArg + 1], 10) : 1;

  const resolved = path.resolve(root.replace(/^~/, process.env.HOME || "~"));
  const assets: Asset[] = [];
  await walk(resolved, resolved, depth, assets);

  if (assets.length === 0) {
    console.log(JSON.stringify({ root: resolved, assetCount: 0, assets: [] }, null, 2));
    return;
  }

  const times = assets.map((a) => new Date(a.capturedAt).getTime());
  // Median resists a stray file touched years after the fact
  const suggestedDate = new Date(median(times)).toISOString();

  // Group counts help decide whether subfolders are separate posts
  const groups: Record<string, { count: number; earliest: string; latest: string }> = {};
  for (const asset of assets) {
    const g = (groups[asset.group] ||= {
      count: 0,
      earliest: asset.capturedAt,
      latest: asset.capturedAt,
    });
    g.count++;
    if (asset.capturedAt < g.earliest) g.earliest = asset.capturedAt;
    if (asset.capturedAt > g.latest) g.latest = asset.capturedAt;
  }

  console.log(
    JSON.stringify(
      {
        root: resolved,
        suggestedTitle: titleFromFolder(resolved),
        suggestedDate,
        dateRange: {
          earliest: new Date(Math.min(...times)).toISOString(),
          latest: new Date(Math.max(...times)).toISOString(),
        },
        dateConfidence: assets.some((a) => a.dateSource === "exif") ? "exif" : "mtime",
        assetCount: assets.length,
        groups,
        assets: assets.sort((a, b) => a.name.localeCompare(b.name)),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
