"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { DsButton, DsMenu, DsThemeToggle } from "@beltechi/parabola";

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

// Distance above the logo's bottom edge over which it fades out as the page
// content scrolls up to meet it.
const LOGO_FADE_RANGE = 40;

// Where the page content starts: a `data-content-start` marker.
function contentStartTop(): number | null {
  const marker = document.querySelector<HTMLElement>("[data-content-start]");
  if (marker) return marker.getBoundingClientRect().top;
  // Pages without a marker: fall back to plain scroll distance.
  return null;
}

function currentScrollTop(): number {
  return window.scrollY;
}

function useLogoOpacity(
  logoRef: React.RefObject<HTMLAnchorElement | null>,
  pathname: string
): number {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const logoBottom = logoRef.current?.getBoundingClientRect().bottom ?? 44;
      const contentTop = contentStartTop();
      const distance =
        contentTop === null ? LOGO_FADE_RANGE * 2 - currentScrollTop() : contentTop - logoBottom;
      setOpacity(Math.min(1, Math.max(0, distance / LOGO_FADE_RANGE)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    // The new page's content may mount after the route change; re-measure once it has.
    update();
    raf = requestAnimationFrame(update);
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [logoRef, pathname]);

  return opacity;
}

const LOGO_CLASS = "text-h3 text-ds-fg";

/** The desktop nav's ghost links: muted, the page colour on hover, no current highlight. */
const NAV_LINK_CLASS = "bg-transparent text-ds-fg-muted hover:bg-ds-surface/40 hover:text-ds-fg";

/**
 * Site nav, rendered once in the persistent site layout so it never
 * unmounts (and never flickers) between route changes.
 *
 * From `sm` up it's the conventional bar: the site's
 * name on the left in H3, a little bigger than the links, the way home; on
 * the right the sections as ghost `DsButton`s 4px apart (muted text, a light
 * surface on hover, the current page not highlighted), then the theme
 * switch, a ghost icon that flips to the other theme. It's as wide as the
 * reading column and fixed to the top over a fade, so the page scrolls under
 * it. Below `sm` it's the site's name top-left (fading out as the page
 * content scrolls up to it) and an "Explore" button top-right that opens the
 * Parabola `DsMenu`, which also holds the theme switch.
 */
export function SiteNav({
  siteName,
  sections,
}: {
  siteName: string;
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
  const logoRef = useRef<HTMLAnchorElement>(null);
  const logoOpacity = useLogoOpacity(logoRef, pathname);

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
      {/* Sits above the page content; the page fades out beneath it. The bar is
          as wide as the reading column, so the name and links line up with the text. */}
      <header className="fixed inset-x-0 top-0 z-(--ds-z-nav) hidden ds-nav-fade px-5 py-5 sm:block">
        <div className="mx-auto flex w-full max-w-[600px] items-center justify-between gap-4">
          <Link href="/" onClick={handleClick("home")} className={`min-w-0 truncate ${LOGO_CLASS}`}>
            {siteName}
          </Link>
          <nav className="flex shrink-0 items-center gap-1">
            {/* The page you're on isn't highlighted (only aria-current marks it): every link is
                muted, with the ghost's light surface on hover. */}
            {NAV_ITEMS.map((item) => navButton(item, NAV_LINK_CLASS, undefined, "text"))}
            {/* On mobile the theme switch lives in the menu. */}
            <DsThemeToggle variant="text" className={NAV_LINK_CLASS} />
          </nav>
        </div>
      </header>

      <Link
        ref={logoRef}
        href="/"
        onClick={handleClick("home")}
        aria-hidden={logoOpacity === 0}
        tabIndex={logoOpacity === 0 ? -1 : undefined}
        className={`fixed top-5 left-5 z-(--ds-z-nav) sm:hidden ${LOGO_CLASS} ${
          logoOpacity === 0 ? "pointer-events-none" : ""
        }`}
        style={{ opacity: logoOpacity }}
      >
        {siteName}
      </Link>

      <DsButton
        onClick={() => setMobileOpen(true)}
        aria-expanded={mobileOpen}
        aria-haspopup="dialog"
        iconLeft={Menu}
        className="fixed top-[14px] right-[14px] z-(--ds-z-nav) sm:hidden"
      >
        Explore
      </DsButton>

      <DsMenu open={mobileOpen} onClose={closeMobile} className="sm:hidden">
        <Link href="/" onClick={handleClick("home")} className={`absolute top-5 left-5 ${LOGO_CLASS}`}>
          {siteName}
        </Link>

        {/* Same corner "Explore" sits in; close stays rightmost, theme switch to its left. */}
        <div className="absolute top-[14px] right-[14px] flex items-center gap-2">
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
