import { NextResponse } from "next/server";
import { getEntry, updateEntry } from "@/lib/db/entries";
import { findBlockIndex, outline, parseBlocks } from "@/lib/agent/markdown";
import { mediaLabeller, workingContent } from "@/lib/agent/post-markdown-io";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";
import type { Block } from "@/lib/cms/types";

/**
 * One edit to a post's blocks. `block`, `after` and `before` take a block id
 * (its first 8 characters are enough, as in the Markdown markers); `markdown`
 * is one or more blocks in the post Markdown format, without front matter.
 */
type Op =
  | { op: "replace"; block: string; markdown: string }
  | { op: "insert"; markdown: string; after?: string; before?: string }
  | { op: "remove"; block: string }
  | { op: "move"; block: string; after?: string; before?: string };

function position(blocks: Block[], after?: string, before?: string): number {
  if (after === "start" || before === "start") return 0;
  if (after) return findBlockIndex(blocks, after) + 1;
  if (before) return findBlockIndex(blocks, before);
  return blocks.length;
}

function apply(blocks: Block[], op: Op): Block[] {
  const next = [...blocks];
  switch (op.op) {
    case "replace": {
      const i = findBlockIndex(next, op.block);
      const fresh = parseBlocks(op.markdown).map((p) => p.block);
      // A one-for-one replacement keeps the block's id.
      if (fresh.length === 1) fresh[0] = { ...fresh[0], id: next[i].id } as Block;
      next.splice(i, 1, ...fresh);
      return next;
    }
    case "insert": {
      const fresh = parseBlocks(op.markdown).map((p) => p.block);
      next.splice(position(next, op.after, op.before), 0, ...fresh);
      return next;
    }
    case "remove": {
      next.splice(findBlockIndex(next, op.block), 1);
      return next;
    }
    case "move": {
      const [moved] = next.splice(findBlockIndex(next, op.block), 1);
      next.splice(position(next, op.after, op.before), 0, moved);
      return next;
    }
    default:
      throw new Error(`Unknown op ${(op as { op: string }).op}. Use replace, insert, remove or move.`);
  }
}

// PATCH …/entries/[slug]/blocks - { ops: Op[] }. Edit a few blocks without
// sending the whole post. Applied in order, all or nothing, and saved like the
// editor saves (a published post gets unpublished changes). `?dryRun=1`
// returns the result without saving.
export async function PATCH(request: Request, { params }: { params: Promise<{ collection: string; slug: string }> }) {
  const { collection, slug } = await params;
  if (collection !== "posts" && collection !== "pages") {
    return NextResponse.json({ error: "Block edits are for posts and pages" }, { status: 400 });
  }
  const entry = await getEntry(collection, slug);
  if (!entry) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  let ops: Op[];
  try {
    ({ ops } = await request.json());
    if (!Array.isArray(ops) || ops.length === 0) throw new Error("ops must be a non-empty list");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid body" }, { status: 400 });
  }

  let content = workingContent(entry);
  try {
    for (const op of ops) content = apply(content, op);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't apply the edits" }, { status: 400 });
  }

  const labels = await mediaLabeller(content);
  if (new URL(request.url).searchParams.get("dryRun") === "1") {
    return NextResponse.json({ dryRun: true, blocks: outline(content, labels) });
  }

  const result = await updateEntry(collection, slug, { data: { content }, stage: true });
  if (!result.entry) return NextResponse.json({ error: result.error }, { status: 400 });

  await logActivity({
    actor: getActor(request),
    action: `${collection === "pages" ? "page" : "post"}.edit`,
    target: slug,
    label: String({ ...result.entry.data, ...result.entry.pendingData }.title || slug),
    detail: `${ops.length} block ${ops.length === 1 ? "edit" : "edits"}${result.entry.status === "published" ? ", as unpublished changes" : ""}`,
  });

  return NextResponse.json({
    slug,
    status: result.entry.status,
    hasChanges: result.entry.status === "published" && Boolean(result.entry.pendingData),
    blocks: outline(content, labels),
  });
}
