import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { promises as fs } from "node:fs";
import path from "node:path";

async function read(rel: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), rel), "utf8");
}

describe("example loader creates schemaVersion-stamped records (by construction)", () => {
  it("entries are stamped via withSchemaVersion in createEntry", async () => {
    const src = await read("src/lib/db/entries.ts");
    assert.match(src, /withSchemaVersion\s*\(/, "createEntry should use withSchemaVersion when building the entry");
  });

  it("categories are stamped via withSchemaVersion in createCategory", async () => {
    const src = await read("src/lib/db/categories.ts");
    assert.match(src, /withSchemaVersion\s*\(/, "createCategory should use withSchemaVersion when building the category");
  });

  it("media are stamped via withSchemaVersion in db/media.createMedia", async () => {
    const src = await read("src/lib/db/media.ts");
    assert.match(src, /withSchemaVersion\s*\(\s*media\)/, "createMedia should pass through withSchemaVersion");
  });

  it("settings are stamped on first write via $setOnInsert", async () => {
    const src = await read("src/lib/db/settings.ts");
    assert.match(
      src,
      /\$setOnInsert:\s*{\s*key:\s*SETTINGS_KEY,\s*schemaVersion:\s*SCHEMA_VERSION\s*}/,
      "updateSiteSettings should set schemaVersion via $setOnInsert"
    );
  });
});

