"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Home, Settings } from "lucide-react";
import {
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownLabel,
  DsDropdownSeparator,
  DsDropdownTrigger,
} from "@beltechi/parabola";
import type { ProjectSummary } from "@/lib/cms/projects";
import { openProject } from "@/components/admin/projects/project-actions";
import { HOME_PATH, ACCOUNT_PATH, NEW_PROJECT_PATH } from "@/components/admin/home/home-routes";

type ProjectList = { projects: ProjectSummary[]; current: string | null };

/**
 * The projects menu (decisions, 2026-10-26), Home's sidebar in short: your
 * projects, the current one ticked, each with a gear for its settings, New
 * project, then Home and your Settings. Picking a project opens it.
 *
 * It's the phone menu's way between projects; on a computer the rail's Home
 * button goes to Home, which shows them all.
 *
 * `children` is the trigger.
 */
export function ProjectMenu({
  align = "start",
  children,
}: {
  align?: "start" | "center" | "end";
  children: React.ReactElement;
}) {
  const router = useRouter();
  const [list, setList] = React.useState<ProjectList | null>(null);

  // Fetched each time the menu opens, so a new project shows straight away.
  const load = () =>
    fetch("/api/admin/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.data && setList(json.data))
      .catch(() => {});

  const current = list?.current ?? null;
  const projects = list?.projects ?? [];

  return (
    <DsDropdown modal={false} onOpenChange={(open) => open && load()}>
      <DsDropdownTrigger asChild>{children}</DsDropdownTrigger>
      <DsDropdownContent align={align} sideOffset={8} className="min-w-64">
        <DsDropdownLabel>{projects.length === 1 ? "Project" : "Projects"}</DsDropdownLabel>
        {projects.map((project) => (
          <div key={project.slug} className="flex items-center gap-1">
            <DsDropdownItem
              className="min-w-0 flex-1"
              trailing={project.slug === current ? <Check aria-hidden /> : undefined}
              onSelect={() => openProject(project.slug, current)}
            >
              {project.name}
            </DsDropdownItem>
            <DsDropdownItem
              aria-label={`${project.name} settings`}
              title="Settings"
              className="w-auto shrink-0 px-2.5"
              onSelect={() => openProject(project.slug, current, "/admin/settings")}
            >
              <Settings aria-hidden />
            </DsDropdownItem>
          </div>
        ))}
        <DsDropdownItem tone="subtle" onSelect={() => router.push(NEW_PROJECT_PATH)}>
          New project
        </DsDropdownItem>
        <DsDropdownSeparator />
        <DsDropdownItem iconLeft={Home} onSelect={() => router.push(HOME_PATH)}>
          Home
        </DsDropdownItem>
        <DsDropdownItem iconLeft={Settings} onSelect={() => router.push(ACCOUNT_PATH)}>
          Settings
        </DsDropdownItem>
      </DsDropdownContent>
    </DsDropdown>
  );
}
