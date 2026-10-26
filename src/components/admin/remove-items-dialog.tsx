"use client";

import * as React from "react";
import { Film } from "lucide-react";
import { DsButton, DsCheckbox, DsDialog, DsDialogActions, DsListRow, dsToast } from "@beltechi/parabola";
import type { DeletableMedia, MediaDeletionPlan } from "@/lib/cms/entry-media-cascade";
import type { Block, MediaItem } from "@/lib/cms/types";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Every media id a block points at (a gallery's images, a video, an image). */
function blockMediaIds(block: Block): string[] {
  const ids: string[] = [];
  if ("mediaId" in block && typeof block.mediaId === "string") ids.push(block.mediaId);
  if ("mediaIds" in block && Array.isArray(block.mediaIds)) ids.push(...block.mediaIds);
  return ids;
}

/**
 * Ticked blocks and ticked gallery images in a post or page editor, and the
 * one way to remove them: the editor's ⋮ menu offers "Delete N items" and
 * "Deselect all", and deleting asks first. The confirm, like deleting a post,
 * has a ticked checkbox to also delete for good the media that only those
 * items used (no other block here, no other post or page), then lists it
 * before anything goes. Unticked, the items only leave the editor, with Undo.
 */
export function useEditorSelection({
  collection,
  slug,
  blocks,
  setBlocks,
  setGalleryMedia,
  selectedBlocks,
  setSelectedBlocks,
  entryMediaIds = [],
}: {
  collection: "posts" | "pages";
  slug?: string;
  blocks: Block[];
  setBlocks: (blocks: Block[]) => void;
  setGalleryMedia: React.Dispatch<React.SetStateAction<Record<string, MediaItem[]>>>;
  selectedBlocks: Set<string>;
  setSelectedBlocks: (next: Set<string>) => void;
  /** Media the entry uses outside its blocks, e.g. its preview image. */
  entryMediaIds?: (string | null | undefined)[];
}) {
  const [selectedImages, setSelectedImages] = React.useState<Record<string, Set<string>>>({});
  const [pending, setPending] = React.useState<{ count: number; apply: () => void; undo: () => void } | null>(null);
  const [step, setStep] = React.useState<"choose" | "confirm">("choose");
  const [plan, setPlan] = React.useState<DeletableMedia[] | null>(null);
  const [withMedia, setWithMedia] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);

  // An image in a ticked block goes with its block, so it isn't counted twice.
  const looseImages = Object.entries(selectedImages).filter(([blockId]) => !selectedBlocks.has(blockId));
  const count = selectedBlocks.size + looseImages.reduce((sum, [, ids]) => sum + ids.size, 0);

  const deselectAll = () => {
    setSelectedBlocks(new Set());
    setSelectedImages({});
  };

  const deleteSelected = () => {
    const before = blocks;
    const remaining = blocks
      .filter((b) => !selectedBlocks.has(b.id))
      .map((b) => {
        const ticked = selectedImages[b.id];
        return ticked?.size && b.type === "gallery"
          ? { ...b, mediaIds: (b.mediaIds || []).filter((id) => !ticked.has(id)) }
          : b;
      });
    const stillUsed = new Set([
      ...remaining.flatMap(blockMediaIds),
      ...entryMediaIds.filter((id): id is string => !!id),
    ]);
    const candidates = [...new Set(before.flatMap(blockMediaIds))].filter((id) => !stillUsed.has(id));

    let galleryBefore: Record<string, MediaItem[]> = {};
    const apply = () => {
      setBlocks(remaining);
      setGalleryMedia((prev) => {
        galleryBefore = prev;
        const next: Record<string, MediaItem[]> = {};
        for (const block of remaining) {
          if (block.type !== "gallery" || !prev[block.id]) continue;
          const keep = new Set(block.mediaIds || []);
          next[block.id] = prev[block.id].filter((m) => keep.has(m.id));
        }
        return next;
      });
      deselectAll();
    };
    const undo = () => {
      setBlocks(before);
      setGalleryMedia(galleryBefore);
    };

    setStep("choose");
    setPlan(null);
    setWithMedia(true);
    setPending({ count, apply, undo });
    loadPlan(candidates, collection, slug).then(setPlan, () => setPlan([]));
  };

  const close = () => setPending(null);

  const run = async () => {
    if (!pending) return;
    const toDelete = withMedia && plan ? plan : [];
    pending.apply();
    if (toDelete.length === 0) {
      const { undo } = pending;
      close();
      dsToast(`${plural(pending.count, "item")} removed`, { action: { label: "Undo", onClick: undo } });
      return;
    }
    setDeleting(true);
    let failed = 0;
    // Out of the editor first, so nothing here points at a file about to go.
    for (const item of toDelete) {
      const res = await fetch(`/api/admin/media/${item.id}`, { method: "DELETE" }).catch(() => null);
      if (!res?.ok) failed++;
    }
    setDeleting(false);
    if (failed) dsToast.error(`Couldn't delete ${plural(failed, "media item")}`);
    else dsToast.success(`Deleted ${plural(pending.count, "item")} and ${plural(toDelete.length, "media item")}`);
    close();
  };

  const n = pending?.count ?? 0;
  const mediaCount = plan?.length ?? 0;
  const goesToConfirm = withMedia && mediaCount > 0;
  // Ticked: what goes for good. Unticked: what only leaves the editor.
  const actionLabel = (andMedia: boolean) =>
    andMedia ? `Delete ${plural(n, "item")} permanently` : `Remove ${plural(n, "item")}`;

  const dialog = (
    <DsDialog
      open={pending !== null}
      onOpenChange={(open) => !open && !deleting && close()}
      title={step === "choose" ? `Remove ${plural(n, "item")}?` : `Delete ${plural(mediaCount, "media item")} permanently?`}
      description={
        step === "confirm" ? "They go from the Library and storage for good. This can't be undone." : undefined
      }
    >
      {step === "choose" ? (
        <>
          {plan === null ? (
            <p className="text-p text-ds-fg-muted">Checking where they’re used…</p>
          ) : (
            mediaCount > 0 && (
              <label className="flex items-center gap-3 text-p">
                <span className="flex size-6 shrink-0 items-center justify-center">
                  <DsCheckbox checked={withMedia} onCheckedChange={(checked) => setWithMedia(checked === true)} />
                </span>
                Also permanently delete {plural(mediaCount, "media item")}
              </label>
            )
          )}
          <DsDialogActions>
            <DsButton
              variant="primary"
              destructive
              disabled={plan === null}
              onClick={() => (goesToConfirm ? setStep("confirm") : run())}
            >
              {actionLabel(goesToConfirm)}
            </DsButton>
            <DsButton onClick={close}>Cancel</DsButton>
          </DsDialogActions>
        </>
      ) : (
        <>
          <ul className="-mx-4 flex max-h-80 flex-col overflow-y-auto">
            {plan?.map((item) => (
              <li key={item.id}>
                <DsListRow hover={false} thumbnail={item.thumbnailUrl} thumbnailIcon={Film} title={item.filename} />
              </li>
            ))}
          </ul>
          <DsDialogActions>
            <DsButton variant="primary" destructive loading={deleting} onClick={run}>
              {actionLabel(true)}
            </DsButton>
            <DsButton disabled={deleting} onClick={() => setStep("choose")}>
              Back
            </DsButton>
          </DsDialogActions>
        </>
      )}
    </DsDialog>
  );

  return {
    count,
    imagesFor: (blockId: string) => selectedImages[blockId],
    setImagesFor: (blockId: string, next: Set<string>) =>
      setSelectedImages((prev) => ({ ...prev, [blockId]: next })),
    deselectAll,
    deleteSelected,
    dialog,
  };
}

/** Of these media ids, the ones no other post or page uses. Without a saved entry to leave out, none. */
async function loadPlan(ids: string[], collection: string, slug?: string): Promise<DeletableMedia[]> {
  if (!slug || ids.length === 0) return [];
  const res = await fetch("/api/admin/media/used", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, except: { collection, slug } }),
  });
  if (!res.ok) throw new Error("usage check failed");
  return ((await res.json()).data as MediaDeletionPlan).media;
}
