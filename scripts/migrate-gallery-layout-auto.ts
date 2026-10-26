/**
 * Migration: move existing gallery blocks to the "auto" layout.
 *
 * Dry run by default (read-only). Pass --apply to write.
 * Usage: npx tsx scripts/migrate-gallery-layout-auto.ts [--apply]
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

type Block = { type: string; layout?: string; [key: string]: unknown };

async function main() {
  const client = new MongoClient(MONGODB_URI!);
  try {
    await client.connect();
    const entries = client.db().collection("entries");
    const docs = await entries
      .find({ "data.content": { $elemMatch: { type: "gallery" } } })
      .toArray();

    let galleries = 0;
    let changed = 0;
    for (const doc of docs) {
      const content = (doc.data?.content ?? []) as Block[];
      let dirty = false;
      const next = content.map((b) => {
        if (b.type !== "gallery") return b;
        galleries++;
        if (b.layout === "auto") return b;
        dirty = true;
        changed++;
        return { ...b, layout: "auto" };
      });
      if (!dirty) continue;
      console.log(`${apply ? "updated" : "would update"}: ${doc.collection}/${doc.slug}`);
      if (apply) await entries.updateOne({ _id: doc._id }, { $set: { "data.content": next } });
    }
    console.log(`\n${galleries} galleries, ${changed} ${apply ? "moved" : "to move"} to auto${apply ? "" : " (dry run, pass --apply to write)"}`);
  } finally {
    await client.close();
  }
}

main();
