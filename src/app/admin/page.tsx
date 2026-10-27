"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MoreVertical, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import {
  DsButton,
  DsDialog,
  DsDialogActions,
  DsDialogCancel,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownSeparator,
  DsDropdownTrigger,
  DsEmptyState,
  DsField,
  DsInput,
  DsPill,
  DsSearch,
  dsToast,
  useDsConfirm,
} from "@beltechi/parabola";
import { AdminMenuButton } from "@/components/admin/layout";
import { openProject } from "@/components/admin/projects/project-actions";
import { HOME_PATH, NEW_PROJECT_PATH } from "@/components/admin/home/home-routes";
import { useProjects } from "@/components/admin/home/use-projects";
import { PROJECT_NAME_MAX, type ProjectSummary } from "@/lib/cms/projects";
import { formatChangedAt } from "@/lib/utils";

/**
 * Home (decisions, 2026-10-26), the way Framer's dashboard opens: every
 * project as a card (no thumbnails or icons): its name with a Published or
 * Not published pill beside it, then at the bottom its address when it's
 * published and when it last changed, with a ⋮ menu at the bottom right
 * (Settings, Rename, Delete project). A search over them and + Project at the
 * top right. Signing in and setting up land here. Nothing yet, or nothing
 * matching the search: one line in the middle of the page.
 */
function HomeProjects() {
  const { list, reload } = useProjects();
  const router = useRouter();
  const search = useSearchParams().get("q") ?? "";
  const query = search.trim().toLowerCase();
  // The search lives in the address, so a filtered Home can be reloaded or shared.
  const setSearch = (value: string) =>
    router.replace(value ? `${HOME_PATH}?q=${encodeURIComponent(value)}` : HOME_PATH, { scroll: false });
  const [host, setHost] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setHost(window.location.host));
    return () => window.clearTimeout(id);
  }, []);

  const [renaming, setRenaming] = useState<{ slug: string; name: string } | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [confirm, confirmDialog] = useDsConfirm();

  const current = list?.current ?? null;
  // Keep each project's place: the public site shows the first one for now.
  const cards = (list?.projects ?? [])
    .map((project, index) => ({ project, onSite: index === 0 }))
    .filter(({ project }) => !query || project.name.toLowerCase().includes(query));

  async function saveName() {
    if (!renaming || !renaming.name.trim() || savingName) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/admin/projects/${renaming.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renaming.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await reload();
      setRenaming(null);
      dsToast.success("Project renamed");
    } catch (error) {
      dsToast.error("Couldn't rename the project", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSavingName(false);
    }
  }

  async function deleteProject(project: ProjectSummary) {
    const ok = await confirm({
      title: `Delete ${project.name}?`,
      description: "Its posts, pages, categories, library and settings are deleted for good, with the files in storage.",
      confirmLabel: "Delete project",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/projects/${project.slug}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await reload();
      dsToast.success(`${project.name} deleted`);
    } catch (error) {
      dsToast.error("Couldn't delete the project", { description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="pointer-events-none sticky top-0 z-20 flex flex-col ds-nav-fade pb-5 [&>*]:pointer-events-auto">
        <div className="flex flex-wrap items-center gap-2 px-5 py-5">
          <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">Projects</h1>
          {/* Phones put the search on its own row below. */}
          <DsSearch
            value={search}
            onValueChange={setSearch}
            placeholder="Search projects"
            aria-label="Search projects"
            className="order-last w-full sm:order-none sm:w-60"
          />
          {/* Like + Post on the posts list. */}
          {(cards.length > 0 || query) && (
            <DsButton href={NEW_PROJECT_PATH} iconLeft={Plus}>
              Project
            </DsButton>
          )}
          <AdminMenuButton />
        </div>
      </div>

      {list === null ? (
        // Loading: the posts list's spinner, in the middle of the page like the empty states.
        <div className="flex flex-1 items-center justify-center">
          <Loader2 aria-label="Loading projects" className="size-6 animate-spin text-ds-fg-subtle" />
        </div>
      ) : cards.length === 0 ? (
        query ? (
          <DsEmptyState>No projects match that.</DsEmptyState>
        ) : (
          <DsEmptyState
            action={
              <DsButton href={NEW_PROJECT_PATH} iconLeft={Plus}>
                New project
              </DsButton>
            }
          >
            No projects yet.
          </DsEmptyState>
        )
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5 px-5 pb-5">
          {cards.map(({ project, onSite }) => (
            <li
              key={project.slug}
              className="relative flex min-h-44 flex-col justify-between gap-ds-40 rounded-ds-lg bg-ds-surface-subtle p-5 transition-colors hover:bg-ds-surface"
            >
              {/* The name and its status; a long name wraps, and the pill follows it. */}
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                {/* The name opens the project, stretched over the whole card. */}
                <button
                  type="button"
                  onClick={() => openProject(project.slug, current)}
                  className="min-w-0 break-words text-left text-p text-ds-fg ds-focus-stretched after:absolute after:inset-0 after:rounded-ds-lg"
                >
                  {project.name}
                </button>
                <DsPill>{onSite ? "Published" : "Not published"}</DsPill>
              </div>
              {/* Where it lives and when it changed; the ⋮ menu at the bottom right (pulled into the corner). */}
              <div className="flex min-w-0 items-end justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5 text-small text-ds-fg-subtle">
                  {onSite && <p className="truncate">{host}</p>}
                  {project.lastChange && <p className="truncate">Changed {formatChangedAt(project.lastChange)}</p>}
                </div>
                <DsDropdown>
                  <DsDropdownTrigger asChild>
                    <DsButton
                      variant="text"
                      iconLeft={MoreVertical}
                      aria-label={`Actions for ${project.name}`}
                      className="relative z-10 -mr-2 -mb-2 shrink-0"
                    />
                  </DsDropdownTrigger>
                  <DsDropdownContent>
                    <DsDropdownItem iconLeft={Settings} onSelect={() => openProject(project.slug, current, "/admin/settings")}>
                      Settings
                    </DsDropdownItem>
                    <DsDropdownItem iconLeft={Pencil} onSelect={() => setRenaming({ slug: project.slug, name: project.name })}>
                      Rename
                    </DsDropdownItem>
                    {/* The project the site shows holds the accounts too, so it stays. */}
                    {!onSite && (
                      <>
                        <DsDropdownSeparator />
                        <DsDropdownItem tone="danger" iconLeft={Trash2} onSelect={() => deleteProject(project)}>
                          Delete project
                        </DsDropdownItem>
                      </>
                    )}
                  </DsDropdownContent>
                </DsDropdown>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DsDialog open={renaming !== null} onOpenChange={(open) => !open && !savingName && setRenaming(null)} title="Rename project">
        {renaming && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              saveName();
            }}
          >
            <DsField label="Name" description="It's the site's name too.">
              <DsInput
                value={renaming.name}
                onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                maxLength={PROJECT_NAME_MAX}
                autoFocus
              />
            </DsField>
            <DsDialogActions>
              <DsButton type="submit" variant="primary" loading={savingName} disabled={!renaming.name.trim()}>
                Save
              </DsButton>
              <DsDialogCancel asChild>
                <DsButton disabled={savingName}>Cancel</DsButton>
              </DsDialogCancel>
            </DsDialogActions>
          </form>
        )}
      </DsDialog>
      {confirmDialog}
    </div>
  );
}

export default function HomePage() {
  // The search comes from the address, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <HomeProjects />
    </Suspense>
  );
}
