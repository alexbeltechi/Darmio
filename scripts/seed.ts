/**
 * Load an example site into the database in `.env.local`: its settings,
 * categories, media, posts and pages, all marked as examples. The same as
 * choosing it on the setup screen or in Settings › Examples; the folder's
 * format is in src/lib/cms/examples.ts.
 *
 * Usage: npm run seed -- ilo
 *
 * Anything already there (a category or an entry with the same slug) is
 * left alone, so running it twice changes nothing.
 */

import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error("Usage: npm run seed -- <name>   (a folder in seed/, e.g. ilo)");
    process.exit(1);
  }

  // Imported after dotenv so the database helper sees MONGODB_URI.
  const { loadExampleSite } = await import("../src/lib/cms/examples");
  const made = await loadExampleSite(name, (line) => console.log(line));
  console.log(`Done. ${made.media} media files; everything is published and marked as an example.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
