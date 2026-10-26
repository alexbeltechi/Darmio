import { NextResponse } from "next/server";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";
import { getEntry } from "@/lib/db/entries";
import { WIREFRAME_MAX_BYTES, createWireframe, listWireframes } from "@/lib/db/wireframes";

/** The page a request names by slug (`page`). */
async function pageFor(slug: unknown) {
  return typeof slug === "string" && slug ? getEntry("pages", slug) : null;
}

// GET /api/admin/wireframes?page=<slug> - A page's wireframes, newest first (no HTML).
export async function GET(request: Request) {
  const page = await pageFor(new URL(request.url).searchParams.get("page"));
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  return NextResponse.json({ data: await listWireframes(page.id) });
}

// POST /api/admin/wireframes - Add a wireframe to a page. JSON {page, title, html},
// or multipart with an .html `file` (plus page and an optional title).
export async function POST(request: Request) {
  let pageSlug: unknown;
  let title = "";
  let html = "";
  let filename: string | undefined;

  try {
    if ((request.headers.get("content-type") || "").includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
      if (!/\.html?$/i.test(file.name))
        return NextResponse.json({ error: "Wireframes are .html files" }, { status: 400 });
      html = await file.text();
      filename = file.name;
      pageSlug = form.get("page");
      title = String(form.get("title") || "") || file.name.replace(/\.html?$/i, "");
    } else {
      const json = await request.json();
      pageSlug = json.page;
      title = typeof json.title === "string" ? json.title : "";
      html = typeof json.html === "string" ? json.html : "";
    }
  } catch {
    return NextResponse.json({ error: "Couldn't read the request" }, { status: 400 });
  }

  const page = await pageFor(pageSlug);
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  if (!html.trim()) return NextResponse.json({ error: "The wireframe is empty" }, { status: 400 });
  if (Buffer.byteLength(html) > WIREFRAME_MAX_BYTES) {
    return NextResponse.json({ error: "That wireframe is over 1 MB" }, { status: 400 });
  }

  const actor = getActor(request);
  const wireframe = await createWireframe({
    pageId: page.id,
    title: title.trim() || "Wireframe",
    html,
    filename,
    createdBy: actor,
  });
  await logActivity({
    actor,
    action: "wireframe.create",
    target: wireframe.id,
    label: wireframe.title,
    detail: `for ${page.slug}`,
  });
  return NextResponse.json({ data: wireframe }, { status: 201 });
}
