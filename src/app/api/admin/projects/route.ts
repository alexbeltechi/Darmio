import { NextRequest, NextResponse } from "next/server";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { getCurrentProject, hubProjects } from "@/lib/db/mongodb";
import { createProject, ensureFirstProject, toSummary } from "@/lib/db/projects";

/** Every project, and the one this request is in. */
export async function GET() {
  try {
    const [projects, current] = await Promise.all([hubProjects({ fresh: true }), getCurrentProject()]);
    return NextResponse.json({ data: { projects: projects.map(toSummary), current: current?.slug ?? null } });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Couldn't list the projects" }, { status: 500 });
  }
}

/** Add a project: `{ name, brain? }`. An install from before projects first registers its own content as one. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await ensureFirstProject();
    const project = await createProject({ name: body.name, brain: body.brain });
    return NextResponse.json({ data: toSummary(project) }, { status: 201 });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't add the project" }, { status: 400 });
  }
}
