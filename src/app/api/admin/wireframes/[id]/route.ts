import { NextResponse } from "next/server";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";
import { WIREFRAME_MAX_BYTES, deleteWireframe, getWireframe, updateWireframe } from "@/lib/db/wireframes";
import { slugify } from "@/lib/slug";

type Params = { params: Promise<{ id: string }> };

/**
 * Wireframes are HTML written by agents or uploaded, so they open sandboxed:
 * their own origin (nothing reaches the admin session), no scripts, nothing
 * loaded from elsewhere except Google Fonts and images over https.
 */
const SANDBOX =
  "sandbox; default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src data: https://fonts.gstatic.com; img-src data: https:";

/** "Services v2" → "services-v2.html" */
const fileName = (title: string) => `${slugify(title) || "wireframe"}.html`;

// GET /api/admin/wireframes/[id] - The wireframe itself, as a page.
// `?download=1` saves it as an .html file instead.
export async function GET(request: Request, { params }: Params) {
  const wireframe = await getWireframe((await params).id);
  if (!wireframe) return NextResponse.json({ error: "Wireframe not found" }, { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": SANDBOX,
    "X-Robots-Tag": "noindex",
    "Cache-Control": "no-store",
  };
  if (new URL(request.url).searchParams.get("download") === "1") {
    headers["Content-Disposition"] = `attachment; filename="${wireframe.filename || fileName(wireframe.title)}"`;
  }
  return new NextResponse(wireframe.html, { headers });
}

// PATCH /api/admin/wireframes/[id] - {title?, html?}
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  let json: Record<string, unknown>;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Couldn't read the request" }, { status: 400 });
  }
  const html = typeof json.html === "string" ? json.html : undefined;
  if (html !== undefined && Buffer.byteLength(html) > WIREFRAME_MAX_BYTES) {
    return NextResponse.json({ error: "That wireframe is over 1 MB" }, { status: 400 });
  }
  const wireframe = await updateWireframe(id, {
    title: typeof json.title === "string" ? json.title.trim() || "Wireframe" : undefined,
    html,
  });
  if (!wireframe) return NextResponse.json({ error: "Wireframe not found" }, { status: 404 });
  await logActivity({ actor: getActor(request), action: "wireframe.edit", target: id, label: wireframe.title });
  return NextResponse.json({ data: wireframe });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const wireframe = await getWireframe(id);
  if (!wireframe || !(await deleteWireframe(id))) {
    return NextResponse.json({ error: "Wireframe not found" }, { status: 404 });
  }
  await logActivity({ actor: getActor(request), action: "wireframe.delete", target: id, label: wireframe.title });
  return NextResponse.json({ success: true });
}
