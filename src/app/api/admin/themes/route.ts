import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { DS_DEFAULT_THEME_ID, dsThemeEntryId, dsThemeFileParse } from "@beltechi/parabola";
import { getSiteSettings, updateSiteSettings } from "@/lib/db/settings";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";

// The project's themes. A theme file (`*.theme.json`, docs/themes.md) comes in
// here and is checked against its contract; the Settings › Design screen uses
// the settings route for the same library.

function failure(error: unknown, message: string, status = 500) {
  console.error(message, error);
  if (isDatabaseError(error)) return handleDatabaseError(error);
  return NextResponse.json({ error: message }, { status });
}

// GET /api/admin/themes - The library and which theme the site wears.
export async function GET() {
  try {
    const { themes } = await getSiteSettings();
    return NextResponse.json({
      data: { active: themes.active, themes: themes.themes.map(({ id, name }) => ({ id, name })) },
    });
  } catch (error) {
    return failure(error, "Failed to read themes");
  }
}

// POST /api/admin/themes {"file": <theme file, as an object or its text>, "activate"?: false}
// Adds the theme, and puts it on the site unless activate is false.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = dsThemeFileParse(body?.file);
    if (!result.ok) {
      return NextResponse.json({ error: `Not a valid theme file: ${result.errors.join("; ")}` }, { status: 400 });
    }
    const { themes } = await getSiteSettings();
    const id = dsThemeEntryId(themes, result.name);
    const added = { ...themes, themes: [...themes.themes, { id, name: result.name, theme: result.theme }] };
    const settings = await updateSiteSettings({
      themes: added,
      ...(body?.activate !== false && { activeTheme: id }),
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ data: { id, active: settings.themes.active } }, { status: 201 });
  } catch (error) {
    return failure(error, error instanceof Error ? error.message : "Failed to add the theme", 400);
  }
}

// DELETE /api/admin/themes?id=… - Removes a theme; if the site wore it, the site goes back to Parabola's own.
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    const { themes } = await getSiteSettings();
    if (!id || id === DS_DEFAULT_THEME_ID || !themes.themes.some((t) => t.id === id)) {
      return NextResponse.json({ error: `No theme "${id ?? ""}" to remove (Parabola's own can't be)` }, { status: 404 });
    }
    const remaining = { ...themes, themes: themes.themes.filter((t) => t.id !== id) };
    await updateSiteSettings({
      themes: remaining,
      ...(themes.active === id && { activeTheme: DS_DEFAULT_THEME_ID }),
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error, "Failed to remove the theme");
  }
}
