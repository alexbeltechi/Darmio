/**
 * The shape version of everything Darmio stores, and the one step that brings
 * a stored thing from any version up to this core's.
 *
 * Every stored thing carries `schemaVersion`: the version of the shape it was
 * written in. The write paths in `src/lib/db` stamp it on a new row, and an
 * import runs `migrateStored` on each thing it brings in, so a file from an
 * older, the same or a newer core all come in.
 *
 * An edit leaves the version as it is: it rewrites some fields, not the whole
 * row, so it can't vouch that the rest is in the current shape. A row's
 * version is therefore the oldest shape it may still hold, which is why a
 * step must leave a thing already in its shape as it is.
 *
 * A row without the field was written before versions existed, which is
 * version 1: the first version is the shape the core had then.
 *
 * To change a stored shape: raise SCHEMA_VERSION and add a step to MIGRATIONS
 * with `to` set to the new version, transforming only the types that changed.
 * Steps are never edited or removed once released, as files of every older
 * version stay out there.
 */

export const SCHEMA_VERSION = 1;

/** What's stored with a version: posts and pages are both entries; docs are the agent's documents. */
export const STORED_TYPES = ["entry", "category", "media", "settings", "doc"] as const;
export type StoredType = (typeof STORED_TYPES)[number];

export type StoredDoc = Record<string, unknown>;

/** One version up: `to` is the version it produces, and each type that changed has its transform. */
export type MigrationStep = {
  to: number;
  migrate: Partial<Record<StoredType, (doc: StoredDoc) => StoredDoc>>;
};

/** Every step from version 1 up to SCHEMA_VERSION, in order. Empty while there's only version 1. */
export const MIGRATIONS: MigrationStep[] = [];

/** How a stored thing's version compares with this core's. */
export type VersionStatus = "older" | "same" | "newer";

export type MigrationResult = {
  doc: StoredDoc;
  /** The version it came in at (1 when it had none). */
  from: number;
  status: VersionStatus;
};

/** The version a stored thing is in: 1 when it has none. Throws on anything that isn't a whole number from 1. */
export function storedVersion(doc: StoredDoc): number {
  const version = doc.schemaVersion;
  if (version === undefined || version === null) return 1;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new Error(`schemaVersion must be a whole number from 1, not ${JSON.stringify(version)}`);
  }
  return version;
}

/** Throws unless the steps run 2, 3… up to `current` with none missing. */
function checkSteps(steps: MigrationStep[], current: number) {
  steps.forEach((step, i) => {
    if (step.to !== i + 2) throw new Error(`Migration steps must run 2, 3… in order; step ${i + 1} is "to: ${step.to}"`);
  });
  if (steps.length !== current - 1) {
    throw new Error(`Version ${current} needs ${current - 1} migration steps, and there are ${steps.length}`);
  }
}

/**
 * Bring a stored thing up to this core's version, for an import.
 *
 * - Older (or no version): each step from its version up runs in order, and
 *   it comes out stamped with the current version.
 * - Same: it comes in as it is.
 * - Newer: it comes in as it is, unknown fields and its own version kept, as
 *   this core can't know what a later one changed. `status` says so, so the
 *   import can tell the maker. Edits here leave its version as it is.
 *
 * Never changes `doc`. `steps` and `current` are for tests.
 */
export function migrateStored(
  type: StoredType,
  doc: StoredDoc,
  { steps = MIGRATIONS, current = SCHEMA_VERSION }: { steps?: MigrationStep[]; current?: number } = {}
): MigrationResult {
  if (!STORED_TYPES.includes(type)) throw new Error(`type must be one of: ${STORED_TYPES.join(", ")}`);
  checkSteps(steps, current);

  const from = storedVersion(doc);
  if (from > current) return { doc: { ...doc }, from, status: "newer" };
  if (from === current) return { doc: { ...doc, schemaVersion: current }, from, status: "same" };

  let migrated: StoredDoc = { ...doc };
  for (const step of steps.slice(from - 1)) {
    const transform = step.migrate[type];
    if (transform) migrated = transform(migrated);
  }
  return { doc: { ...migrated, schemaVersion: current }, from, status: "older" };
}

/**
 * A new stored thing, stamped with this core's version, or with its own when
 * it already says which it's in (an imported row that came in newer).
 */
export function withSchemaVersion<T extends object>(doc: T): T & { schemaVersion: number } {
  const own = (doc as { schemaVersion?: unknown }).schemaVersion;
  return { ...doc, schemaVersion: typeof own === "number" ? own : SCHEMA_VERSION };
}
