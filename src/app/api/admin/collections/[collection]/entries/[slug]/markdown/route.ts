import { NextResponse } from "next/server";
import { getEntry, updateEntry } from "@/lib/db/entries";
import { outline, parsePostMarkdown, postToMarkdown, resolveRefs } from "@/lib/agent/markdown";
import { mediaLabeller, metaToData, workingContent } from "@/lib/agent/post-markdown-io";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";

type Params = { params: Promise<{ collection: string; slug: string }> };

// GET …/entries/[slug]/markdown - The post or page as Markdown (the version being
// edited: unpublished changes included). See src/lib/agent/markdown.ts.
export async function GET(_request: Request, { params }: Params) {
  const { collection, slug } = await params;
  if (collection !== "posts" && collection !== "pages") {
    return NextResponse.json({ error: "Markdown is for posts and pages" }, { status: 400 });
  }
  const entry = await getEntry(collection, slug);
  if (!entry) return NextResponse.json({ error: `${collection === "pages" ? "Page" : "Post"} not found` }, { status: 404 });

  const markdown = postToMarkdown(entry, await mediaLabeller(workingContent(entry)));
  return new NextResponse(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}

// PUT …/entries/[slug]/markdown - Replace the post's or page's content (and any
// front matter given: title, categories, tags, date; a page's description and
// docs) from Markdown. Saved like the
// editor saves: a draft directly, a published post as unpublished changes.
// `?dryRun=1` returns the result without saving.
export async function PUT(request: Request, { params }: Params) {
  const { collection, slug } = await params;
  if (collection !== "posts" && collection !== "pages") {
    return NextResponse.json({ error: "Markdown is for posts and pages" }, { status: 400 });
  }
  const entry = await getEntry(collection, slug);
  if (!entry) return NextResponse.json({ error: `${collection === "pages" ? "Page" : "Post"} not found` }, { status: 404 });

  let content, meta;
  try {
    const parsed = parsePostMarkdown(await request.text());
    meta = parsed.meta;
    content = resolveRefs(parsed.blocks, workingContent(entry));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't read the Markdown" }, { status: 400 });
  }

  const data = { ...metaToData(meta, { ...entry.data, ...entry.pendingData }), content };
  const labels = await mediaLabeller(content);
  if (new URL(request.url).searchParams.get("dryRun") === "1") {
    return NextResponse.json({ dryRun: true, data: { ...data, content: undefined }, blocks: outline(content, labels) });
  }

  const result = await updateEntry(collection, slug, { data, stage: true });
  if (!result.entry) return NextResponse.json({ error: result.error }, { status: 400 });

  await logActivity({
    actor: getActor(request),
    action: `${collection === "pages" ? "page" : "post"}.edit`,
    target: slug,
    label: String({ ...result.entry.data, ...result.entry.pendingData }.title || slug),
    detail: `from Markdown${result.entry.status === "published" ? ", as unpublished changes" : ""}`,
  });

  return NextResponse.json({
    slug,
    status: result.entry.status,
    hasChanges: result.entry.status === "published" && Boolean(result.entry.pendingData),
    blocks: outline(content, labels),
  });
}
