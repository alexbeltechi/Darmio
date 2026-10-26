/**
 * The media that can go with a post or page when it's deleted: what it uses
 * that nothing else does. Media other entries also use is kept, with where.
 * The delete route's dry run returns this so the confirm dialog (and an
 * agent) can list exactly what would go; the delete itself only removes ids
 * the caller confirmed that are still in a fresh plan, so nothing used
 * elsewhere by then is lost. Media is never deleted unasked.
 */

import type { Entry, MediaItem } from "./types";
import { getEntryMediaIds } from "./entry-media";
import { loadSchemas } from "./schema";
import { deleteMedia } from "./media";
import { thumbnailUrl } from "./media-url";
import { listEntries } from "@/lib/db/entries";
import { getMediaByIds } from "@/lib/db/media";

export type DeletableMedia = {
  id: string;
  filename: string;
  /** A small preview; none for a video without a poster. */
  thumbnailUrl?: string;
};

export type MediaDeletionPlan = {
  /** Used only by this entry: deleted with it when the caller confirms them. */
  media: DeletableMedia[];
  /** Also used by other posts or pages: kept. */
  keptMedia: (DeletableMedia & { usedBy: { collection: string; slug: string; title: string }[] })[];
};

type Use = MediaDeletionPlan["keptMedia"][number]["usedBy"][number];

/** Every post or page using each of these media items, leaving out `except`. */
export async function mediaUsedElsewhere(
  ids: string[],
  except?: { collection: string; slug: string }
): Promise<Map<string, Use[]>> {
  const usedBy = new Map<string, Use[]>();
  if (ids.length === 0) return usedBy;
  for (const [collection] of await loadSchemas()) {
    const { entries } = await listEntries(collection, { limit: 10000 });
    for (const other of entries) {
      if (except && collection === except.collection && other.slug === except.slug) continue;
      for (const id of getEntryMediaIds(other)) {
        if (!ids.includes(id)) continue;
        const users = usedBy.get(id) ?? [];
        users.push({ collection, slug: other.slug, title: String(other.data.title || other.slug) });
        usedBy.set(id, users);
      }
    }
  }
  return usedBy;
}

/** What could go with this entry, and what stays because something else uses it. */
export async function mediaDeletionPlan(entry: Entry): Promise<MediaDeletionPlan> {
  return splitByUse(getEntryMediaIds(entry), { collection: entry.collection, slug: entry.slug });
}

/** These media ids split into unused (deletable) and used elsewhere (kept), leaving out `except`. */
export async function splitByUse(
  ids: string[],
  except?: { collection: string; slug: string }
): Promise<MediaDeletionPlan> {
  const plan: MediaDeletionPlan = { media: [], keptMedia: [] };
  const usedBy = await mediaUsedElsewhere(ids, except);
  for (const item of await getMediaByIds(ids)) {
    const users = usedBy.get(item.id);
    if (users) plan.keptMedia.push({ ...describe(item), usedBy: users });
    else plan.media.push(describe(item));
  }
  return plan;
}

/** Delete the confirmed ids that are in the plan; returns what went. */
export async function deletePlannedMedia(plan: MediaDeletionPlan, confirmed: string[]): Promise<DeletableMedia[]> {
  const deleted: DeletableMedia[] = [];
  for (const item of plan.media) {
    if (!confirmed.includes(item.id)) continue;
    if ((await deleteMedia(item.id)).success) deleted.push(item);
  }
  return deleted;
}

function describe(item: MediaItem): DeletableMedia {
  const preview = item.mime.startsWith("video/") ? item.poster?.url : thumbnailUrl(item);
  return { id: item.id, filename: item.originalName || item.filename, thumbnailUrl: preview };
}
