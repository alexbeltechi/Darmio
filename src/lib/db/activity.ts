import { getDb, Collections } from "@/lib/db/mongodb";
import type { Actor } from "@/lib/agent/actor";

/**
 * The activity log: one line per change to posts and media, by Alex or an
 * agent. Read-only history (nothing here undoes anything); it answers "what
 * changed, when, and who did it". Writing to it never fails the change
 * itself.
 */
export type Activity = {
  at: string;
  actor: Actor;
  /** e.g. "post.create", "post.edit", "post.publish", "media.replace". */
  action: string;
  /** The post's slug or the media item's id. */
  target: string;
  /** A human label: the post title or file name. */
  label?: string;
  /** Anything worth knowing, e.g. "as unpublished changes". */
  detail?: string;
};

export async function logActivity(entry: Omit<Activity, "at">): Promise<void> {
  try {
    const db = await getDb();
    await db.collection(Collections.ACTIVITY).insertOne({ ...entry, at: new Date().toISOString() });
  } catch (error) {
    console.error("Failed to write the activity log:", error);
  }
}

export async function listActivity(limit = 50): Promise<Activity[]> {
  const db = await getDb();
  const docs = await db
    .collection(Collections.ACTIVITY)
    .find({}, { projection: { _id: 0 } })
    .sort({ at: -1 })
    .limit(Math.min(Math.max(limit, 1), 500))
    .toArray();
  return docs as unknown as Activity[];
}
