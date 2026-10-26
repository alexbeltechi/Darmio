import { NextRequest, NextResponse } from "next/server";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { toSummary, updateProject } from "@/lib/db/projects";

/** Rename a project or change its brain: `{ name?, brain? }` (an empty brain removes it). */
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
