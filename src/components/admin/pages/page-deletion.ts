import type { PageDeletionPlan } from "@/lib/db/page-cascade";

const list = (items: { title: string }[]) => items.map((i) => i.title).join(", ");

/**
 * The confirm text for deleting a page: what goes with it (its wireframes,
 * the docs only it uses) and what stays (docs used elsewhere), from the
 * delete route's dry run.
 */
export async function describePageDeletion(slug: string): Promise<string> {
  const fallback =
    "This page will be deleted for good, with its wireframes and the docs only it uses. This can't be undone.";
  try {
    const res = await fetch(`/api/admin/collections/pages/entries/${slug}?dryRun=1`, { method: "DELETE" });
    if (!res.ok) return fallback;
    const plan = (await res.json()) as PageDeletionPlan;
    const goes: string[] = [];
    if (plan.wireframes.length) {
      goes.push(
        `${plan.wireframes.length === 1 ? "its wireframe" : `its ${plan.wireframes.length} wireframes`} (${list(plan.wireframes)})`,
      );
    }
    if (plan.docs.length)
      goes.push(`${plan.docs.length === 1 ? "its doc" : `its ${plan.docs.length} docs`} (${list(plan.docs)})`);
    const kept = plan.keptDocs.length ? ` ${list(plan.keptDocs)} stays, as other posts or pages use it.` : "";
    return `This page will be deleted for good${goes.length ? `, with ${goes.join(" and ")}` : ""}.${kept} This can't be undone.`;
  } catch {
    return fallback;
  }
}
