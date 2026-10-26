/**
 * What's been done with a folder in the CMS, from the activity feeds
 * (`_activity.md`) in it and under it, checked against the CMS as it is now:
 * does each post still exist, is it live, does it still hold the frames the
 * feed says it has.
 * Read-only. Folders with pictures and no log are listed too.
 *
 *   npx tsx scripts/ingest/status.ts "<folder>" [--depth 3] [--json]
 */

import fs from "fs/promises";
import path from "path";
import { loadPosts, type CmsPost } from "./cms";
import { findActivity, heldFrames, readActivity, type ActivityEvent } from "./activity";

const IMAGE = /\.(jpe?g|png|webp|gif|avif|tiff?|heic|mp4|mov|webm|m4v)$/i;

interface PostState {
  slug: string;
  title?: string;
  /** What the log last did with this post, and when. */
  last: { action: string; at: string };
  frames: number;
  /** null when the CMS couldn't be reached. */
  cms: null | { exists: false } | { exists: true; status: string; hasChanges: boolean; framesStillIn: number };
}

/** Each post the feed names: its last action, and its frames per the feed, checked against the CMS. */
function byPost(events: ActivityEvent[], posts: Map<string, CmsPost> | null): PostState[] {
  const held = heldFrames(events);
  return [...held.entries()].map(([slug, frames]) => {
    const last = events.filter((e) => e.slug === slug).at(-1)!;
    const state: PostState = {
      slug,
      title: events.filter((e) => e.slug === slug && e.title).at(-1)?.title,
      last: { action: last.action, at: last.at },
      frames: frames.length,
      cms: null,
    };
    if (!posts) return state;
    const post = posts.get(slug);
    return {
      ...state,
      cms: post
        ? { exists: true, status: post.status, hasChanges: post.hasChanges, framesStillIn: frames.filter((f) => post.mediaIds.includes(f.mediaId)).length }
        : { exists: false },
    };
  });
}

async function countPictures(dir: string): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  // `._name` files are macOS metadata sidecars on non-Mac drives, not pictures.
  return entries.filter((e) => e.isFile() && !e.name.startsWith(".") && IMAGE.test(e.name)).length;
}

/** Folders under root (itself included) that hold pictures, skipping hidden and `_` folders. */
async function pictureFolders(root: string, depth: number): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string, left: number) {
    if ((await countPictures(dir)) > 0) out.push(dir);
    if (left <= 0) return;
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_")) await walk(path.join(dir, e.name), left - 1);
    }
  }
  await walk(root, depth);
  return out;
}

function describe(state: PostState): string {
  const head = `${state.slug}${state.title && state.title !== state.slug ? ` "${state.title}"` : ""}: ${state.last.action} ${state.last.at.slice(0, 10)}`;
  if (!state.cms) return `${head} · CMS not reachable`;
  if (!state.cms.exists) return `${head} · no longer in the CMS`;
  const frames = state.frames ? ` · ${state.cms.framesStillIn}/${state.frames} logged frames in it` : "";
  return `${head} · now ${state.cms.status}${state.cms.hasChanges ? " (unpublished changes)" : ""}${frames}`;
}

async function main() {
  const args = process.argv.slice(2);
  const folder = args.find((a) => !a.startsWith("--"));
  if (!folder) {
    console.error('Usage: npx tsx scripts/ingest/status.ts "<folder>" [--depth 3] [--json]');
    process.exit(1);
  }
  const depthAt = args.indexOf("--depth");
  const depth = depthAt === -1 ? 3 : parseInt(args[depthAt + 1], 10);
  const root = path.resolve(folder.replace(/^~/, process.env.HOME || "~"));

  const [feedDirs, folders, posts] = await Promise.all([findActivity(root, depth), pictureFolders(root, depth), loadPosts()]);
  const result = await Promise.all(
    folders.map(async (dir) => ({
      folder: path.relative(root, dir) || ".",
      pictures: await countPictures(dir),
      posts: feedDirs.includes(dir) ? byPost(await readActivity(dir), posts) : [],
    }))
  );

  if (args.includes("--json")) {
    console.log(JSON.stringify({ root, cmsReachable: posts !== null, folders: result }, null, 2));
    return;
  }

  console.log(`${root}${posts ? "" : "  (CMS not reachable: logs only)"}`);
  const logged = result.filter((r) => r.posts.length);
  const without = result.filter((r) => !r.posts.length);
  for (const r of logged) {
    console.log(`\n${r.folder} · ${r.pictures} pictures`);
    for (const state of r.posts) console.log(`  ${describe(state)}`);
  }
  if (without.length) {
    console.log(`\nNo _activity.md (not posted with /post, or before the log existed):`);
    for (const r of without) console.log(`  ${r.folder} · ${r.pictures} pictures`);
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
