"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutGrid, Settings } from "lucide-react";
import { DsButton, DsNavItem, DsThemeToggle } from "@beltechi/parabola";
import { ACCOUNT_PATH, HOME_PATH } from "./home-routes";

/** Width of Home's sidebar, for the page beside it. */
export const HOME_SIDEBAR_WIDTH = "lg:pl-[260px]";

/**
 * Home's sidebar (decisions, 2026-10-26): Projects (the cards beside it,
 * which list every project and hold New project) and Settings (yours), then
 * Sign out as a plain button, so it doesn't read as one more place to go.
 * The theme sits at the foot. Full width rather than the rail's icons: Home
 * is about every project, the rail about one. Hidden below `lg`, where the
 * admin menu carries the same.
 */
export function HomeSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-(--ds-z-nav) hidden w-[260px] flex-col gap-5 border-r border-ds-border bg-ds-bg p-5 lg:flex">
      <nav aria-label="Home" className="flex flex-1 flex-col items-start gap-1">
        <DsNavItem href={HOME_PATH} iconLeft={LayoutGrid} selected={pathname === HOME_PATH}>
          Projects
        </DsNavItem>
        <DsNavItem href={ACCOUNT_PATH} iconLeft={Settings} selected={pathname === ACCOUNT_PATH}>
          Settings
        </DsNavItem>
        <DsButton onClick={() => signOut({ callbackUrl: "/admin/login" })} className="mt-4">
          Sign out
        </DsButton>
      </nav>

      <div>
        <DsThemeToggle />
      </div>
    </aside>
  );
}
