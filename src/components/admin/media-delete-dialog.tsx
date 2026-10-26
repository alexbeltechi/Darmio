"use client";

import * as React from "react";
import { Film } from "lucide-react";
import { DsButton, DsDialog, DsDialogActions, DsListRow, dsToast } from "@beltechi/parabola";
import type { MediaDeletionPlan } from "@/lib/cms/entry-media-cascade";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Deleting media from the library, which is always for good: the same
 * confirm as removing items in the post editor, listing every item before
 * anything goes, and naming the posts or pages that use any of them (they
 * lose the image). Returns `deleteMedia(ids)`, resolving to the ids that
 * went, and the dialog to render once.
 */
export function useMediaDelete(): [(ids: string[]) => Promise<string[]>, React.ReactNode] {
  const [pending, setPending] = React.useState<{ ids: string[]; resolve: (gone: string[]) => void } | null>(null);
  const [plan, setPlan] = React.useState<MediaDeletionPlan | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const deleteMedia = React.useCallback(
    (ids: string[]) =>
      new Promise<string[]>((resolve) => {
        setPlan(null);
        setPending({ ids, resolve });
        fetch("/api/admin/media/used", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        })
          .then((res) => (res.ok ? res.json() : Promise.reject()))
          .then((body) => setPlan(body.data))
          .catch(() => setPlan({ media: [], keptMedia: [] }));
      }),
    []
  );

  const settle = (gone: string[]) => {
    pending?.resolve(gone);
    setPending(null);
  };

  const run = async () => {
    if (!pending) return;
    setDeleting(true);
    const gone: string[] = [];
    for (const id of pending.ids) {
      const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" }).catch(() => null);
      if (res?.ok) gone.push(id);
    }
    setDeleting(false);
    const failed = pending.ids.length - gone.length;
    if (failed) dsToast.error(`Couldn't delete ${plural(failed, "item")}`);
    else dsToast.success(`Deleted ${plural(gone.length, "item")}`);
    settle(gone);
  };

  const n = pending?.ids.length ?? 0;
  const items = plan ? [...plan.media, ...plan.keptMedia] : [];
  const usedIn = [...new Set((plan?.keptMedia ?? []).flatMap((m) => m.usedBy.map((u) => `"${u.title}"`)))];
  const named = usedIn.length > 3 ? [...usedIn.slice(0, 3), `${usedIn.length - 3} more`] : usedIn;

  const dialog = (
    <DsDialog
      open={pending !== null}
      onOpenChange={(open) => !open && !deleting && settle([])}
      title={`Delete ${plural(n, "item")} permanently?`}
      description="They go from the Library and storage for good. This can't be undone."
    >
      {plan === null ? (
        <p className="text-p text-ds-fg-muted">Checking where they’re used…</p>
      ) : (
        <>
          <ul className="-mx-4 flex max-h-80 flex-col overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <DsListRow hover={false} thumbnail={item.thumbnailUrl} thumbnailIcon={Film} title={item.filename} />
              </li>
            ))}
          </ul>
          {plan.keptMedia.length > 0 && (
            <p className="text-small text-ds-fg-subtle">
              {plan.keptMedia.length === 1 ? "1 is" : `${plan.keptMedia.length} are`} used in {named.join(", ")}, and
              will be removed from {usedIn.length === 1 ? "it" : "them"}.
            </p>
          )}
        </>
      )}
      <DsDialogActions>
        <DsButton variant="primary" destructive disabled={plan === null} loading={deleting} onClick={run}>
          Delete {plural(n, "item")} permanently
        </DsButton>
        <DsButton disabled={deleting} onClick={() => settle([])}>
          Cancel
        </DsButton>
      </DsDialogActions>
    </DsDialog>
  );

  return [deleteMedia, dialog];
}
