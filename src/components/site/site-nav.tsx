"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { DsButton, DsMenu, DsThemeToggle } from "@beltechi/parabola";
import { MAIN_CATEGORIES } from "./post-grid-shared";

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

const NAV_ITEMS = [
  { slug: "home", label: "Home", href: "/" },
  ...MAIN_CATEGORIES.filter((c) => c.nav).map((c) => ({ slug: c.slug, label: c.label, href: `/${c.slug}` })),
];

/** The nav pill lit for a given path: home, a main category, or a main
 * category's own sub-category (e.g. /portrait lights up Photography). */
function activeSlugForPath(pathname: string): string {
  if (pathname === "/") return "home";

  const segment = pathname.split("/")[1] ?? "";
  const main = MAIN_CATEGORIES.find(
    (c) => c.slug === segment || (c.members as readonly string[]).includes(segment)
  );
  return main?.slug ?? "";
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

/**
 * Site nav, rendered once in the persistent site layout so it never
 * unmounts (and never flickers) between route changes. Each pill is a route,
 * so views are reached by cycling through the nav rather than via back
 * buttons.
 *
 * Every control is a Parabola `DsButton`. From `sm` up it's a row of them
 * fixed 20px from the top. Below that it's the site's name top-left (fading
 * out as the page content scrolls up to it) and an "Explore" button top-right
 * that opens the Parabola `DsMenu`, which also holds the theme switch.
 */
export function SiteNav({ counts = {}, siteName }: { counts?: Record<string, number>; siteName: string }) {
  const pathname = usePathname();
  const override = useSyncExternalStore(subscribe, () => highlightOverride, () => null);
  const active = override ?? activeSlugForPath(pathname);
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
    if (slug !== activeSlugForPath(pathname)) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navButton = (item: (typeof NAV_ITEMS)[number], className = "", style?: React.CSSProperties) => (
    <DsButton
      key={item.slug}
      href={item.href}
      onClick={handleClick(item.slug)}
      current={active === item.slug}
      meta={counts[item.slug]}
      className={className}
      style={style}
    >
      {item.label}
    </DsButton>
  );

  return (
    <>
      {/* Sits above the page content (z-50). */}
      <nav className="pointer-events-none fixed inset-x-0 top-5 z-(--ds-z-nav) hidden flex-wrap items-center justify-center gap-1 px-5 sm:flex">
        {NAV_ITEMS.map((item) => navButton(item, "pointer-events-auto"))}
      </nav>

      {/* Desktop keeps the theme switch top right; on mobile it lives in the menu. */}
      <DsThemeToggle className="fixed top-5 right-5 z-(--ds-z-nav) hidden sm:inline-flex" />

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
