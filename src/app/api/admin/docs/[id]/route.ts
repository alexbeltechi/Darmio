import { NextResponse } from "next/server";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";
import { cleanDocLinks, deleteDoc, getDoc, isDocKind, isDocStage, updateDoc } from "@/lib/db/docs";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/docs/[id] - One doc with where it's used. `?format=md` returns the Markdown alone.
export async function GET(request: Request, { params }: Params) {
  const doc = await getDoc((await params).id);
  if (!doc) return NextResponse.json({ error: "Doc not found" }, { status: 404 });
  if (new URL(request.url).searchParams.get("format") === "md") {
    return new NextResponse(doc.body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
  }
  return NextResponse.json({ data: doc });
}

// PATCH /api/admin/docs/[id] - {title?, kind?, body?, stage?, links?, filename?} (links replaces the list)
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  let json: Record<string, unknown>;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Couldn't read the request" }, { status: 400 });
  }
  if (json.kind !== undefined && !isDocKind(json.kind)) {
    return NextResponse.json({ error: "kind must be brief, source or guide" }, { status: 400 });
  }
  if (json.stage !== undefined && !isDocStage(json.stage)) {
    return NextResponse.json({ error: "stage must be writing, wireframe, building or done" }, { status: 400 });
  }

  const doc = await updateDoc(id, {
    title: typeof json.title === "string" ? json.title.trim() || "Untitled doc" : undefined,
    kind: isDocKind(json.kind) ? json.kind : undefined,
    body: typeof json.body === "string" ? json.body : undefined,
    stage: isDocStage(json.stage) ? json.stage : undefined,
    filename: typeof json.filename === "string" ? json.filename.trim() : undefined,
    links: cleanDocLinks(json.links) ?? undefined,
  });
  if (!doc) return NextResponse.json({ error: "Doc not found" }, { status: 404 });

  await logActivity({ actor: getActor(request), action: "doc.edit", target: id, label: doc.title });
  return NextResponse.json({ data: await getDoc(id) });
}

// DELETE /api/admin/docs/[id] - Delete it and detach it from every post and page.
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const doc = await getDoc(id);
  if (!doc || !(await deleteDoc(id))) return NextResponse.json({ error: "Doc not found" }, { status: 404 });
  await logActivity({ actor: getActor(request), action: "doc.delete", target: id, label: doc.title });
  return NextResponse.json({ success: true });
}
