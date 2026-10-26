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

/** How long the hover menu waits before closing, so the pointer can cross the gap to it. */
const CLOSE_DELAY_MS = 150;

/**
 * The projects menu (decisions, 2026-10-26), Home's sidebar in short: your
 * projects, the current one ticked, each with a gear for its settings, New
 * project, then Home and your Settings. Picking a project opens it.
 *
 * `hover`: the rail's Home button. The menu opens while the pointer is on the
 * button or the menu, and a click on the button goes Home instead of
 * toggling the menu (Enter too; arrow down opens the menu from the
 * keyboard). Without it (the mobile menu, on touch) a tap opens the menu.
 *
 * `children` is the trigger.
 */
export function ProjectMenu({
  hover = false,
  align = "start",
  children,
}: {
  hover?: boolean;
  align?: "start" | "center" | "end";
  children: React.ReactElement;
}) {
  const router = useRouter();
  const [list, setList] = React.useState<ProjectList | null>(null);
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<number | undefined>(undefined);

  const load = React.useCallback(() => {
    fetch("/api/admin/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.data && setList(json.data))
      .catch(() => {});
  }, []);

  const changeOpen = React.useCallback(
    (next: boolean) => {
      window.clearTimeout(closeTimer.current);
      if (next) load();
      setOpen(next);
    },
    [load]
  );
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  React.useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const hoverTrigger = hover
    ? {
        onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && changeOpen(true),
        onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && closeSoon(),
        // A click goes Home (the trigger is a link); it doesn't toggle the menu.
        onPointerDown: (e: React.PointerEvent) => e.preventDefault(),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          router.push(HOME_PATH);
        },
      }
    : {};
  const hoverContent = hover
    ? { onPointerEnter: () => window.clearTimeout(closeTimer.current), onPointerLeave: closeSoon }
    : {};

  const current = list?.current ?? null;
  const projects = list?.projects ?? [];

  return (
    <DsDropdown modal={false} open={open} onOpenChange={changeOpen}>
      <DsDropdownTrigger asChild {...hoverTrigger}>
        {children}
      </DsDropdownTrigger>
      <DsDropdownContent align={align} sideOffset={8} className="min-w-64" {...hoverContent}>
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
