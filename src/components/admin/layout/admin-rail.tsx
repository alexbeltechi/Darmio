"use client";

import { usePathname } from "next/navigation";
import { DsButton, DsThemeToggle, DsTooltip } from "@beltechi/parabola";
import { siteInitial } from "@/lib/cms/site";
import { useSiteName } from "@/components/admin/use-site-settings";
import { ADMIN_NAV_ITEMS, activeNavItem } from "./nav-items";
import { ProjectMenu } from "./project-menu";

/** Width of the rail: a 36px button with 20px either side. */
export const ADMIN_RAIL_WIDTH = "lg:pl-[76px]";

/**
 * Desktop admin navigation (Figma: Folio Dharmify 701:7078), a Claude-style
 * icon rail with a 1px rule on its right edge: the site's initial as plain H1
 * text (the project menu, decisions 2026-10-24), a rule, one icon button per
 * section with the current one inverse, and the theme switch at the foot. Every button names itself in a tooltip to its right. Hidden below
 * `lg`, where the hamburger menu takes over.
 */
export function AdminRail() {
  const pathname = usePathname();
  const active = activeNavItem(pathname);
  const siteName = useSiteName();

  return (
    <aside className="fixed inset-y-0 left-0 z-(--ds-z-nav) hidden w-[76px] flex-col items-center border-r border-ds-border bg-ds-bg p-5 lg:flex">
      <ProjectMenu siteName={siteName}>
        {/* The site's initial, set as a heading but kept to a button's 36px height so the
            divider below stays level with the search bar. */}
        <button
          type="button"
          aria-label="Project menu"
          title={siteName ?? undefined}
          className="flex h-9 min-w-9 items-center justify-center text-h1 leading-none text-ds-fg ds-focus rounded-ds-md"
        >
          {siteName ? siteInitial(siteName) : "\u00a0"}
        </button>
      </ProjectMenu>

      {/* The divider starts level with the top of the search bar beside it: a page
          header is 20px padding, a 36px title row, 20px padding, then the search
          bar, so its top edge is 76px down. 20px above the line (as the rail's own
          padding), 19px below it, and the menu begins at 96px. */}
      <div aria-hidden className="flex h-10 w-full shrink-0 items-start">
        <div className="mt-5 h-px w-full bg-ds-border" />
      </div>

      <nav aria-label="Admin" className="flex flex-1 flex-col gap-1">
        {ADMIN_NAV_ITEMS.map((item) => (
          <DsTooltip key={item.key} content={item.label} side="right">
            <DsButton
              href={item.href}
              iconLeft={item.icon}
              aria-label={item.label}
              current={active?.key === item.key}
            />
          </DsTooltip>
        ))}
      </nav>

      <DsTooltip content="Toggle theme" side="right">
        <DsThemeToggle />
      </DsTooltip>
    </aside>
  );
}
