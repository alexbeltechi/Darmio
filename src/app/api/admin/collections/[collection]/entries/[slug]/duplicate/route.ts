import { NextResponse } from "next/server";
import { getEntry, createEntry } from "@/lib/db/entries";
import { getCollection } from "@/lib/cms/schema";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";
import { slugify } from "@/lib/slug";

export async function POST(
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

  const original = await getEntry(collection, slug);
  if (!original) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  try {
    // Create duplicate with modified title and as draft, from the post as
    // it's being edited (its unpublished changes over the live version)
    const working = { ...original.data, ...original.pendingData };
    const originalTitle = (working.title as string) || original.slug;
    const newTitle = `${originalTitle} (Copy)`;
    
    const result = await createEntry(collection, {
      title: newTitle,
      slug: slugify(newTitle),
      status: "draft", // Always create as draft
      data: {
        ...working,
        title: newTitle,
      },
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logActivity({
      actor: getActor(request),
      action: "post.duplicate",
      target: result.entry?.slug || "",
      label: String(result.entry?.data.title || ""),
      detail: `copy of ${slug}`,
    });

    return NextResponse.json({
      slug: result.entry?.slug,
      id: result.entry?.id,
      message: "Entry duplicated successfully",
    });
  } catch (error) {
    console.error("Failed to duplicate entry:", error);
    return NextResponse.json(
      { error: "Failed to duplicate entry" },
      { status: 500 }
    );
  }
}



