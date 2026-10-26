"use client";

import * as React from "react";
import { Film } from "lucide-react";
import { DsButton, DsCheckbox, DsDialog, DsDialogActions, DsListRow, dsToast } from "@beltechi/parabola";
import type { Entry } from "@/lib/cms/types";
import type { DeletableMedia, MediaDeletionPlan } from "@/lib/cms/entry-media-cascade";

type Step = "choose" | "confirm";
type Pending = { entries: Entry[]; resolve: (deleted: boolean) => void };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const titleOf = (entry: Entry) => (entry.data.title as string)?.trim() || "Untitled";

/**
 * Deleting posts, with the option to take their media too. The first step
 * asks about the post(s), with a checkbox (ticked) for the media only they
 * use; ticked, a second step lists every item that will go before anything
 * does. Media other posts or pages use is never offered, just named as kept.
 * Returns `deletePosts(entries)`, resolving true once deleted, and the dialog
 * to render once.
 */
export function usePostDelete(): [(entries: Entry[]) => Promise<boolean>, React.ReactNode] {
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [step, setStep] = React.useState<Step>("choose");
  const [plan, setPlan] = React.useState<{ media: DeletableMedia[]; kept: string[]; keptCount: number } | null>(null);
  const [withMedia, setWithMedia] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);

  const deletePosts = React.useCallback(
    (entries: Entry[]) =>
      new Promise<boolean>((resolve) => {
        setStep("choose");
        setPlan(null);
        setWithMedia(true);
        setPending({ entries, resolve });
        loadPlan(entries).then(setPlan, () => setPlan({ media: [], kept: [], keptCount: 0 }));
      }),
    []
  );

  const settle = (deleted: boolean) => {
    pending?.resolve(deleted);
    setPending(null);
  };

  const run = async () => {
    if (!pending) return;
    const mediaIds = withMedia && plan ? plan.media.map((m) => m.id) : [];
    setDeleting(true);
    let failed = 0;
    let mediaGone = 0;
    // One at a time, so media shared only between the selected posts is
    // unused by the time the last of them goes, and goes with it.
    for (const entry of pending.entries) {
      try {
        const res = await fetch(`/api/admin/collections/${entry.collection}/entries/${entry.slug}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deleteMedia: mediaIds }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
        mediaGone += ((await res.json()).deleted?.media ?? []).length;
      } catch {
        failed++;
      }
    }
    setDeleting(false);
    const count = pending.entries.length;
    if (failed) {
      dsToast.error(`Couldn't delete ${failed === count && count === 1 ? "post" : plural(failed, "post")}`);
    } else {
      const what = count === 1 ? "Post deleted" : `Deleted ${plural(count, "post")}`;
      dsToast.success(mediaGone ? `${what}, with ${plural(mediaGone, "media item")}` : what);
    }
    settle(failed < count);
  };

  const entries = pending?.entries ?? [];
  const single = entries.length === 1;
  const mediaCount = plan?.media.length ?? 0;
  const goesToConfirm = withMedia && mediaCount > 0;
  const thePosts = single ? "this post" : "these posts";
  const deleteLabel = (andMedia: boolean) =>
    `Delete ${single ? "post" : plural(entries.length, "post")}${andMedia ? ` and ${plural(mediaCount, "media item")}` : ""}`;

  const element = (
    <DsDialog
      open={pending !== null}
      onOpenChange={(open) => !open && !deleting && settle(false)}
      title={
        step === "choose"
          ? single
            ? "Delete post?"
            : `Delete ${plural(entries.length, "post")}?`
          : `Delete ${plural(mediaCount, "media item")}?`
      }
      description={
        step === "choose"
          ? `${single ? `"${titleOf(entries[0])}" will be` : "They'll be"} deleted for good. This can't be undone.`
          : `They go from the media library and storage for good, with ${thePosts}. This can't be undone.`
      }
    >
      {step === "choose" ? (
        <>
          {plan === null ? (
            <p className="text-p text-ds-fg-muted">Checking media…</p>
          ) : (
            (mediaCount > 0 || plan.keptCount > 0) && (
              <div className="flex flex-col gap-2">
                {mediaCount > 0 && (
                  <label className="flex items-center gap-3 text-p">
                    <span className="flex size-6 shrink-0 items-center justify-center">
                      <DsCheckbox checked={withMedia} onCheckedChange={(checked) => setWithMedia(checked === true)} />
                    </span>
                    Also permanently delete {plural(mediaCount, "media item")} used in {thePosts}
                  </label>
                )}
                {plan.keptCount > 0 && (
                  <p className="text-small text-ds-fg-subtle">
                    {plural(plan.keptCount, "item")} {plan.keptCount === 1 ? "stays" : "stay"}, used in {plan.kept.join(", ")}.
                  </p>
                )}
              </div>
            )
          )}
          <DsDialogActions>
            <DsButton
              variant="primary"
              destructive
              disabled={plan === null}
              loading={deleting}
              onClick={() => (goesToConfirm ? setStep("confirm") : run())}
            >
              {deleteLabel(goesToConfirm)}
            </DsButton>
            <DsButton disabled={deleting} onClick={() => settle(false)}>
              Cancel
            </DsButton>
          </DsDialogActions>
        </>
      ) : (
        <>
          <ul className="-mx-4 flex max-h-80 flex-col overflow-y-auto">
            {plan?.media.map((item) => (
              <li key={item.id}>
                <DsListRow hover={false} thumbnail={item.thumbnailUrl} thumbnailIcon={Film} title={item.filename} />
              </li>
            ))}
          </ul>
          <DsDialogActions>
            <DsButton variant="primary" destructive loading={deleting} onClick={run}>
              {deleteLabel(true)}
            </DsButton>
            <DsButton disabled={deleting} onClick={() => setStep("choose")}>
              Back
            </DsButton>
          </DsDialogActions>
        </>
      )}
    </DsDialog>
  );

  return [deletePosts, element];
}

/**
 * The media that would go, from each post's dry run. Media shared only
 * between the posts being deleted goes too; media anything else uses stays.
 */
async function loadPlan(entries: Entry[]) {
  const plans = await Promise.all(
    entries.map(async (entry) => {
      const res = await fetch(`/api/admin/collections/${entry.collection}/entries/${entry.slug}?dryRun=1`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("dry run failed");
      return (await res.json()) as MediaDeletionPlan;
    })
  );
  const deleting = new Set(entries.map((e) => `${e.collection}/${e.slug}`));
  const media = new Map<string, DeletableMedia>();
  const kept = new Map<string, MediaDeletionPlan["keptMedia"][number]>();
  for (const plan of plans) {
    for (const item of plan.media) media.set(item.id, item);
    for (const item of plan.keptMedia) {
      const elsewhere = item.usedBy.filter((u) => !deleting.has(`${u.collection}/${u.slug}`));
      if (elsewhere.length) kept.set(item.id, { ...item, usedBy: elsewhere });
      else media.set(item.id, item);
    }
  }
  for (const id of kept.keys()) media.delete(id);
  const usedIn = [...new Set([...kept.values()].flatMap((item) => item.usedBy.map((u) => `"${u.title}"`)))];
  const named = usedIn.length > 3 ? [...usedIn.slice(0, 3), `${usedIn.length - 3} more`] : usedIn;
  return { media: [...media.values()], kept: named, keptCount: kept.size };
}
