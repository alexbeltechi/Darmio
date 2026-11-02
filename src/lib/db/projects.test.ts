import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { newProjectSettingsInsertDoc } from "./projects";
import { SETTINGS_KEY } from "@/lib/db/settings";
import { SCHEMA_VERSION } from "@/lib/cms/schema-version";

describe("createProject", () => {
  it("stamps schemaVersion on the brand-new settings row", () => {
    const name = "My Site";
    const at = new Date().toISOString();
    const doc = newProjectSettingsInsertDoc(name, at);
    assert.deepEqual(doc, { key: SETTINGS_KEY, siteName: name, updatedAt: at, schemaVersion: SCHEMA_VERSION });
  });
});

