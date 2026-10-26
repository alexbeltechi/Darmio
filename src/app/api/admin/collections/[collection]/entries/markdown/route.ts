import { NextResponse } from "next/server";
import { createEntry } from "@/lib/db/entries";
import { outline, parsePostMarkdown } from "@/lib/agent/markdown";
import { mediaLabeller, metaToData } from "@/lib/agent/post-markdown-io";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";
import { pageSlugError } from "@/lib/db/page-slugs";

// POST …/entries/markdown - Create a draft post or page from Markdown (front
// matter: title, categories, tags, date; for a page: title, slug, description,
// docs). `?dryRun=1` returns the result without saving.
export async function POST(request: Request, { params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  if (collection !== "posts" && collection !== "pages") {
    return NextResponse.json({ error: "Markdown is for posts and pages" }, { status: 400 });
  }
  const isPage = collection === "pages";

  let parsed;
  try {
    parsed = parsePostMarkdown(await request.text());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't read the Markdown" }, { status: 400 });
  }

  const content = parsed.blocks.map((p) => p.block);
  const data = isPage
    ? { title: "", description: "", docs: [], ...metaToData(parsed.meta), content }
    : { title: "", categories: [], tags: "", date: new Date().toISOString(), ...metaToData(parsed.meta), content };
  const slug = isPage ? parsed.meta.slug : undefined;
  const slugError = await pageSlugError(collection, slug);
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });
  const labels = await mediaLabeller(content);
  if (new URL(request.url).searchParams.get("dryRun") === "1") {
    return NextResponse.json({ dryRun: true, data: { ...data, content: undefined }, blocks: outline(content, labels) });
  }

  const actor = getActor(request);
  const result = await createEntry(collection, {
    slug,
    status: "draft",
    data,
    source: actor === "agent" ? { origin: "agent", agent: request.headers.get("x-agent-name") || "claude" } : undefined,
  });
  if (!result.entry) return NextResponse.json({ error: result.error }, { status: 400 });

  await logActivity({ actor, action: `${isPage ? "page" : "post"}.create`, target: result.entry.slug, label: String(data.title || result.entry.slug), detail: "from Markdown, as a draft" });

  return NextResponse.json({ slug: result.entry.slug, status: result.entry.status, blocks: outline(content, labels) }, { status: 201 });
}
