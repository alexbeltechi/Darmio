/**
 * The activity feed: `_activity.md` beside the original pictures, one line
 * per thing done with them in the CMS, newest last, written for an agent to
 * read at a glance. Under an action, only the frames it changed:
 *
 *   2026-10-20 11:37 create macin-last-light draft title="Măcin, last light" batch=ingest-ab12cd34
 *     + DSCF6311.JPG 66f1a2b3-… fp=a1b2c3d4e5f60718 sha=92e4ae8010d6b3e1
 *   2026-10-21 09:10 update macin-last-light
 *     - DSCF6400.JPG 1771a702-…
 *     ~ DSCF6412.JPG 0a1b…→9f8e… sha=…
 *   2026-10-21 09:20 publish macin-last-light published
 *
 * Replaying the lines gives each post's frames as /post last left them. It
 * travels with the folder, so a copy on another drive keeps its history.
 * It's a history, not the truth: the CMS can change after (decisions,
 * 2026-10-20), so `status.ts` checks each post it names.
 *
 * push.ts writes its own runs. Anything else (publish, delete, a replaced
 * image) is logged with:
 *
 *   npx tsx scripts/ingest/activity.ts add "<folder>" <action> <slug> [--status s] [--note "…"]
 *        [--add FILE=mediaId] [--remove FILE=mediaId] [--replace FILE=oldId>newId]
 *   npx tsx scripts/ingest/activity.ts show "<folder>"     (each post's frames now, as JSON)
 */

import fs from "fs/promises";
import path from "path";

export const ACTIVITY_FILE = "_activity.md";

const HEADER = `# activity
/post log for this folder, newest last. A history, not the truth: \`npx tsx scripts/ingest/status.ts "<folder>"\` checks the CMS.
Lines: date time action slug [status] [k=v]. Frames under it: + added, - removed, ~ replaced (old→new).

`;

export interface ActivityFrame {
  op: "+" | "-" | "~";
  /** The original's file name in this folder. */
  file: string;
  mediaId: string;
  /** For `~`: the media item that replaced `mediaId`. */
  newId?: string;
  /** The CMS's look-based fingerprint of the upload. */
  fp?: string;
  /** sha256 of the original file, first 16 characters. */
  sha?: string;
}

export interface ActivityEvent {
  at: string;
  action: string;
  slug: string;
  status?: string;
  title?: string;
  batch?: string;
  /** Where the uploaded files came from, when not this folder (a /curate selection). */
  from?: string;
  note?: string;
  frames: ActivityFrame[];
}

/** A frame as a post holds it now, after replaying the feed. */
export interface HeldFrame {
  file: string;
  mediaId: string;
  fp?: string;
  sha?: string;
}

const quote = (text: string) => (/[\s"=]/.test(text) ? JSON.stringify(text) : text);

/** Words split on spaces, where a "quoted part" (JSON-escaped, e.g. title="a b") keeps its spaces. */
function tokens(line: string): string[] {
  return (line.match(/(?:[^\s"]+|"(?:[^"\\]|\\.)*")+/g) ?? []).map((t) =>
    t.replace(/"(?:[^"\\]|\\.)*"/g, (q) => JSON.parse(q))
  );
}

function render(event: ActivityEvent): string {
  // Local time, as the owner reads it ("sv-SE" is the locale that prints YYYY-MM-DD HH:MM).
  const parsed = new Date(event.at);
  const when = Number.isNaN(parsed.getTime()) ? event.at : parsed.toLocaleString("sv-SE").slice(0, 16);
  const head = [when, event.action, event.slug, event.status]
    .concat(event.title ? `title=${quote(event.title)}` : [])
    .concat(event.batch ? `batch=${event.batch}` : [])
    .concat(event.from ? `from=${quote(event.from)}` : [])
    .concat(event.note ? `note=${quote(event.note)}` : [])
    .filter(Boolean)
    .join(" ");
  const lines = [head];
  for (const f of event.frames) {
    const id = f.op === "~" ? `${f.mediaId}→${f.newId}` : f.mediaId;
    lines.push(["  " + f.op, quote(f.file), id, f.fp && `fp=${f.fp}`, f.sha && `sha=${f.sha}`].filter(Boolean).join(" "));
  }
  return lines.join("\n") + "\n";
}

function parse(text: string): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const line of text.split("\n")) {
    const frame = line.match(/^\s+([+~-]) (.*)$/);
    if (frame && events.length) {
      const [file, id, ...rest] = tokens(frame[2]);
      const [mediaId, newId] = id.split("→");
      const kv = Object.fromEntries(rest.map((t) => t.split("=") as [string, string]));
      events[events.length - 1].frames.push({ op: frame[1] as ActivityFrame["op"], file, mediaId, newId, fp: kv.fp, sha: kv.sha });
      continue;
    }
    const head = line.match(/^(\d{4}-\d\d-\d\d \d\d:\d\d) (.*)$/);
    if (!head) continue;
    const [action, slug, ...rest] = tokens(head[2]);
    const event: ActivityEvent = { at: head[1].replace(" ", "T"), action, slug, frames: [] };
    for (const t of rest) {
      const at = t.indexOf("=");
      const key = t.slice(0, at);
      if (at === -1) event.status = t;
      else if (key === "title" || key === "batch" || key === "from" || key === "note") event[key] = t.slice(at + 1);
    }
    events.push(event);
  }
  return events;
}

/** Adds an action to the folder's feed, starting the file if needed. False when the folder can't be written (a read-only drive). */
export async function appendActivity(dir: string, event: ActivityEvent): Promise<boolean> {
  const file = path.join(dir, ACTIVITY_FILE);
  const existing = await fs.readFile(file, "utf8").catch(() => null);
  try {
    await fs.writeFile(file, `${existing ?? HEADER}${render(event)}`);
    return true;
  } catch {
    return false;
  }
}

/** The folder's feed, oldest first; empty when there's none. */
export async function readActivity(dir: string): Promise<ActivityEvent[]> {
  return parse(await fs.readFile(path.join(dir, ACTIVITY_FILE), "utf8").catch(() => ""));
}

/** Each post's frames as the feed last left them, in the order they were added; a deleted post has none. */
export function heldFrames(events: ActivityEvent[]): Map<string, HeldFrame[]> {
  const posts = new Map<string, HeldFrame[]>();
  for (const event of events) {
    if (event.action === "delete") {
      posts.set(event.slug, []);
      continue;
    }
    const frames = [...(posts.get(event.slug) ?? [])];
    for (const f of event.frames) {
      const at = frames.findIndex((h) => h.mediaId === f.mediaId || (f.op !== "+" && h.file === f.file));
      if (f.op === "+") {
        if (at === -1) frames.push({ file: f.file, mediaId: f.mediaId, fp: f.fp, sha: f.sha });
      } else if (f.op === "-") {
        if (at !== -1) frames.splice(at, 1);
      } else if (at !== -1) {
        frames[at] = { file: f.file, mediaId: f.newId ?? f.mediaId, fp: f.fp ?? frames[at].fp, sha: f.sha ?? frames[at].sha };
      }
    }
    posts.set(event.slug, frames);
  }
  return posts;
}

/**
 * What changed between the frames a post held and the ones it holds now:
 * new ones `+`, gone ones `-`, and the same original under a new media item
 * `~` (a better export, a re-upload). Unchanged frames aren't listed.
 */
export function diffFrames(before: HeldFrame[], after: HeldFrame[]): ActivityFrame[] {
  const out: ActivityFrame[] = [];
  const sameOriginal = (a: HeldFrame, b: HeldFrame) => (a.sha && b.sha ? a.sha === b.sha : a.file === b.file);
  for (const now of after) {
    if (before.some((b) => b.mediaId === now.mediaId)) continue;
    const was = before.find((b) => sameOriginal(b, now) && !after.some((a) => a.mediaId === b.mediaId));
    out.push(was ? { op: "~", file: now.file, mediaId: was.mediaId, newId: now.mediaId, fp: now.fp, sha: now.sha } : { op: "+", ...now });
  }
  for (const was of before) {
    if (after.some((a) => a.mediaId === was.mediaId)) continue;
    if (out.some((f) => f.op === "~" && f.mediaId === was.mediaId)) continue;
    out.push({ op: "-", file: was.file, mediaId: was.mediaId });
  }
  return out;
}

/** Every folder under `root` (itself included) with a feed, skipping hidden and `_` folders. */
export async function findActivity(root: string, depth = 3): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string, left: number) {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    if (entries.some((e) => e.isFile() && e.name === ACTIVITY_FILE)) found.push(dir);
    if (left <= 0) return;
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_")) await walk(path.join(dir, e.name), left - 1);
    }
  }
  await walk(root, depth);
  return found;
}

async function main() {
  const [command, folder, ...rest] = process.argv.slice(2);
  const usage =
    'Usage: npx tsx scripts/ingest/activity.ts add "<folder>" <action> <slug> [--status s] [--note "…"] [--add FILE=id] [--remove FILE=id] [--replace FILE=old>new]\n' +
    '       npx tsx scripts/ingest/activity.ts show "<folder>"';
  if (!folder || !["add", "show"].includes(command)) {
    console.error(usage);
    process.exit(1);
  }
  const dir = path.resolve(folder.replace(/^~/, process.env.HOME || "~"));
  if (command === "show") {
    console.log(JSON.stringify(Object.fromEntries(heldFrames(await readActivity(dir))), null, 2));
    return;
  }

  const [action, slug] = rest;
  if (!action || !slug || action.startsWith("--") || slug.startsWith("--")) throw new Error(usage);
  const option = (name: string) => rest.flatMap((t, i) => (t === `--${name}` && rest[i + 1] ? [rest[i + 1]] : []));
  const pair = (value: string) => {
    const at = value.lastIndexOf("=");
    return [value.slice(0, at), value.slice(at + 1)];
  };
  const frames: ActivityFrame[] = [
    ...option("add").map((v) => ({ op: "+" as const, file: pair(v)[0], mediaId: pair(v)[1] })),
    ...option("remove").map((v) => ({ op: "-" as const, file: pair(v)[0], mediaId: pair(v)[1] })),
    ...option("replace").map((v) => {
      const [file, ids] = pair(v);
      const [mediaId, newId] = ids.split(">");
      return { op: "~" as const, file, mediaId, newId };
    }),
  ];
  const ok = await appendActivity(dir, {
    at: new Date().toISOString(),
    action,
    slug,
    status: option("status")[0],
    note: option("note")[0],
    frames,
  });
  console.log(ok ? `✓ ${action} ${slug} → ${path.join(dir, ACTIVITY_FILE)}` : `! couldn't write ${path.join(dir, ACTIVITY_FILE)} (read-only?)`);
}

// Run as a command, not when push.ts or status.ts import it.
if (process.argv[1]?.endsWith(`${path.sep}activity.ts`)) {
  main().catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  });
}
