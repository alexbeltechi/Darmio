import { NextResponse } from "next/server";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";
import { getMedia, updateMedia, deleteMedia } from "@/lib/cms/media";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const item = await getMedia(id);

  if (!item) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  return NextResponse.json({ data: item });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    // Support all updateable fields including activeVariant
    const result = await updateMedia(id, {
      alt: body.alt,
      title: body.title,
      caption: body.caption,
      description: body.description,
      activeVariant: body.activeVariant,
      tags: body.tags,
      keywords: Array.isArray(body.keywords) ? body.keywords.filter((k: unknown) => typeof k === "string") : undefined,
      keywordsBy: typeof body.keywordsBy === "string" ? body.keywordsBy : undefined,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    await logActivity({ actor: getActor(request), action: "media.edit", target: id, label: result.item?.originalName });

    return NextResponse.json({ data: result.item });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await deleteMedia(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  await logActivity({
    actor: getActor(request),
    action: "media.delete",
    target: id,
    detail: result.updatedEntries ? `removed from ${result.updatedEntries} posts` : undefined,
  });

  return NextResponse.json({ 
    success: true,
    updatedEntries: result.updatedEntries || 0
  });
}

