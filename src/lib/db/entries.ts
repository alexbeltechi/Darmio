/**
 * MongoDB Storage Implementation
 * 
 * Replaces file-based storage with MongoDB for content entries
 */

import { getDb, Collections, withoutId } from "@/lib/db/mongodb";
import type { ContentSource, Entry, EntryStatus } from "@/lib/cms/types";
import { getCollection, validateEntryData } from "@/lib/cms/schema";
import { slugify } from "@/lib/slug";

/**
 * An entry as the public may see it: without `pendingData`, the edits to a
 * published entry that haven't been published yet. Every public read (site
 * pages, the public API) goes through this, so unpublished work never ships
 * in HTML or JSON.
 */
export function withoutPending<T extends Entry>(entry: T): T {
  if (!("pendingData" in entry)) return entry;
  const rest = { ...entry };
  delete rest.pendingData;
  return rest;
}

/** Write an entry back, dropping `pendingData` from the document when it's gone. */
async function saveDoc(collection: string, slug: string, entry: Entry) {
  const db = await getDb();
  const { pendingData, ...rest } = entry;
  await db.collection(Collections.ENTRIES).updateOne(
    { collection, slug },
    pendingData ? { $set: { ...rest, pendingData } } : { $set: rest, $unset: { pendingData: "" } }
  );
}

export async function listEntries(
  collection: string,
  options: {
    status?: EntryStatus;
    limit?: number;
    offset?: number;
    sortField?: string;
    sortDirection?: "asc" | "desc";
  } = {}
): Promise<{ entries: Entry[]; total: number }> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  const filter: Record<string, unknown> = { collection };
  if (options.status) {
    filter.status = options.status;
  }

  const total = await entriesCollection.countDocuments(filter);

  const sortField = options.sortField || "createdAt";
  const sortDir = options.sortDirection === "asc" ? 1 : -1;
  const sort: { [key: string]: 1 | -1 } = { [sortField]: sortDir as 1 | -1 };

  const limit = options.limit || 1000;
  const offset = options.offset || 0;

  const cursor = entriesCollection
    .find(filter)
    .sort(sort)
    .skip(offset)
    .limit(limit);

  const rawEntries = await cursor.toArray();
  
  const entries = rawEntries.map((doc) => {
    return withoutId<Entry>(doc);
  });

  return { entries, total };
}

export async function getEntry(
  collection: string,
  slug: string
): Promise<Entry | null> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  const doc = await entriesCollection.findOne({ collection, slug });
  if (!doc) return null;
  
  return withoutId<Entry>(doc);
}

export async function createEntry(
  collection: string,
  data: {
    title?: string;
    slug?: string;
    status?: EntryStatus;
    data: Record<string, unknown>;
    publishedAt?: string | null;
    metadata?: Record<string, unknown>;
    source?: ContentSource;
  }
): Promise<{ entry?: Entry; error?: string }> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  const schema = await getCollection(collection);
  if (!schema) {
    return { error: `Collection "${collection}" not found` };
  }

  // Validate data against schema (required fields only enforced when publishing)
  const status = data.status || "draft";
  const validation = validateEntryData(schema, data.data, status);
  if (!validation.valid) {
    return { error: validation.errors.join(", ") };
  }

  const titleField = schema.admin.titleField;
  const title = (data.data[titleField] as string) || data.title || "untitled";
  let slug = data.slug || slugify(title);

  const existing = await getEntry(collection, slug);
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const now = new Date().toISOString();

  const entry: Entry = {
    id: crypto.randomUUID(),
    collection,
    slug,
    status: data.status || "draft",
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    // An explicit publishedAt lets archive imports sort by their real date
    // rather than their upload time (the public feed sorts on this field).
    publishedAt:
      data.publishedAt !== undefined
        ? data.publishedAt
        : data.status === "published"
          ? now
          : null,
    authorId: null,
    data: data.data as Entry["data"],
    metadata: data.metadata,
    source: data.source || { origin: "web", ingestedAt: now },
  };

  await entriesCollection.insertOne(entry as unknown as Record<string, unknown>);

  return { entry };
}

export async function updateEntry(
  collection: string,
  slug: string,
  updates: {
    slug?: string;
    status?: EntryStatus;
    data?: Record<string, unknown>;
    publishedAt?: string | null;
    metadata?: Record<string, unknown>;
    source?: ContentSource;
    /**
     * Save `data` as the editor's working copy rather than the live one. On a
     * published entry it goes to `pendingData` and the site doesn't change
     * until `publishEntry`; on a draft (nothing live) it's written to `data`.
     */
    stage?: boolean;
    /**
     * `null` discards the unpublished changes. An object merges into them,
     * only when there are some: for background writes (cross-post results,
     * media swaps) that must survive the next publish.
     */
    pendingData?: Record<string, unknown> | null;
  }
): Promise<{ entry?: Entry; error?: string }> {
  const existing = await getEntry(collection, slug);
  if (!existing) {
    return { error: `Entry "${slug}" not found in "${collection}"` };
  }

  const schema = await getCollection(collection);
  if (!schema) {
    return { error: `Collection "${collection}" not found` };
  }

  const { stage, pendingData: pendingUpdate, ...rawFields } = updates;
  // A field left out must keep the entry's own value: spreading an explicit
  // `undefined` over it would be saved as null (autosave sends no status).
  const fields = Object.fromEntries(Object.entries(rawFields).filter(([, value]) => value !== undefined)) as typeof rawFields;
  const status = fields.status || existing.status;
  const staging = Boolean(stage && fields.data && existing.status === "published" && status === "published");

  // Live data: untouched while staging a published entry. A published entry
  // going back to draft takes its unpublished changes with it, as there's no
  // longer a live version to keep them apart from.
  let mergedData = existing.data as Record<string, unknown>;
  let pendingData = existing.pendingData as Record<string, unknown> | undefined;
  if (staging) {
    pendingData = { ...existing.data, ...pendingData, ...fields.data };
    // Edited back to exactly what's live: nothing left to publish.
    if (JSON.stringify({ ...existing.data, ...pendingData }) === JSON.stringify(existing.data)) pendingData = undefined;
  } else {
    if (status !== "published" && pendingData) {
      mergedData = { ...mergedData, ...pendingData };
      pendingData = undefined;
    }
    if (fields.data) mergedData = { ...mergedData, ...fields.data };
  }
  if (pendingUpdate === null) pendingData = undefined;
  else if (pendingUpdate && pendingData) pendingData = { ...pendingData, ...pendingUpdate };

  // Validate what will be live. Staged edits are checked when they're published.
  const validation = validateEntryData(schema, mergedData, status);
  if (!validation.valid) {
    return { error: validation.errors.join(", ") };
  }

  const now = new Date().toISOString();

  // Handle slug change - track previous slugs for redirect mapping on migration
  let newSlug = slug;
  let previousSlugs = existing.previousSlugs || [];
  if (updates.slug && updates.slug !== slug) {
    const slugExists = await getEntry(collection, updates.slug);
    if (slugExists) {
      return { error: `Slug "${updates.slug}" is already in use` };
    }
    // Track the old slug for redirect mapping (deduplicate)
    if (!previousSlugs.includes(slug)) {
      previousSlugs = [...previousSlugs, slug];
    }
    newSlug = updates.slug;
  }

  const updated = {
    ...existing,
    ...fields,
    slug: newSlug,
    previousSlugs,
    data: mergedData as Entry["data"],
    pendingData: pendingData as Entry["pendingData"],
    metadata: updates.metadata ?? existing.metadata,
    source: updates.source ?? existing.source,
    updatedAt: now,
    publishedAt:
      fields.publishedAt !== undefined
        ? fields.publishedAt
        : fields.status === "published" && !existing.publishedAt
          ? now
          : existing.publishedAt,
  } as Entry;

  await saveDoc(collection, slug, updated);
  return { entry: updated };
}

/**
 * Publish an entry: its unpublished changes become the live version, or a
 * draft goes live. A draft that's never been published takes its slug from
 * its title here (drafts keep their placeholder slug while being written, so
 * autosave never moves the page under you).
 */
export async function publishEntry(collection: string, slug: string): Promise<{ entry?: Entry; error?: string }> {
  const existing = await getEntry(collection, slug);
  if (!existing) return { error: `Entry "${slug}" not found` };

  const data = { ...existing.data, ...existing.pendingData } as Record<string, unknown>;

  let newSlug: string | undefined;
  // A post's first publish takes its slug from the final title; a page keeps
  // the URL it was given.
  if (collection !== "pages" && !existing.publishedAt && typeof data.title === "string" && data.title.trim()) {
    const fromTitle = slugify(data.title);
    if (fromTitle && fromTitle !== slug && !(await getEntry(collection, fromTitle))) newSlug = fromTitle;
  }

  return updateEntry(collection, slug, { status: "published", data, pendingData: null, slug: newSlug });
}

export async function deleteEntry(
  collection: string,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  const result = await entriesCollection.deleteOne({ collection, slug });
  
  if (result.deletedCount === 0) {
    return { success: false, error: `Entry "${slug}" not found` };
  }

  return { success: true };
}

/**
 * Get all published entries (for public site)
 */
export async function getPublishedEntries(
  collection?: string
): Promise<Entry[]> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  const filter: Record<string, unknown> = { status: "published" };
  if (collection) {
    filter.collection = collection;
  }

  const rawEntries = await entriesCollection
    .find(filter)
    .sort({ publishedAt: -1, createdAt: -1 })
    .toArray();

  return rawEntries.map((doc) => {
    return withoutPending(withoutId<Entry>(doc));
  });
}

