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
 * project as a card (no thumbnails or icons: its name and a gear at the top,
 * then where it's live or "Not published" and when it last changed), with a search over them and New
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
          <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">All projects</h1>
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
              {/* The name at the top, level with the gear (pulled into the corner). */}
              <div className="-mt-2 -mr-2 flex min-w-0 items-center gap-1">
                {/* The name opens the project, stretched over the whole card. */}
                <button
                  type="button"
                  onClick={() => openProject(project.slug, current)}
                  className="min-w-0 truncate text-left text-p text-ds-fg ds-focus-stretched after:absolute after:inset-0 after:rounded-ds-lg"
                >
                  {project.name}
                </button>
                {project.slug === current && <DsPill>Open</DsPill>}
                <DsButton
                  variant="text"
                  iconLeft={Settings}
                  aria-label={`${project.name} settings`}
                  onClick={() => openProject(project.slug, current, "/admin/settings")}
                  className="relative z-10 ml-auto"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 text-small text-ds-fg-subtle">
                <p className="truncate">{onSite ? `Live at ${host}` : "Not published"}</p>
                {project.lastChange && <p className="truncate">Changed {formatChangedAt(project.lastChange)}</p>}
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
