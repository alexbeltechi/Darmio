/**
 * MongoDB Media Storage
 * 
 * Direct MongoDB operations for media items.
 * Each media item is stored as an individual document (WordPress-style).
 * 
 * This replaces the storage adapter pattern with proper MongoDB best practices.
 */

import { storedBytes } from "@/lib/cms/stored-bytes";
import { getDb, Collections, withoutId } from "@/lib/db/mongodb";
import type { MediaItem } from "@/lib/cms/types";

/**
 * List all media items with optional filtering and pagination
 */
export async function listMedia(options: {
  limit?: number;
  offset?: number;
  mime?: string;
  tags?: string[];
  sortBy?: "uploadedAt" | "createdAt" | "filename" | "size";
  sortDir?: "asc" | "desc";
} = {}): Promise<{ items: MediaItem[]; total: number }> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  // Build filter - exclude old storage adapter documents
  const filter: Record<string, unknown> = {
    // Only get actual media documents (not the old index.json wrapper)
    id: { $exists: true },
  };

  if (options.mime) {
    filter.mime = { $regex: `^${options.mime}` };
  }

  if (options.tags && options.tags.length > 0) {
    filter.tags = { $in: options.tags };
  }

  const total = await collection.countDocuments(filter);

  const sortField = options.sortBy || "uploadedAt";
  const sortDir = options.sortDir === "asc" ? 1 : -1;

  const limit = options.limit || 1000;
  const offset = options.offset || 0;

  const docs = await collection
    .find(filter)
    .sort({ [sortField]: sortDir })
    .skip(offset)
    .limit(limit)
    .toArray();

  const items = docs.map((doc) => {
    return withoutId<MediaItem>(doc);
  });

  return { items, total };
}

export async function getMediaById(id: string): Promise<MediaItem | null> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  const doc = await collection.findOne({ id });
  if (!doc) return null;

  return withoutId<MediaItem>(doc);
}

/**
 * Look up an already-uploaded item by content hash, so repeat ingest runs
 * reuse the existing asset instead of duplicating it.
 */
export async function getMediaBySha256(sha256: string): Promise<MediaItem | null> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  const doc = await collection.findOne({ sha256 });
  if (!doc) return null;

  return withoutId<MediaItem>(doc);
}

export async function getMediaByIds(ids: string[]): Promise<MediaItem[]> {
  if (ids.length === 0) return [];

  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  const docs = await collection.find({ id: { $in: ids } }).toArray();

  const mediaMap = new Map(docs.map((doc) => [doc.id as string, withoutId<MediaItem>(doc)]));

  // Return items in the same order as the input ids array
  return ids
    .map((id) => mediaMap.get(id))
    .filter((item): item is MediaItem => item !== undefined);
}

export async function createMedia(media: MediaItem): Promise<MediaItem> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  await collection.insertOne(media as unknown as Record<string, unknown>);

  return media;
}

export async function updateMedia(
  id: string,
  updates: Partial<Omit<MediaItem, "id">>
): Promise<MediaItem | null> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  const result = await collection.findOneAndUpdate(
    { id },
    { 
      $set: { 
        ...updates, 
        updatedAt: new Date().toISOString() 
      } 
    },
    { returnDocument: "after" }
  );

  if (!result) return null;

  return withoutId<MediaItem>(result);
}

export async function deleteMedia(id: string): Promise<boolean> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  const result = await collection.deleteOne({ id });
  return result.deletedCount > 0;
}

/**
 * Bytes the whole library takes in storage (see storedBytes), and how many
 * items are still in the older format (no renditions).
 */
export async function mediaStorageUsage(): Promise<{ bytes: number; items: number; legacyItems: number }> {
  const db = await getDb();
  const docs = await db
    .collection(Collections.MEDIA)
    .find({ id: { $exists: true } })
    .project({ url: 1, size: 1, renditions: 1, fallback: 1, variants: 1, original: 1, mime: 1 })
    .toArray();
  let bytes = 0;
  let legacyItems = 0;
  for (const doc of docs) {
    const item = doc as unknown as MediaItem;
    bytes += storedBytes(item);
    if (item.mime?.startsWith("image/") && !item.renditions?.length) legacyItems++;
  }
  return { bytes, items: docs.length, legacyItems };
}
