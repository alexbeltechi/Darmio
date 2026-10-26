import type { Entry } from "./types";

/**
 * Every media id an entry references: the preview image override, any
 * block's `mediaId` / `mediaIds` (galleries, video, image blocks), and the
 * SEO social image. Used to tell which media is in use before deleting it.
 */
export function getEntryMediaIds(entry: Entry): string[] {
  const ids: string[] = [];
  // Unpublished edits count as use too: media only they reference isn't unused.
  const versions = [entry.data, entry.pendingData].filter(Boolean) as Record<string, unknown>[];

  for (const data of versions) {
    if (typeof data.previewImage === "string") ids.push(data.previewImage);

    const blocks = (data.content as unknown as Array<Record<string, unknown>> | undefined) || [];
    for (const block of blocks) {
      if (typeof block.mediaId === "string") ids.push(block.mediaId);
      if (Array.isArray(block.mediaIds)) ids.push(...(block.mediaIds as string[]));
    }

    const seo = data.seo as Record<string, unknown> | undefined;
    if (seo && typeof seo.ogImage === "string") ids.push(seo.ogImage);
  }

  return [...new Set(ids)];
}
