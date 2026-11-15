import { NextResponse } from "next/server";
import { listMedia, uploadMedia } from "@/lib/cms/media";
import type { SourceOrigin, UploadMetadata } from "@/lib/cms/types";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";
import { parseMediaFields, summarizeMedia } from "@/lib/agent/summary";
import { mediaMatches } from "@/lib/cms/media-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const mime = searchParams.get("mime") || undefined;

  // `q`: the library's own search (names, title, caption, tags, keywords), then paged.
  const q = searchParams.get("q");
  const { items, total } = q
    ? await listMedia({ limit: 100000, mime }).then(({ items }) => {
        const matched = items.filter((item) => mediaMatches(item, q));
        return { items: matched.slice(offset, offset + limit), total: matched.length };
      })
    : await listMedia({ limit, offset, mime });

  // `fields=id,name,width` (or `fields=summary`): a compact list for agents.
  const fields = parseMediaFields(searchParams.get("fields"));
  if (fields) {
    return NextResponse.json({ data: items.map((item) => summarizeMedia(item, fields)), total, limit, offset });
  }

  return NextResponse.json({
    data: items,
    total,
    limit,
    offset,
  });
}

// POST /api/admin/media - Upload a file. Images are optimized; video gets a poster; any other file (a PDF, a zip) is stored as it is.
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const str = (key: string) => {
      const value = formData.get(key);
      return typeof value === "string" && value.length > 0 ? value : undefined;
    };

    const list = (key: string) =>
      str(key)
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    // Uploads that declare nothing came from a person using the admin UI
    const origin = (str("origin") as SourceOrigin) || "web";

    const meta: UploadMetadata = {
      title: str("title"),
      alt: str("alt"),
      caption: str("caption"),
      description: str("description"),
      credit: str("credit"),
      tags: list("tags"),
      keywords: list("keywords"),
      keywordsBy: str("keywordsBy"),
      capturedAt: str("capturedAt"),
      source: {
        origin,
        agent: str("agent"),
        path: str("sourcePath"),
        batchId: str("batchId"),
        ingestedAt: new Date().toISOString(),
      },
    };

    // uploadMedia now handles all image processing internally:
    // - Sanitizes filename
    // - Generates variants (display, large, medium, thumb)
    // - Preserves original
    // - Extracts dimensions
    // Any file can live in the Library; one the browser couldn't name a type for is kept as plain bytes.
    const result = await uploadMedia(buffer, file.name, file.type || "application/octet-stream", meta);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (!result.deduped && result.item) {
      await logActivity({ actor: getActor(request), action: "media.upload", target: result.item.id, label: result.item.originalName });
    }

    return NextResponse.json(
      { data: result.item, deduped: result.deduped ?? false },
      { status: result.deduped ? 200 : 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
