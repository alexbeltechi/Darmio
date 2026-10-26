import { NextResponse } from "next/server";
import { getActor } from "@/lib/agent/actor";
import { DOC_ACCEPT, isDocFilename } from "@/lib/cms/docs";
import { logActivity } from "@/lib/db/activity";
import {
  cleanDocLinks,
  createDoc,
  isDocKind,
  isDocStage,
  listDocs,
  titleFromFilename,
  type DocKind,
  type DocLink,
  type DocStage,
} from "@/lib/db/docs";

/** Text is small; anything bigger is probably the wrong file. */
const MAX_BYTES = 512 * 1024;

// GET /api/admin/docs - Every doc, newest first, with where each is used.
export async function GET() {
  return NextResponse.json({ data: await listDocs() });
}

// POST /api/admin/docs - Create a doc. JSON {title, kind, body, stage?, links?}, or multipart
// with a .md `file` (plus optional title and kind). Kind defaults to "brief".
export async function POST(request: Request) {
  let title = "";
  let kind: DocKind = "brief";
  let body = "";
  let filename: string | undefined;
  let stage: DocStage | undefined;
  let links: DocLink[] | undefined;

  try {
    if ((request.headers.get("content-type") || "").includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
      if (!isDocFilename(file.name)) {
        return NextResponse.json({ error: `Documents are text files: ${DOC_ACCEPT.replaceAll(",", " ")}` }, { status: 400 });
      }
      if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is over 512 KB" }, { status: 400 });
      body = await file.text();
      filename = file.name;
      title = String(form.get("title") || "") || titleFromFilename(file.name);
      const k = form.get("kind");
      if (isDocKind(k)) kind = k;
    } else {
      const json = await request.json();
      title = typeof json.title === "string" ? json.title : "";
      body = typeof json.body === "string" ? json.body : "";
      if (isDocKind(json.kind)) kind = json.kind;
      if (isDocStage(json.stage)) stage = json.stage;
      links = cleanDocLinks(json.links) ?? undefined;
      if (Buffer.byteLength(body) > MAX_BYTES)
        return NextResponse.json({ error: "That doc is over 512 KB" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Couldn't read the request" }, { status: 400 });
  }

  const actor = getActor(request);
  // A brief starts in the writing stage.
  if (!stage && kind === "brief") stage = "writing";
  const doc = await createDoc({
    title: title.trim() || "Untitled doc",
    kind,
    body,
    filename,
    stage,
    links,
    createdBy: actor,
  });
  await logActivity({
    actor,
    action: "doc.create",
    target: doc.id,
    label: doc.title,
    detail: filename ? `from ${filename}` : undefined,
  });
  return NextResponse.json({ data: { ...doc, usedBy: [] } }, { status: 201 });
}
