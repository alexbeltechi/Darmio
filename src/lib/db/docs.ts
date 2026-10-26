/**
 * Docs: Markdown that guides the work rather than appearing on the site. A
 * page's brief, source material for a post, a site-wide guide for agents.
 *
 * Every doc is visible and editable in admin › Agent, so nothing an agent
 * writes lives on the server unseen. Posts and pages attach docs by id in
 * their `docs` field (as they do categories); a doc's usage is worked out
 * from those references, and deleting a doc removes them.
 */

import type { Actor } from "@/lib/agent/actor";
import { Collections, getDb, withoutId } from "@/lib/db/mongodb";

import type { Doc, DocKind, DocLink, DocStage, DocUsage, DocWithUsage } from "@/lib/cms/docs";

export * from "@/lib/cms/docs";

const docs = async () => (await getDb()).collection(Collections.DOCS);

/** Every entry (live or unpublished changes) that lists one of these docs. */
async function usageFor(ids: string[]): Promise<Map<string, DocUsage[]>> {
  const db = await getDb();
  const entries = await db
    .collection(Collections.ENTRIES)
    .find(
      { $or: [{ "data.docs": { $in: ids } }, { "pendingData.docs": { $in: ids } }] },
      { projection: { collection: 1, slug: 1, data: 1, pendingData: 1 } }
    )
    .toArray();

  const usage = new Map<string, DocUsage[]>(ids.map((id) => [id, []]));
  for (const entry of entries) {
    const working = { ...entry.data, ...entry.pendingData } as Record<string, unknown>;
    const attached = new Set([...((entry.data?.docs as string[]) || []), ...((entry.pendingData?.docs as string[]) || [])]);
    for (const id of attached) {
      usage.get(id)?.push({
        collection: entry.collection,
        slug: entry.slug,
        title: String(working.title || entry.slug),
      });
    }
  }
  return usage;
}

/** All docs, newest first, each with where it's used. */
export async function listDocs(): Promise<DocWithUsage[]> {
  const all = (await (await docs()).find({}).sort({ updatedAt: -1 }).toArray()).map((d) => withoutId<Doc>(d));
  const usage = await usageFor(all.map((d) => d.id));
  return all.map((d) => ({ ...d, usedBy: usage.get(d.id) || [] }));
}

export async function getDoc(id: string): Promise<DocWithUsage | null> {
  const doc = withoutId<Doc>(await (await docs()).findOne({ id }));
  if (!doc) return null;
  return { ...doc, usedBy: (await usageFor([id])).get(id) || [] };
}

export async function createDoc(input: {
  title: string;
  kind: DocKind;
  body: string;
  filename?: string;
  stage?: DocStage;
  links?: DocLink[];
  createdBy: Actor;
}): Promise<Doc> {
  const now = new Date().toISOString();
  const doc: Doc = { id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now };
  if (!doc.filename) delete doc.filename;
  if (!doc.stage) delete doc.stage;
  if (!doc.links?.length) delete doc.links;
  await (await docs()).insertOne({ ...doc });
  return doc;
}

export async function updateDoc(
  id: string,
  updates: Partial<Pick<Doc, "title" | "kind" | "body" | "stage" | "links" | "filename">>
): Promise<Doc | null> {
  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (updates.title !== undefined) set.title = updates.title;
  if (updates.kind !== undefined) set.kind = updates.kind;
  if (updates.body !== undefined) set.body = updates.body;
  if (updates.stage !== undefined) set.stage = updates.stage;
  if (updates.filename !== undefined) set.filename = updates.filename;
  if (updates.links !== undefined) set.links = updates.links;
  const result = await (await docs()).findOneAndUpdate({ id }, { $set: set }, { returnDocument: "after" });
  return withoutId<Doc>(result);
}

/** Delete a doc and detach it from every post and page that lists it. */
export async function deleteDoc(id: string): Promise<boolean> {
  const result = await (await docs()).deleteOne({ id });
  if (result.deletedCount === 0) return false;
  const entries = (await getDb()).collection(Collections.ENTRIES);
  await entries.updateMany({ "data.docs": id }, { $pull: { "data.docs": id } } as never);
  await entries.updateMany({ "pendingData.docs": id }, { $pull: { "pendingData.docs": id } } as never);
  return true;
}

/** A title from a file name: "services-brief.md" → "Services brief". */
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.(md|markdown|txt)$/i, "").replace(/[-_]+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Untitled doc";
}
