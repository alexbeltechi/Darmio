"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Px of scroll over which the pinned header fades out before the content
// scrolling up beneath it would visually overlap it.
const FADE_RANGE = 120;

function getScrollParent(el: HTMLElement): HTMLElement | Window {
  let node = el.parentElement;
  while (node) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }
  return window;
}

interface FixedFadeHeaderProps {
  children: React.ReactNode;
  /**
   * Classes for the pinned block. Its top padding places the content; its
   * bottom padding is the gap before the next section starts.
   */
  className?: string;
}

/**
 * Pins `children` to the top of the viewport in place of their normal
 * document position - an invisible in-flow copy reserves that space,
 * including the bottom padding gap, so the content below sits in its final
 * place from the very first (server-rendered) paint - then fades them out as the content below scrolls up to meet
 * them, so the pinned block never visibly overlaps what follows.
 *
 * The fade runs from the moment the next section enters the gap until it
 * reaches the bottom of the pinned content. Positions come from
 * getBoundingClientRect, which stays correct whether the page itself scrolls
 * (a direct page load) or an ancestor scrolls internally (the frosted modal
 * overlay, whose backdrop-filter makes it the containing block for `fixed`
 * descendants) - only the element the scroll listener attaches to changes.
 *
 * A `data-content-start` marker sits where the next section begins; the
 * mobile logo in SiteNav reads it to fade out as content approaches it too.
 */
export function FixedFadeHeader({ children, className = "" }: FixedFadeHeaderProps) {
  const fixedRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(1);

  const updateOpacity = useCallback(() => {
    const fixedEl = fixedRef.current;
    const contentEl = contentRef.current;
    const wrapperEl = wrapperRef.current;
    if (!fixedEl || !contentEl || !wrapperEl) return;
    const contentBottom = contentEl.getBoundingClientRect().bottom;
    const restGap = fixedEl.getBoundingClientRect().bottom - contentBottom;
    const distance = wrapperEl.getBoundingClientRect().bottom - contentBottom;
    const range = Math.min(FADE_RANGE, restGap) || 1;
    setOpacity(Math.min(1, Math.max(0, distance / range)));
  }, []);

  // Recompute once on mount, and whenever the reserved space changes size
  // (fonts loading, a resize), since the opacity depends on those positions.
  useLayoutEffect(() => {
    updateOpacity();
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return;
    const resizeObserver = new ResizeObserver(updateOpacity);
    resizeObserver.observe(wrapperEl);
    return () => resizeObserver.disconnect();
  }, [updateOpacity]);

  useEffect(() => {
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        updateOpacity();
      });
    };

    const scrollParent = getScrollParent(wrapperEl);
    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      scrollParent.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [updateOpacity]);

  return (
    <div ref={wrapperRef} className="relative">
      {/* The space the pinned block would take, reserved by CSS alone: no
          measuring, so there's no jump when scripts load. */}
      <div aria-hidden inert className={`invisible ${className}`}>
        <div className="w-full">{children}</div>
      </div>
      {/* The padded area would otherwise swallow taps on content scrolled beneath it. */}
      <div
        ref={fixedRef}
        className={`pointer-events-none fixed inset-x-0 top-0 z-10 ${className}`}
        style={{ opacity }}
      >
        <div ref={contentRef} className={`w-full ${opacity > 0 ? "pointer-events-auto" : ""}`}>
          {children}
        </div>
      </div>
      <div data-content-start="" className="absolute inset-x-0 bottom-0" />
    </div>
  );
}
