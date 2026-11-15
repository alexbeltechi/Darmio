import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { getActor } from "@/lib/agent/actor";
import { exampleCounts, listExampleSites, loadExampleSite, parseExampleName, removeExamples } from "@/lib/cms/examples";
import { logActivity } from "@/lib/db/activity";

// Loading one makes a few image renditions and a video poster.
export const maxDuration = 60;

/** How much of the current project is examples, and the example sites this install carries. */
export async function GET() {
  try {
    const [counts, sites] = await Promise.all([exampleCounts(), listExampleSites()]);
    return NextResponse.json({ data: { counts, sites } });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Couldn't read the examples" }, { status: 500 });
  }
}

/** Load an example site into the current project: `{ name }`, one of GET's `sites`. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let name: string;
    try {
      name = await parseExampleName(body.name);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
    const made = await loadExampleSite(name);
    revalidatePath("/", "layout");
    await logActivity({ actor: getActor(request), action: "examples.add", target: name, label: "Example site" });
    return NextResponse.json({ data: made }, { status: 201 });
  } catch (error) {
    console.error("Failed to load the example site:", error);
    if (isDatabaseError(error)) return handleDatabaseError(error);
    if (error instanceof Error && /already in progress/i.test(error.message)) {
      return NextResponse.json({ error: "Another example load is already in progress. Try again in a moment." }, { status: 409 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't load the example site" }, { status: 500 });
  }
}

/** Remove every example from the current project, keeping what the maker's own work uses. */
export async function DELETE(request: NextRequest) {
  try {
    const result = await removeExamples();
    revalidatePath("/", "layout");
    const { posts, pages, categories, media } = result.removed;
    await logActivity({
      actor: getActor(request),
      action: "examples.remove",
      target: "examples",
      label: "Examples",
      detail: `${posts} posts, ${pages} pages, ${categories} categories, ${media} media items`,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Failed to remove the examples:", error);
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't remove the examples" }, { status: 500 });
  }
}
