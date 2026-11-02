import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MIGRATIONS,
  SCHEMA_VERSION,
  STORED_TYPES,
  migrateStored,
  storedVersion,
  withSchemaVersion,
  type MigrationStep,
  type StoredType,
} from "./schema-version";

// An invented history of three versions, so older, same and newer can all be
// tested while the real core is still at version 1. Like real steps, each
// leaves a thing already in its shape as it is.
const STEPS: MigrationStep[] = [
  {
    to: 2,
    migrate: {
      entry: ({ heading, ...doc }) => (heading === undefined ? doc : { ...doc, title: heading }),
      media: (doc) => ({ ...doc, alt: doc.alt ?? "" }),
    },
  },
  {
    to: 3,
    migrate: {
      entry: (doc) => ({ ...doc, tags: [...new Set([...((doc.tags as string[]) ?? []), "imported"])] }),
    },
  },
];
const at3 = { steps: STEPS, current: 3 };

describe("migrateStored", () => {
  it("runs every step up from an older version, in order", () => {
    const doc = { id: "a1", heading: "Rust and chrome", schemaVersion: 1 };
    const result = migrateStored("entry", doc, at3);
    assert.equal(result.status, "older");
    assert.equal(result.from, 1);
    assert.deepEqual(result.doc, { id: "a1", title: "Rust and chrome", tags: ["imported"], schemaVersion: 3 });
  });

  it("runs only the steps after the version it's in", () => {
    const doc = { id: "a2", title: "Already renamed", tags: ["bikes"], schemaVersion: 2 };
    const result = migrateStored("entry", doc, at3);
    assert.equal(result.status, "older");
    assert.equal(result.from, 2);
    assert.deepEqual(result.doc, { id: "a2", title: "Already renamed", tags: ["bikes", "imported"], schemaVersion: 3 });
  });

  it("treats a row without a version as version 1", () => {
    const result = migrateStored("entry", { id: "a3", heading: "Before versions" }, at3);
    assert.equal(result.from, 1);
    assert.equal(result.status, "older");
    assert.deepEqual(result.doc, { id: "a3", title: "Before versions", tags: ["imported"], schemaVersion: 3 });
  });

  it("leaves types a step doesn't name as they are, and stamps them", () => {
    const result = migrateStored("category", { id: "c1", label: "Frames", schemaVersion: 1 }, at3);
    assert.deepEqual(result.doc, { id: "c1", label: "Frames", schemaVersion: 3 });
    const media = migrateStored("media", { id: "m1", schemaVersion: 1 }, at3);
    assert.deepEqual(media.doc, { id: "m1", alt: "", schemaVersion: 3 });
  });

  it("copes with a row edited in a later shape but still marked older", () => {
    const doc = { id: "a7", title: "Edited by version 3", tags: ["imported"], schemaVersion: 1 };
    const result = migrateStored("entry", doc, at3);
    assert.deepEqual(result.doc, { ...doc, schemaVersion: 3 });
  });

  it("brings the same version in as it is", () => {
    const doc = { id: "a4", title: "Current", tags: [], schemaVersion: 3 };
    const result = migrateStored("entry", doc, at3);
    assert.equal(result.status, "same");
    assert.equal(result.from, 3);
    assert.deepEqual(result.doc, doc);
  });

  it("brings a newer version in as it is, keeping its version and unknown fields", () => {
    const doc = { id: "a5", title: "From the future", somethingNew: { a: 1 }, schemaVersion: 7 };
    const result = migrateStored("entry", doc, at3);
    assert.equal(result.status, "newer");
    assert.equal(result.from, 7);
    assert.deepEqual(result.doc, doc);
  });

  it("never changes the document it's given", () => {
    const doc = { id: "a6", heading: "Untouched", schemaVersion: 1 };
    const copy = structuredClone(doc);
    migrateStored("entry", doc, at3);
    assert.deepEqual(doc, copy);
  });

  it("rejects a version that isn't a whole number from 1", () => {
    for (const schemaVersion of [0, -1, 1.5, "2", true, Number.NaN]) {
      assert.throws(() => migrateStored("entry", { id: "x", schemaVersion }, at3), /schemaVersion must be/);
    }
  });

  it("rejects an unknown type", () => {
    assert.throws(() => migrateStored("user" as StoredType, { id: "u1" }, at3), /type must be one of/);
  });

  it("rejects steps with a gap or out of order", () => {
    assert.throws(() => migrateStored("entry", { id: "x" }, { steps: [STEPS[1]], current: 3 }), /in order/);
    assert.throws(() => migrateStored("entry", { id: "x" }, { steps: STEPS, current: 4 }), /needs 3 migration steps/);
  });

  it("works for every stored type with the core's own steps", () => {
    for (const type of STORED_TYPES) {
      const result = migrateStored(type, { id: `${type}-1` });
      assert.equal(result.status, SCHEMA_VERSION === 1 ? "same" : "older");
      assert.equal(result.doc.schemaVersion, SCHEMA_VERSION);
    }
  });
});

describe("the core's version", () => {
  it("has one step for each version after 1", () => {
    assert.equal(MIGRATIONS.length, SCHEMA_VERSION - 1);
  });

  it("is what new rows are stamped with, unless they already say their version", () => {
    assert.equal(withSchemaVersion({ id: "n1" }).schemaVersion, SCHEMA_VERSION);
    assert.equal(withSchemaVersion({ id: "n2", schemaVersion: SCHEMA_VERSION + 4 }).schemaVersion, SCHEMA_VERSION + 4);
  });

  it("rejects an own version that isn't a whole number from 1", () => {
    for (const schemaVersion of [0, -1, 1.5, "2", true, Number.NaN]) {
      const bad = { id: "bad", schemaVersion } as Record<string, unknown>;
      assert.throws(() => withSchemaVersion(bad), /schemaVersion must be/);
    }
  });

  it("reads a missing version as 1", () => {
    assert.equal(storedVersion({}), 1);
    assert.equal(storedVersion({ schemaVersion: null }), 1);
  });
});
