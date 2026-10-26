import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { listEntries, createEntry } from "@/lib/db/entries";
import { slugify } from "@/lib/slug";
import { pageSlugError } from "@/lib/db/page-slugs";
import { getCollection } from "@/lib/cms/schema";
import type { EntryStatus } from "@/lib/cms/types";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";
import { parsePostFields, summarizePost } from "@/lib/agent/summary";

// GET /api/admin/collections/[collection]/entries - List all entries (including drafts)
//
// For agents, compact lists: `fields=slug,title,status` (or `fields=summary`
// for the defaults) returns only those, from the version being edited.
// `q=` filters by title or slug; `changes=1` keeps published posts with
// unpublished changes. Without `fields`, entries come back whole, as before.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;

    const schema = await getCollection(collection);
    if (!schema) {
      return NextResponse.json(
        { error: `Collection "${collection}" not found` },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status") as EntryStatus | null;

    const fields = parsePostFields(searchParams.get("fields"));
    const q = searchParams.get("q")?.trim().toLowerCase();
    const changesOnly = searchParams.get("changes") === "1";

    // Searching or filtering by changes looks across everything, then pages.
    const filtering = Boolean(q || changesOnly);
    const listed = await listEntries(collection, {
      status: status || undefined,
      limit: filtering ? 10000 : limit,
      offset: filtering ? 0 : offset,
      sortField: schema.admin.defaultSort.field,
      sortDirection: schema.admin.defaultSort.direction,
    });
    let { entries, total } = listed;
    if (filtering) {
      entries = entries.filter((e) => {
        const title = String({ ...e.data, ...e.pendingData }.title || "").toLowerCase();
        if (q && !title.includes(q) && !e.slug.includes(q)) return false;
        if (changesOnly && !(e.status === "published" && e.pendingData)) return false;
        return true;
      });
      total = entries.length;
      entries = entries.slice(offset, offset + limit);
    }

    if (fields) {
      return NextResponse.json({ data: entries.map((e) => summarizePost(e, fields)), total, limit, offset });
    }

    return NextResponse.json({
      data: entries,
      total,
      limit,
      offset,
    });
  } catch (error) {
    if (isDatabaseError(error)) {
      return handleDatabaseError(error);
    }
    throw error;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  const { collection } = await params;

  const schema = await getCollection(collection);
  if (!schema) {
    return NextResponse.json(
      { error: `Collection "${collection}" not found` },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();

    // Pages: the slug (given, or made from the title as createEntry would)
    // mustn't belong to a system page or an admin route.
    const titleField = schema.admin.titleField;
    const slugError = await pageSlugError(
      collection,
      body.slug || slugify(String(body.data?.[titleField] || body.title || ""))
    );
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    const actor = getActor(request);

    const result = await createEntry(collection, {
      slug: body.slug,
      status: body.status || "draft",
      data: body.data || {},
      publishedAt: body.publishedAt,
      metadata: body.metadata,
      source: body.source,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Revalidate public pages when publishing
    if (body.status === "published") {
      revalidatePath("/", "layout");
    }

    await logActivity({
      actor,
      action: `${collection === "pages" ? "page" : "post"}.create`,
      target: result.entry?.slug || "",
      label: String(result.entry?.data.title || result.entry?.slug || ""),
      detail: result.entry?.status === "published" ? "published" : "as a draft",
    });

    return NextResponse.json({ data: result.entry }, { status: 201 });
  } catch (error) {
    if (isDatabaseError(error)) {
      return handleDatabaseError(error);
    }
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}






