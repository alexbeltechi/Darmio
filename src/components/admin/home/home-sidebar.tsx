"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutGrid, Settings } from "lucide-react";
import { DsButton, DsNavItem, DsThemeToggle } from "@beltechi/parabola";
import { ACCOUNT_PATH, HOME_PATH } from "./home-routes";

/** Width of Home's sidebar, for the page beside it. */
export const HOME_SIDEBAR_WIDTH = "lg:pl-[260px]";

/**
 * Home's sidebar: "Home" at the top, then Projects (the cards beside it,
 * which list every project and hold New project) and Settings (yours). At
 * the foot, Sign out as a plain button, so it doesn't read as one more place
 * to go, with the theme beside it. Full width rather than the rail's icons: Home
 * is about every project, the rail about one. Hidden below `lg`, where the
 * admin menu carries the same.
 */
export function HomeSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-(--ds-z-nav) hidden w-[260px] flex-col gap-5 border-r border-ds-border bg-ds-bg p-5 lg:flex">
      <nav aria-label="Home" className="flex flex-1 flex-col items-start gap-1">
        {/* Where you are: a small label, 8px over the items. */}
        <p className="mb-1 px-3 text-small text-ds-fg-subtle">Home</p>
        <DsNavItem href={HOME_PATH} iconLeft={LayoutGrid} selected={pathname === HOME_PATH}>
          Projects
        </DsNavItem>
        <DsNavItem href={ACCOUNT_PATH} iconLeft={Settings} selected={pathname === ACCOUNT_PATH}>
          Settings
        </DsNavItem>
      </nav>

      <div className="flex items-center gap-2">
        <DsButton onClick={() => signOut({ callbackUrl: "/admin/login" })}>Sign out</DsButton>
        <DsThemeToggle />
      </div>
    </aside>
  );
}
