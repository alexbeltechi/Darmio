"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Settings } from "lucide-react";
import { DsButton, DsEmptyState, DsPill, DsSearch } from "@beltechi/parabola";
import { AdminMenuButton } from "@/components/admin/layout";
import { openProject } from "@/components/admin/projects/project-actions";
import { HOME_PATH, NEW_PROJECT_PATH } from "@/components/admin/home/home-routes";
import { useProjects } from "@/components/admin/home/use-projects";
import { formatChangedAt } from "@/lib/utils";

/**
 * Home (decisions, 2026-10-26), the way Framer's dashboard opens: every
 * project as a card (no thumbnails or icons): its name with a Published or
 * Not published pill beside it, then at the bottom its address when it's
 * published and when it last changed, with a gear for its settings at the
 * bottom right; with a search over them and New
 * project at the top right. Signing in and setting up land here; the sidebar
 * beside it holds the projects stacked and your account. Nothing yet, or
 * nothing matching the search: one line in the middle of the page.
 */
function HomeProjects() {
  const list = useProjects();
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

  const current = list?.current ?? null;
  // Keep each project's place: the public site shows the first one for now.
  const cards = (list?.projects ?? [])
    .map((project, index) => ({ project, onSite: index === 0 }))
    .filter(({ project }) => !query || project.name.toLowerCase().includes(query));
  const newProject = (
    <DsButton href={NEW_PROJECT_PATH} variant="primary" iconLeft={Plus}>
      New project
    </DsButton>
  );

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
          {(cards.length > 0 || query) && newProject}
          <AdminMenuButton />
        </div>
      </div>

      {list === null ? null : cards.length === 0 ? (
        query ? (
          <DsEmptyState>No projects match that.</DsEmptyState>
        ) : (
          <DsEmptyState action={newProject}>No projects yet.</DsEmptyState>
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
              {/* Where it lives and when it changed; the gear at the bottom right (pulled into the corner). */}
              <div className="flex min-w-0 items-end justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5 text-small text-ds-fg-subtle">
                  {onSite && <p className="truncate">{host}</p>}
                  {project.lastChange && <p className="truncate">Changed {formatChangedAt(project.lastChange)}</p>}
                </div>
                <DsButton
                  variant="text"
                  iconLeft={Settings}
                  aria-label={`${project.name} settings`}
                  onClick={() => openProject(project.slug, current, "/admin/settings")}
                  className="relative z-10 -mr-2 -mb-2 shrink-0"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
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
