/**
 * Migration: move gallery blocks saved as "large" or "normal" (the old
 * default, never chosen) to the "auto" width, which sizes a gallery by how
 * many images it holds (decisions, 2026-10-20). "full" stays as it is.
 * Covers the live version and any unpublished changes, so a published post
 * doesn't pick up a pending change from this.
 *
 * Dry run by default (read-only). Pass --apply to write.
 * Usage: npx tsx scripts/migrate-gallery-width-auto.ts [--apply]
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
const apply = process.argv.includes("--apply");

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in environment");
  process.exit(1);
}

type Block = { type: string; width?: string; mediaIds?: string[]; [key: string]: unknown };

/** The content with old-default widths moved to auto, and how many galleries changed. */
function migrate(content: Block[] | undefined): { next: Block[]; changed: number } {
  let changed = 0;
  const next = (content ?? []).map((b) => {
    if (b.type !== "gallery" || b.width === "auto" || b.width === "full") return b;
    changed++;
    return { ...b, width: "auto" };
  });
  return { next, changed };
}

async function main() {
  const client = new MongoClient(MONGODB_URI!);
  try {
    await client.connect();
    const entries = client.db().collection("entries");
    const docs = await entries
      .find({
        $or: [
          { "data.content": { $elemMatch: { type: "gallery" } } },
          { "pendingData.content": { $elemMatch: { type: "gallery" } } },
        ],
      })
      .toArray();

    let total = 0;
    let fullWidthNow = 0;
    for (const doc of docs) {
      const live = migrate(doc.data?.content as Block[] | undefined);
      const pending = doc.pendingData?.content ? migrate(doc.pendingData.content as Block[]) : null;
      const changed = live.changed + (pending?.changed ?? 0);
      if (!changed) continue;
      total += changed;
      fullWidthNow += live.next.filter((b) => b.type === "gallery" && b.width === "auto" && (b.mediaIds?.length ?? 0) > 4).length;
      console.log(`${apply ? "updated" : "would update"}: ${doc.collection}/${doc.slug} (${changed} galleries)`);
      if (apply) {
        await entries.updateOne(
          { _id: doc._id },
          { $set: { "data.content": live.next, ...(pending ? { "pendingData.content": pending.next } : {}) } }
        );
      }
    }
    console.log(
      `\n${total} galleries ${apply ? "moved" : "to move"} to auto; ${fullWidthNow} live ones hold 5+ images and will run full width` +
        (apply ? "" : " (dry run, pass --apply to write)")
    );
  } finally {
    await client.close();
  }
}

main();
