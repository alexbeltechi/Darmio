import { NextRequest, NextResponse } from "next/server";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { deletableProject, projectMediaItems, removeProject, toSummary, updateProject } from "@/lib/db/projects";
import { deleteMediaFiles } from "@/lib/cms/media";
import { withoutId } from "@/lib/db/mongodb";
import type { MediaItem } from "@/lib/cms/types";

/** Rename a project (its site too) or change its brain: `{ name?, brain? }` (an empty brain removes it). */
export async function PATCH(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const body = await request.json();
    const project = await updateProject(slug, { name: body.name, brain: body.brain });
    return NextResponse.json({ data: toSummary(project) });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't update the project" }, { status: 400 });
  }
}

/**
 * Delete a project for good: its library's files in storage, its content
 * (posts, pages, categories, settings) and its place in the list. Any project,
 * the one the site shows too: the next one takes its place, or the site is
 * empty until a new project is made.
 */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const row = await deletableProject(slug);
    const items = (await projectMediaItems(row)).map((doc) => withoutId<MediaItem>(doc));
    await deleteMediaFiles(items);
    await removeProject(row);
    return NextResponse.json({ data: { slug, deletedFiles: items.length } });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't delete the project" }, { status: 400 });
  }
}
