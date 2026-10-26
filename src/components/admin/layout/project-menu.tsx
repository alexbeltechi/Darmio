"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Settings } from "lucide-react";
import {
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownLabel,
  DsDropdownTrigger,
  dsToast,
} from "@beltechi/parabola";
import type { ProjectSummary } from "@/lib/cms/projects";

type ProjectList = { projects: ProjectSummary[]; current: string | null };

/** Make another project the admin's current one (remembered in this browser). */
async function selectProject(slug: string): Promise<boolean> {
  const res = await fetch("/api/admin/projects/current", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  if (!res.ok) dsToast.error("Couldn't switch project");
  return res.ok;
}

/**
 * The project menu behind the admin's project tile (decisions, 2026-10-26),
 * the way Slack's workspace icon opens one: your projects, the current one
 * ticked, each with a gear for its settings, then New project. Picking a
 * project switches to it. You (account, sign out) live in the account menu
 * at the foot of the rail instead.
 *
 * `children` is the trigger: the rail passes the tile, the mobile menu the
 * name.
 */
export function ProjectMenu({
  siteName,
  align = "start",
  children,
}: {
  siteName: string | null;
  align?: "start" | "center" | "end";
  children: React.ReactElement;
}) {
  const router = useRouter();
  const [list, setList] = React.useState<ProjectList | null>(null);

  const load = React.useCallback(() => {
    fetch("/api/admin/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.data && setList(json.data))
      .catch(() => {});
  }, []);

  async function switchTo(slug: string) {
    if (slug === list?.current) return;
    // Everything on screen belongs to the old project: start the admin over.
    if (await selectProject(slug)) window.location.assign("/admin");
  }

  async function openSettings(slug: string) {
    if (slug === list?.current) return router.push("/admin/settings");
    if (await selectProject(slug)) window.location.assign("/admin/settings");
  }

  // An install from before projects has none listed: its one site stands in.
  const projects = list?.projects.length
    ? list.projects
    : [{ slug: "", name: siteName ?? "…" } as ProjectSummary];

  return (
    <DsDropdown modal={false} onOpenChange={(open) => open && load()}>
      <DsDropdownTrigger asChild>{children}</DsDropdownTrigger>
      <DsDropdownContent align={align} sideOffset={8} className="min-w-64">
        <DsDropdownLabel>{projects.length > 1 ? "Projects" : "Project"}</DsDropdownLabel>
        {projects.map((project) => {
          const current = !project.slug || project.slug === list?.current;
          return (
            <div key={project.slug} className="flex items-center gap-1">
              <DsDropdownItem
                className="min-w-0 flex-1"
                trailing={current ? <Check aria-hidden /> : undefined}
                onSelect={() => project.slug && switchTo(project.slug)}
              >
                {project.name}
              </DsDropdownItem>
              <DsDropdownItem
                aria-label={`${project.name} settings`}
                title="Settings"
                className="w-auto shrink-0 px-2.5"
                onSelect={() => (project.slug ? openSettings(project.slug) : router.push("/admin/settings"))}
              >
                <Settings aria-hidden />
              </DsDropdownItem>
            </div>
          );
        })}
        <DsDropdownItem iconLeft={Plus} tone="subtle" onSelect={() => router.push("/admin/projects/new")}>
          New project
        </DsDropdownItem>
      </DsDropdownContent>
    </DsDropdown>
  );
}
