"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Folder, Globe, Plus, Settings } from "lucide-react";
import { DsButton, DsEmptyState, DsPill } from "@beltechi/parabola";
import { AdminMenuButton } from "@/components/admin/layout";
import { openProject } from "@/components/admin/projects/project-actions";
import { NEW_PROJECT_PATH } from "@/components/admin/home/home-routes";
import { useProjects } from "@/components/admin/home/use-projects";

/**
 * Home (decisions, 2026-10-26), the way Framer's dashboard opens: every
 * project as a card (no thumbnails: a name, where it's live, a gear for its
 * settings) and New project. Signing in and setting up land here; the
 * sidebar beside it holds the search, the projects stacked, and the install's
 * settings. Nothing yet, or nothing matching the search: one line in the
 * middle of the page.
 */
function HomeProjects() {
  const list = useProjects();
  const query = (useSearchParams().get("q") ?? "").trim().toLowerCase();
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
        <div className="flex items-center gap-2 px-5 py-5">
          <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">{query ? "Search" : "All projects"}</h1>
          {cards.length > 0 && newProject}
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
              <div className="flex size-12 items-center justify-center rounded-ds-md bg-ds-surface/70 text-ds-fg-subtle [&_svg]:size-5">
                {onSite ? <Globe aria-hidden /> : <Folder aria-hidden />}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex min-w-0 items-center gap-1">
                  {/* The name opens the project, stretched over the whole card. */}
                  <button
                    type="button"
                    onClick={() => openProject(project.slug, current)}
                    className="truncate text-left text-p text-ds-fg ds-focus-stretched after:absolute after:inset-0 after:rounded-ds-lg"
                  >
                    {project.name}
                  </button>
                  {project.slug === current && <DsPill>Open</DsPill>}
                </div>
                <p className="truncate text-small text-ds-fg-subtle">
                  {onSite ? `Live at ${host}` : "Not on the public site yet"}
                </p>
              </div>
              <DsButton
                variant="text"
                iconLeft={Settings}
                aria-label={`${project.name} settings`}
                onClick={() => openProject(project.slug, current, "/admin/settings")}
                className="absolute top-3 right-3 z-10"
              />
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
