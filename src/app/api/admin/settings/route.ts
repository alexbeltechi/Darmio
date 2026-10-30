import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSiteSettings, updateSiteSettings } from "@/lib/db/settings";
import { getCurrentProject } from "@/lib/db/mongodb";
import { updateProject } from "@/lib/db/projects";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("Failed to read settings:", error);
    if (isDatabaseError(error)) {
      return handleDatabaseError(error);
    }
    return NextResponse.json(
      { error: "Failed to read settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // The site name, source labels, the source line and the image quality are checked in
    // updateSiteSettings; a bad value throws and comes back as a 400 below.
    const settings = await updateSiteSettings({
      siteName: body.siteName,
      sourceLabels: body.sourceLabels,
      sourceLine: body.sourceLine,
      imageQuality: body.imageQuality,
      themes: body.themes,
      publishedTheme: body.publishedTheme,
      activeTheme: body.activeTheme,
    });

    // One name: the site's name is also its project's name in the menu behind the letter.
    if (body.siteName !== undefined) {
      const project = await getCurrentProject();
      if (project && project.name !== settings.siteName) await updateProject(project.slug, { name: settings.siteName });
    }

    // The site's name, home and theme are on every page: cached pages are made again with them.
    revalidatePath("/", "layout");

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("Failed to update settings:", error);
    if (isDatabaseError(error)) {
      return handleDatabaseError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 400 }
    );
  }
}
