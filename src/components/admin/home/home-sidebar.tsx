"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutGrid, LogOut, UserRound } from "lucide-react";
import { DsNavItem, DsThemeToggle } from "@beltechi/parabola";
import { openProject } from "@/components/admin/projects/project-actions";
import { ACCOUNT_PATH, HOME_PATH, NEW_PROJECT_PATH } from "./home-routes";
import { useProjects } from "./use-projects";

/** Width of Home's sidebar, for the page beside it. */
export const HOME_SIDEBAR_WIDTH = "lg:pl-[260px]";

/** A section's title in the sidebar. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-3 pb-1 text-small text-ds-fg-muted">{children}</p>;
}

/**
 * Home's sidebar (decisions, 2026-10-26), the way Framer's dashboard has one:
 * plain items in titled sections. Projects (all of them, each one stacked,
 * New project), then Settings (your Account, Sign out), and the theme at the
 * foot. The search sits by New project in the page's header. Full width
 * rather than the rail's icons: Home is about every project, the rail about
 * one. Hidden below `lg`, where the admin menu carries the same.
 */
export function HomeSidebar() {
  const pathname = usePathname();
  const list = useProjects();

  return (
    <aside className="fixed inset-y-0 left-0 z-(--ds-z-nav) hidden w-[260px] flex-col gap-ds-40 border-r border-ds-border bg-ds-bg p-5 lg:flex">
      <nav aria-label="Home" className="flex min-h-0 flex-1 flex-col gap-ds-40 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <SectionLabel>Projects</SectionLabel>
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
        </div>

        <div className="flex flex-col gap-1">
          <SectionLabel>Settings</SectionLabel>
          <DsNavItem href={ACCOUNT_PATH} iconLeft={UserRound} selected={pathname === ACCOUNT_PATH}>
            Account
          </DsNavItem>
          <DsNavItem iconLeft={LogOut} onClick={() => signOut({ callbackUrl: "/admin/login" })}>
            Sign out
          </DsNavItem>
        </div>
      </nav>

      <div>
        <DsThemeToggle />
      </div>
    </aside>
  );
}
