"use client";

import { useEffect, useState } from "react";
import { DsButton, dsToast, useDsConfirm } from "@beltechi/parabola";
import { announceSiteSettingsChanged } from "@/components/admin/use-site-settings";
import type { ExampleCounts, ExampleRemoval, ExampleSite } from "@/lib/cms/examples";
import { SettingsSection } from "./settings-section";

type State = { counts: ExampleCounts; sites: ExampleSite[] };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "6 posts, 7 pages and 4 photos or videos", leaving out what there's none of. */
function listed({ posts, pages, categories, media }: Partial<ExampleCounts>): string {
  const parts = [
    posts ? plural(posts, "post") : "",
    pages ? plural(pages, "page") : "",
    categories ? plural(categories, "category", "categories") : "",
    media ? plural(media, "photo or video", "photos or videos") : "",
  ].filter(Boolean);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0] ?? "";
}

/**
 * Settings › Examples: an example site's posts, pages, categories and photos
 * (marked as examples when they were loaded), and one button to take them all
 * out, which leaves the plain feed and anything the maker made or changed.
 * With none, or only part of one (a load that stopped half-way), it offers to
 * load the install's example site, after asking, since it goes live.
 */
export function ExamplesSettings() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<"remove" | "add" | null>(null);
  const [confirm, confirmDialog] = useDsConfirm();

  async function refresh() {
    const res = await fetch("/api/admin/examples");
    const json = await res.json();
    if (res.ok) setState(json.data);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  if (!state) return null;
  const total = state.counts.posts + state.counts.pages + state.counts.categories + state.counts.media;
  const site = state.sites[0];
  // Loading again only adds what's missing, so a half-loaded example can be finished.
  const missing = Boolean(site) && state.counts.posts + state.counts.pages < (site?.entries ?? 0);
  if (total === 0 && !site) return null;

  async function remove() {
    const ok = await confirm({
      title: "Remove the examples?",
      description:
        "Their posts, pages, categories and photos go. Anything you made or changed stays, and so does what it uses. This can't be undone.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setBusy("remove");
    try {
      const res = await fetch("/api/admin/examples", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const { removed, kept } = json as ExampleRemoval;
      const keptLine = listed(kept);
      if (!listed(removed) && !keptLine) dsToast.success("There were no examples left to remove");
      else dsToast.success("Examples removed", { description: keptLine ? `Kept ${keptLine} that you changed or still use.` : undefined });
      announceSiteSettingsChanged();
      await refresh();
    } catch (error) {
      dsToast.error("Couldn't remove the examples", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function add(name: string, label: string) {
    const ok = await confirm({
      title: `Add ${label}?`,
      description:
        "Its posts and pages go live on your site, its home page too unless you have one. Everything in it is marked as an example, so you can remove it here in one go.",
      confirmLabel: "Add",
    });
    if (!ok) return;
    setBusy("add");
    try {
      const res = await fetch("/api/admin/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      dsToast.success(`${label} added`);
      announceSiteSettingsChanged();
      await refresh();
    } catch (error) {
      dsToast.error(`Couldn't add ${label}`, { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  return (
    <SettingsSection
      id="examples"
      title="Examples"
      description={total > 0 ? `On this site: ${listed(state.counts)}` : "None on this site"}
      note={
        total > 0
          ? "They show what a site can look like. Remove them when you're ready to start your own: anything you made stays."
          : site && `${site.about ? `${site.about} ` : ""}Add it to see how a site comes together, and remove it here in one go.`
      }
    >
      <div className="flex flex-wrap gap-ds-8">
        {total > 0 && (
          <DsButton destructive onClick={remove} loading={busy === "remove"} disabled={busy !== null}>
            Remove examples
          </DsButton>
        )}
        {site && (total === 0 || missing) && (
          <DsButton onClick={() => add(site.name, site.label)} loading={busy === "add"} disabled={busy !== null}>
            {total === 0 ? `Add ${site.label}` : `Add the rest of ${site.label}`}
          </DsButton>
        )}
      </div>
      {confirmDialog}
    </SettingsSection>
  );
}
