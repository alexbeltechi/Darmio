"use client";

import { useEffect, useState } from "react";
import { Folder, Globe, Plus, Settings } from "lucide-react";
import { DsButton, DsListRow, DsPill } from "@beltechi/parabola";
import { AdminMenuButton } from "@/components/admin/layout";
import { AccountSettings } from "@/components/admin/settings/account-settings";
import { openProject } from "@/components/admin/projects/project-actions";
import type { ProjectSummary } from "@/lib/cms/projects";

type ProjectList = { projects: ProjectSummary[]; current: string | null };

/**
 * Home (decisions, 2026-10-26), the way Figma's and Framer's open: what's
 * yours across the install rather than one project's. Your projects (open one,
 * or its gear for its settings), New project, then you (name and password).
 * Signing in and setting up land here. No thumbnails: a row per project.
 */
export default function HomePage() {
  const [list, setList] = useState<ProjectList | null>(null);
  const [host, setHost] = useState("");

  useEffect(() => {
    fetch("/api/admin/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        setHost(window.location.host);
        setList(json?.data ?? { projects: [], current: null });
      })
      .catch(() => setList({ projects: [], current: null }));
  }, []);

  const current = list?.current ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="pointer-events-none sticky top-0 z-20 flex flex-col ds-nav-fade pb-5 [&>*]:pointer-events-auto">
        <div className="flex items-center gap-2 px-5 py-5">
          <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">Projects</h1>
          <DsButton href="/admin/projects/new" variant="primary" iconLeft={Plus}>
            New project
          </DsButton>
          <AdminMenuButton />
        </div>
      </div>

      <div className="flex flex-col gap-ds-40 px-5 pb-5">
        <ul className="flex flex-col">
          {list?.projects.map((project, index) => (
            <li key={project.slug}>
              {/* The public site shows the first project for now; the others get theirs with domains. */}
              <DsListRow
                thumbnailIcon={index === 0 ? Globe : Folder}
                title={project.name}
                pill={project.slug === current ? <DsPill>Open</DsPill> : undefined}
                detail={index === 0 ? `Live at ${host}` : "Not on the public site yet"}
                onOpen={() => openProject(project.slug, current)}
                actions={
                  <DsButton
                    variant="text"
                    iconLeft={Settings}
                    aria-label={`${project.name} settings`}
                    onClick={() => openProject(project.slug, current, "/admin/settings")}
                  />
                }
              />
            </li>
          ))}
        </ul>

        <AccountSettings />
      </div>
    </div>
  );
}
