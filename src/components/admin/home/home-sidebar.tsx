"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Settings } from "lucide-react";
import { DsNavItem, DsSearch, DsThemeToggle } from "@beltechi/parabola";
import { AccountMenu } from "@/components/admin/layout/account-menu";
import { openProject } from "@/components/admin/projects/project-actions";
import { HOME_PATH, HOME_SETTINGS_PATH, NEW_PROJECT_PATH } from "./home-routes";
import { useProjects } from "./use-projects";

/** Width of Home's sidebar, for the page beside it. */
export const HOME_SIDEBAR_WIDTH = "lg:pl-[260px]";

/**
 * Home's sidebar (decisions, 2026-10-26), the way Framer's dashboard has one:
 * a search over the projects, then Projects (all of them, each one stacked,
 * New project), and at the foot the install's Settings, you and the theme.
 * Full width rather than the rail's icons: Home is about every project, the
 * rail about one. Hidden below `lg`, where the admin menu carries the same.
 */
export function HomeSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const query = useSearchParams().get("q") ?? "";
  const list = useProjects();

  // The search filters Home's cards; typing from another Home page goes there.
  const search = (value: string) =>
    router.replace(value ? `${HOME_PATH}?q=${encodeURIComponent(value)}` : HOME_PATH);

  return (
    <aside className="fixed inset-y-0 left-0 z-(--ds-z-nav) hidden w-[260px] flex-col gap-5 border-r border-ds-border bg-ds-bg p-5 lg:flex">
      <DsSearch value={query} onValueChange={search} placeholder="Search projects" aria-label="Search projects" />

      <nav aria-label="Projects" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <p className="px-3 pb-1 text-small text-ds-fg-muted">Projects</p>
        <DsNavItem href={HOME_PATH} iconLeft={LayoutGrid} selected={pathname === HOME_PATH}>
          All projects
        </DsNavItem>
        {list?.projects.map((project) => (
          <DsNavItem
            key={project.slug}
            meta={project.slug === list.current ? "Open" : undefined}
            onClick={() => openProject(project.slug, list.current)}
          >
            {project.name}
          </DsNavItem>
        ))}
        <DsNavItem href={NEW_PROJECT_PATH} selected={pathname === NEW_PROJECT_PATH} className="text-ds-fg-muted">
          New project
        </DsNavItem>
      </nav>

      <div className="flex flex-col gap-1">
        <DsNavItem href={HOME_SETTINGS_PATH} iconLeft={Settings} selected={pathname === HOME_SETTINGS_PATH}>
          Settings
        </DsNavItem>
        <div className="flex items-center gap-2 pt-2">
          <AccountMenu side="top" align="start" withEmail />
          <DsThemeToggle />
        </div>
      </div>
    </aside>
  );
}
