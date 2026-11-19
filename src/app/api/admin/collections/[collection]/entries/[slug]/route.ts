import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getEntry, updateEntry, deleteEntry } from "@/lib/db/entries";
import { getCollection } from "@/lib/cms/schema";
import { pageSlugError } from "@/lib/db/page-slugs";
import { getActor } from "@/lib/agent/actor";
import { deletePageBelongings, pageDeletionPlan } from "@/lib/db/page-cascade";
import { deletePlannedMedia, mediaDeletionPlan } from "@/lib/cms/entry-media-cascade";
import { removeCustomPageOf } from "@/lib/cms/custom-page-files";
import { logActivity } from "@/lib/db/activity";

// GET /api/admin/collections/[collection]/entries/[slug] - Get single entry (any status)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string; slug: string }> }
) {
  const { collection, slug } = await params;

  const schema = await getCollection(collection);
  if (!schema) {
    return NextResponse.json(
      { error: `Collection "${collection}" not found` },
      { status: 404 }
    );
  }

  const entry = await getEntry(collection, slug);

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ data: entry });
}

// PATCH /api/admin/collections/[collection]/entries/[slug] - Update entry
// `stage: true` saves `data` as unpublished changes on a published entry (the
// site keeps the live version until /api/admin/publish); `pendingData: null`
// discards them, and an object merges into them when there are some (so a
// setting saved straight to the live entry isn't undone by the next publish).
// Without either it writes the live entry, as before.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ collection: string; slug: string }> }
) {
  const { collection, slug } = await params;

  const schema = await getCollection(collection);
  if (!schema) {
    return NextResponse.json(
      { error: `Collection "${collection}" not found` },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const actor = getActor(request);

    // Pages: a new slug mustn't belong to a system page or an admin route.
    if (body.slug && body.slug !== slug) {
      const slugError = await pageSlugError(collection, body.slug);
      if (slugError) {
        return NextResponse.json({ error: slugError }, { status: 400 });
      }
    }

    const result = await updateEntry(collection, slug, {
      slug: body.slug,
      status: body.status,
      data: body.data,
      publishedAt: body.publishedAt,
      metadata: body.metadata,
      source: body.source,
      stage: body.stage === true,
      pendingData:
        body.pendingData === null
          ? null
          : body.pendingData && typeof body.pendingData === "object" && !Array.isArray(body.pendingData)
            ? (body.pendingData as Record<string, unknown>)
            : undefined,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Revalidate public pages when the live version changed, or the post
    // came off the site (unpublished)
    if (!body.stage && (result.entry?.status === "published" || body.status)) {
      revalidatePath("/", "layout");
      revalidatePath(collection === "pages" ? `/${result.entry?.slug || slug}` : `/post/${result.entry?.slug || slug}`, "page");
    }

    const entry = result.entry;
    await logActivity({
      actor,
      action: `${collection === "pages" ? "page" : "post"}.${body.pendingData === null ? "discard" : body.status ? (body.status === "published" ? "publish" : "unpublish") : "edit"}`,
      target: entry?.slug || slug,
      label: String({ ...entry?.data, ...entry?.pendingData }.title || slug),
      detail: body.stage && entry?.status === "published" ? "as unpublished changes" : undefined,
    });

    return NextResponse.json({ data: result.entry });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// DELETE /api/admin/collections/[collection]/entries/[slug] - Delete entry.
// A page takes its wireframes and the docs only it uses with it (see
// lib/db/page-cascade.ts). Media goes only when asked: the body's
// `deleteMedia` lists the ids to remove, and only those nothing else uses are
// (lib/cms/entry-media-cascade.ts). A post's custom page goes with it, code
// and all, unless another post uses it (lib/cms/custom-page-files.ts). `?dryRun=1` returns both plans (`media`:
// what could go, `keptMedia`: used elsewhere) without deleting.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ collection: string; slug: string }> }
) {
  const { collection, slug } = await params;

  const schema = await getCollection(collection);
  if (!schema) {
    return NextResponse.json(
      { error: `Collection "${collection}" not found` },
      { status: 404 }
    );
  }

  // Get entry before deleting to check if it was published
  const entry = await getEntry(collection, slug);
  const wasPublished = entry?.status === "published";
  const plan = collection === "pages" && entry ? await pageDeletionPlan(entry) : null;

  if (new URL(request.url).searchParams.get("dryRun") === "1") {
    if (!entry) return NextResponse.json({ error: `Entry "${slug}" not found` }, { status: 404 });
    return NextResponse.json({ dryRun: true, ...plan, ...(await mediaDeletionPlan(entry)) });
  }

  const body: { deleteMedia?: unknown } = await request.json().catch(() => ({}));
  const confirmedMedia = Array.isArray(body.deleteMedia) ? body.deleteMedia.filter((id): id is string => typeof id === "string") : [];
  // Planned before the entry goes, so its own use doesn't count as "elsewhere".
  const mediaPlan = entry && confirmedMedia.length ? await mediaDeletionPlan(entry) : null;

  const result = await deleteEntry(collection, slug);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  if (entry && plan) await deletePageBelongings(entry, plan);
  const deletedMedia = mediaPlan ? await deletePlannedMedia(mediaPlan, confirmedMedia) : [];
  const customPage = entry ? await removeCustomPageOf({ ...entry.data, ...entry.pendingData }) : null;

  // Revalidate public pages if the entry was published
  if (wasPublished) {
    revalidatePath("/", "layout");
  }

  await logActivity({
    actor: getActor(request),
    action: `${collection === "pages" ? "page" : "post"}.delete`,
    target: slug,
    label: String(entry?.data.title || slug),
    detail: belongingsLabel(plan?.wireframes.length ?? 0, plan?.docs.length ?? 0, deletedMedia.length),
  });

  return NextResponse.json({ success: true, deleted: { ...plan, media: deletedMedia, ...(customPage ? { customPage } : {}) } });
}

/** "with 2 wireframes, 1 doc, 23 media items", or undefined when nothing else went. */
function belongingsLabel(wireframes: number, docs: number, media: number): string | undefined {
  const count = (n: number, word: string) => (n ? `${n} ${word}${n === 1 ? "" : "s"}` : "");
  const parts = [count(wireframes, "wireframe"), count(docs, "doc"), count(media, "media item")].filter(Boolean);
  return parts.length ? `with ${parts.join(", ")}` : undefined;
}
