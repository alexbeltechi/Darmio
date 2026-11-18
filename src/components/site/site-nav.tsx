"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { DsButton, DsMenu, DsThemeToggle, DsTopBar, type DsNavSurface } from "@beltechi/parabola";

/** A section in the nav: a top-level category and the slugs that light it. */
export type NavSection = { slug: string; label: string; members: string[] };

// Pages whose URL doesn't name a category (a post) can light a pill anyway.
let highlightOverride: string | null = null;
const listeners = new Set<() => void>();

function setHighlightOverride(slug: string | null) {
  highlightOverride = slug;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Lights the given nav pill while mounted, e.g. a post's main category. */
export function NavHighlight({ slug }: { slug: string | null }) {
  useEffect(() => {
    setHighlightOverride(slug);
    return () => setHighlightOverride(null);
  }, [slug]);
  return null;
}

/** The nav pill lit for a given path: home, a section, or a category inside
 * one (e.g. /portrait lights up Photography). */
function activeSlugForPath(pathname: string, sections: NavSection[]): string {
  if (pathname === "/") return "home";

  const segment = pathname.split("/")[1] ?? "";
  return sections.find((c) => c.members.includes(segment))?.slug ?? "";
}

const LOGO_CLASS = "text-h3 text-ds-fg";

/** The desktop nav's ghost links: muted, with a light surface on hover. */
const NAV_LINK_CLASS = "bg-transparent text-ds-fg-muted hover:bg-ds-surface/40 hover:text-ds-fg";
/** The link to the page you're on: the ghost's hover surface, kept, in the text colour. */
const NAV_CURRENT_CLASS = "bg-ds-surface/40 text-ds-fg";

/**
 * Site nav, rendered once in the persistent site layout so it never
 * unmounts (and never flickers) between route changes.
 *
 * From `sm` up it's the conventional bar: the site's
 * name on the left in H3, a little bigger than the links, the way home; on
 * the right the sections as ghost `DsButton`s 4px apart (muted text, a light
 * surface on hover, which the page you're on keeps), then the theme
 * switch, a ghost icon that flips to the other theme. Below `sm` the same
 * bar holds the name and an "Explore" button that opens the Parabola
 * `DsMenu`, which also holds the theme switch. At every width it's as wide as
 * the reading column and fixed to the top on Parabola's `DsTopBar`, compact
 * (12px above and below, as in the admin), with the background the site's
 * theme picks: none, blur (the page scrolls softly under it) or solid.
 */
export function SiteNav({
  siteName,
  sections,
  surface = "blur",
}: {
  siteName: string;
  /** What's behind the bar, from the site's theme (`theme.nav.surface`). */
  surface?: DsNavSurface;
  /** The top-level categories marked for the nav; none means no nav, just the name. */
  sections: NavSection[];
}) {
  const pathname = usePathname();
  const override = useSyncExternalStore(subscribe, () => highlightOverride, () => null);
  const active = override ?? activeSlugForPath(pathname, sections);
  // No Home: the site's name is the way home.
  const NAV_ITEMS = sections.map((c) => ({ slug: c.slug, label: c.label, href: `/${c.slug}` }));
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // A link to the section you're already on won't trigger a navigation (or
  // its scroll reset), so scroll back to top by hand instead. Judged by the
  // URL, not the lit pill: on a post the pill is only a highlight, and
  // clicking it should open that section.
  const handleClick = (slug: string) => (e: React.MouseEvent) => {
    setMobileOpen(false);
    if (slug !== activeSlugForPath(pathname, sections)) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navButton = (
    item: (typeof NAV_ITEMS)[number],
    className = "",
    style?: React.CSSProperties,
    variant: "default" | "text" = "default"
  ) => (
    <DsButton
      key={item.slug}
      href={item.href}
      onClick={handleClick(item.slug)}
      current={active === item.slug}
      variant={variant}
      className={className}
      style={style}
    >
      {item.label}
    </DsButton>
  );

  return (
    <>
      {/* One bar at every width, over the page. Its sides on a phone put Explore where the
          menu's Close button sits. The blur's fade needs room under the row to run out in. */}
      <DsTopBar
        surface={surface}
        className={`fixed inset-x-0 z-(--ds-z-nav) pt-3 pr-[14px] pl-5 sm:px-5 ${surface === "blur" ? "pb-5" : "pb-3"}`}
      >
        <div className="mx-auto flex w-full max-w-[700px] items-center justify-between gap-4">
          <Link href="/" onClick={handleClick("home")} className={`min-w-0 truncate ${LOGO_CLASS}`}>
            {siteName}
          </Link>
          <nav className="hidden shrink-0 items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) =>
              navButton(item, active === item.slug ? NAV_CURRENT_CLASS : NAV_LINK_CLASS, undefined, "text")
            )}
            {/* On mobile the theme switch lives in the menu. */}
            <DsThemeToggle variant="text" className={NAV_LINK_CLASS} />
          </nav>
          <DsButton
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-haspopup="dialog"
            iconLeft={Menu}
            className="shrink-0 sm:hidden"
          >
            Explore
          </DsButton>
        </div>
      </DsTopBar>

      <DsMenu open={mobileOpen} onClose={closeMobile} className="sm:hidden">
        <Link href="/" onClick={handleClick("home")} className={`absolute top-[18px] left-5 ${LOGO_CLASS}`}>
          {siteName}
        </Link>

        {/* Same corner "Explore" sits in; close stays rightmost, theme switch to its left. */}
        <div className="absolute top-3 right-[14px] flex items-center gap-2">
          <DsThemeToggle />
          <DsButton iconLeft={X} onClick={closeMobile}>
            Close
          </DsButton>
        </div>

        <nav className="flex flex-col items-center gap-1">
          {NAV_ITEMS.map((item, i) =>
            navButton(
              item,
              "animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out [animation-fill-mode:both] motion-reduce:animate-none",
              { animationDelay: `${i * 60}ms` }
            )
          )}
        </nav>
      </DsMenu>
    </>
  );
}
