/**
 * Wireframes: self-contained HTML sketches of a page (see lib/cms/wireframes.ts).
 * Shown in the page's editor, opened and downloaded as plain files, and
 * deleted with their page.
 */

import type { Actor } from "@/lib/agent/actor";
import type { Wireframe, WireframeSummary } from "@/lib/cms/wireframes";
import { Collections, getDb, withoutId } from "@/lib/db/mongodb";

export * from "@/lib/cms/wireframes";

const wireframes = async () => (await getDb()).collection(Collections.WIREFRAMES);

function summary(doc: Record<string, unknown>): WireframeSummary {
  const { html, ...rest } = withoutId<Wireframe>(doc);
  return { ...rest, bytes: Buffer.byteLength(String(html || "")) };
}

/** A page's wireframes, newest first, without their HTML. */
export async function listWireframes(pageId: string): Promise<WireframeSummary[]> {
  const docs = await (await wireframes()).find({ pageId }).sort({ createdAt: -1 }).toArray();
  return docs.map(summary);
}

export async function getWireframe(id: string): Promise<Wireframe | null> {
  const doc = await (await wireframes()).findOne({ id }, { projection: { _id: 0 } });
  return (doc as unknown as Wireframe) || null;
}

export async function createWireframe(input: {
  pageId: string;
  title: string;
  html: string;
  filename?: string;
  createdBy: Actor;
}): Promise<WireframeSummary> {
  const now = new Date().toISOString();
  const doc: Wireframe = { id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now };
  if (!doc.filename) delete doc.filename;
  await (await wireframes()).insertOne({ ...doc });
  return summary({ ...doc });
}

export async function updateWireframe(
  id: string,
  updates: { title?: string; html?: string },
): Promise<WireframeSummary | null> {
  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (updates.title !== undefined) set.title = updates.title;
  if (updates.html !== undefined) set.html = updates.html;
  const result = await (await wireframes()).findOneAndUpdate({ id }, { $set: set }, { returnDocument: "after" });
  return result ? summary(result) : null;
}

export async function deleteWireframe(id: string): Promise<boolean> {
  return (await (await wireframes()).deleteOne({ id })).deletedCount > 0;
}

/** Delete every wireframe of a page; returns how many went. */
export async function deletePageWireframes(pageId: string): Promise<number> {
  return (await (await wireframes()).deleteMany({ pageId })).deletedCount;
}
