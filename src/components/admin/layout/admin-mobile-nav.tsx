"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutGrid, LogOut, Menu, Settings, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { DsButton, DsMenu, DsThemeToggle } from "@beltechi/parabola";
import { cn } from "@/lib/utils";
import { useSiteName } from "@/components/admin/use-site-settings";
import { ADMIN_NAV_ITEMS, activeNavItem, type AdminNavKey } from "./nav-items";
import { ProjectMenu } from "./project-menu";
import { HOME_PATH, ACCOUNT_PATH, NEW_PROJECT_PATH, isHomePath } from "@/components/admin/home/home-routes";
import { useProjects } from "@/components/admin/home/use-projects";
import { openProject } from "@/components/admin/projects/project-actions";
import { AccountMenu } from "./account-menu";

const OPEN_EVENT = "admin-menu:open";

/**
 * The hamburger that opens the admin menu below `lg`. Put it at the right
 * end of a page's own header so the page needs no separate top bar (Figma
 * 699:6599 has none); pages without one get the fallback bar from
 * AdminMobileNav.
 *
 * It opens the menu with a DOM event rather than through context: a context
 * read here, inside the page segment, threw off React's useId on hydration
 * and broke the Radix menus beside it.
 */
export function AdminMenuButton({ className }: { className?: string }) {
  return (
    <DsButton
      // Hides the fallback bar (by CSS, so nothing changes mid-hydration).
      data-admin-menu-button=""
      iconLeft={Menu}
      aria-label="Open menu"
      aria-haspopup="dialog"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className={cn("lg:hidden", className)}
    />
  );
}

/** Item counts for the menu, fetched each time it opens so they're current. */
function useNavCounts(enabled: boolean) {
  const [counts, setCounts] = React.useState<Partial<Record<AdminNavKey, number>>>({});

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const json = (url: string) => fetch(url).then((res) => (res.ok ? res.json() : null)).catch(() => null);

    Promise.all([
      json("/api/admin/collections/posts/entries?limit=1"),
      json("/api/admin/collections/pages/entries?limit=1"),
      json("/api/admin/categories"),
      json("/api/admin/media?limit=1"),
    ]).then(([posts, pages, categories, media]) => {
      if (cancelled) return;
      setCounts({
        posts: posts?.total ?? posts?.data?.length,
        pages: pages?.total ?? pages?.data?.length,
        categories: categories?.data?.length,
        library: media?.total,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return counts;
}

/**
 * Mobile admin navigation (Figma: Folio Dharmify 706:8731). Wraps the admin
 * pages and opens when an AdminMenuButton is pressed. The menu is the
 * Parabola DsMenu: the project menu top left, theme and close top right,
 * and the sections as nav pills down the middle with their counts.
 *
 * A page that hasn't put an AdminMenuButton in its own header gets a plain
 * bar with the section name and the hamburger at the right instead.
 */
export function AdminMobileNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = activeNavItem(pathname);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const siteName = useSiteName();
  const home = isHomePath(pathname);
  const projects = useProjects();
  const counts = useNavCounts(menuOpen);
  const closeMenu = React.useCallback(() => setMenuOpen(false), []);

  // The menu (and the scroll lock it holds) mustn't linger if the window
  // grows past the breakpoint where the rail takes over.
  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => query.matches && setMenuOpen(false);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => {
    const open = () => setMenuOpen(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  return (
    <>
      <div className="group/admin-nav contents">
        <div className="flex items-center justify-between gap-2 p-5 pb-0 lg:hidden group-has-[[data-admin-menu-button]]/admin-nav:hidden">
          {active && <span className="truncate text-p text-ds-fg">{active.label}</span>}
          <DsButton
            iconLeft={Menu}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            onClick={() => setMenuOpen(true)}
            className="ml-auto"
          />
        </div>

        {children}
      </div>

      <DsMenu open={menuOpen} onClose={closeMenu} label="Admin menu" className="lg:hidden">
        <div className="absolute inset-x-5 top-5 flex items-center justify-between">
          {home ? (
            <span className="text-p text-ds-fg">Home</span>
          ) : (
            <ProjectMenu>
              <DsButton iconRight={ChevronDown} aria-label="Project menu">
                {siteName ?? "…"}
              </DsButton>
            </ProjectMenu>
          )}
          <div className="flex items-center gap-2">
            <DsThemeToggle />
            {!home && <AccountMenu side="bottom" align="end" />}
            <DsButton iconLeft={X} aria-label="Close menu" onClick={closeMenu} />
          </div>
        </div>

        {home ? (
          // Home's sidebar, as pills: every project, each one, New project, your settings, sign out.
          <nav aria-label="Projects" className="flex flex-col items-center gap-1">
            {[
              { key: "all", href: HOME_PATH, icon: LayoutGrid, label: "All projects", current: pathname === HOME_PATH },
              ...(projects?.projects ?? []).map((project) => ({
                key: project.slug,
                onClick: () => openProject(project.slug, projects?.current ?? null),
                icon: undefined,
                label: project.name,
                current: false,
              })),
              { key: "new", href: NEW_PROJECT_PATH, icon: undefined, label: "New project", current: pathname === NEW_PROJECT_PATH },
              { key: "settings", href: ACCOUNT_PATH, icon: Settings, label: "Settings", current: pathname === ACCOUNT_PATH },
              { key: "sign-out", onClick: () => signOut({ callbackUrl: "/admin/login" }), icon: LogOut, label: "Sign out", current: false },
            ].map((item, i) => (
              <DsButton
                key={item.key}
                href={"href" in item ? item.href : undefined}
                iconLeft={item.icon}
                current={item.current}
                onClick={"onClick" in item ? item.onClick : closeMenu}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out [animation-fill-mode:both] motion-reduce:animate-none"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {item.label}
              </DsButton>
            ))}
          </nav>
        ) : (
        <nav aria-label="Admin" className="flex flex-col items-center gap-1">
          {ADMIN_NAV_ITEMS.map((item, i) => (
            <DsButton
              key={item.key}
              href={item.href}
              iconLeft={item.icon}
              meta={counts[item.key]?.toLocaleString()}
              current={active?.key === item.key}
              onClick={closeMenu}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out [animation-fill-mode:both] motion-reduce:animate-none"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {item.label}
            </DsButton>
          ))}
        </nav>
        )}
      </DsMenu>
    </>
  );
}
