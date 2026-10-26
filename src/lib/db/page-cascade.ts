/**
 * What goes with a page when it's deleted: all its wireframes, and the docs
 * attached to it that nothing else uses. Docs other posts or pages also use
 * are kept (just detached). Used by the delete route, and by its dry run so
 * the confirm dialog can say exactly what will go.
 */

import type { Entry } from "@/lib/cms/types";
import { deleteDoc, getDoc } from "@/lib/db/docs";
import { deletePageWireframes, listWireframes } from "@/lib/db/wireframes";

export type PageDeletionPlan = {
  wireframes: { id: string; title: string }[];
  /** Attached only to this page: deleted with it. */
  docs: { id: string; title: string }[];
  /** Also used elsewhere: kept, just detached. */
  keptDocs: { id: string; title: string }[];
};

export async function pageDeletionPlan(entry: Entry): Promise<PageDeletionPlan> {
  const docIds = [
    ...new Set([...((entry.data.docs as string[]) || []), ...((entry.pendingData?.docs as string[]) || [])]),
  ];
  const plan: PageDeletionPlan = {
    wireframes: (await listWireframes(entry.id)).map(({ id, title }) => ({ id, title })),
    docs: [],
    keptDocs: [],
  };
  for (const id of docIds) {
    const doc = await getDoc(id);
    if (!doc) continue;
    const elsewhere = doc.usedBy.some((u) => !(u.collection === "pages" && u.slug === entry.slug));
    (elsewhere ? plan.keptDocs : plan.docs).push({ id, title: doc.title });
  }
  return plan;
}

/** Carry out a plan once the page itself is deleted. */
export async function deletePageBelongings(entry: Entry, plan: PageDeletionPlan): Promise<void> {
  await deletePageWireframes(entry.id);
  for (const { id } of plan.docs) await deleteDoc(id);
}
