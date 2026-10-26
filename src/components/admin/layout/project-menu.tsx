"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Check, ExternalLink, LogOut, Plus, UserRound } from "lucide-react";
import {
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownLabel,
  DsDropdownSeparator,
  DsDropdownTrigger,
  dsToast,
} from "@beltechi/parabola";
import type { ProjectSummary } from "@/lib/cms/projects";

type ProjectList = { projects: ProjectSummary[]; current: string | null };

/**
 * The project menu behind the admin's mark (decisions, 2026-10-24), the way
 * Figma's logo opens one: your projects (the current one ticked; pick
 * another to switch), Add project, then the site, your account and sign out.
 * An install from before projects lists its one site by name.
 *
 * `children` is the trigger: the rail passes the initial, the mobile menu the
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
    const res = await fetch("/api/admin/projects/current", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) {
      dsToast.error("Couldn't switch project");
      return;
    }
    // Everything on screen belongs to the old project: start the admin over.
    window.location.assign("/admin");
  }

  const projects = list?.projects ?? [];
  // The public site shows the first project for now; the others get theirs with domains.
  const onFirst = !list || projects.length < 2 || list.current === projects[0]?.slug;

  return (
    <DsDropdown modal={false} onOpenChange={(open) => open && load()}>
      <DsDropdownTrigger asChild>{children}</DsDropdownTrigger>
      <DsDropdownContent align={align} sideOffset={8} className="min-w-56">
        <DsDropdownLabel>{projects.length > 1 ? "Projects" : "Project"}</DsDropdownLabel>
        {projects.length === 0 ? (
          <DsDropdownItem trailing={<Check aria-hidden />} onSelect={() => router.push("/admin")}>
            {siteName ?? "…"}
          </DsDropdownItem>
        ) : (
          projects.map((project) => (
            <DsDropdownItem
              key={project.slug}
              trailing={project.slug === list?.current ? <Check aria-hidden /> : undefined}
              onSelect={() => switchTo(project.slug)}
            >
              {project.name}
            </DsDropdownItem>
          ))
        )}
        <DsDropdownItem iconLeft={Plus} tone="subtle" onSelect={() => router.push("/admin/projects/new")}>
          Add project
        </DsDropdownItem>
        <DsDropdownSeparator />
        {onFirst && (
          <DsDropdownItem iconLeft={ExternalLink} onSelect={() => router.push("/")}>
            View site
          </DsDropdownItem>
        )}
        <DsDropdownItem iconLeft={UserRound} onSelect={() => router.push("/admin/settings#account")}>
          Account
        </DsDropdownItem>
        <DsDropdownSeparator />
        <DsDropdownItem iconLeft={LogOut} onSelect={() => signOut({ callbackUrl: "/admin/login" })}>
          Sign out
        </DsDropdownItem>
      </DsDropdownContent>
    </DsDropdown>
  );
}
