"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { DsButton } from "@beltechi/parabola";

const SHOW_AFTER_PX = 400;

/** Fixed bottom-right button that appears once the page is scrolled down, and scrolls back to top when clicked. */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40">
      <DsButton
        iconLeft={ChevronUp}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll to top"
      />
    </div>
  );
}
