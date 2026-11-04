"use client";

import * as React from "react";

/** The most of a row the picture takes. */
const MAX_SHARE = 0.4;
/** The tallest a picture gets, in px. */
const MAX_HEIGHT = 150;

/**
 * A row of the `list` layout: the post's picture on the left and its text,
 * centred on each other. The picture keeps its own shape and is at least as
 * tall as the text beside it (measured, since the text wraps to more or fewer
 * lines on different screens), so a landscape picture grows wider to match
 * it. A portrait one is already taller than the text at the base width
 * (`--list-picture`), so it keeps that width and the text centres on it.
 * It's never taller than 150px (a tall portrait narrows to fit), and never
 * takes more than 40% of the row: a narrow screen makes the text
 * taller, and growing the picture to match would squeeze the text further,
 * so there a landscape picture can stay shorter than its text. Until the
 * text is measured, the picture sits at the base width.
 */
export function PostListRow({
  children,
  picture,
  aspect,
}: {
  children: React.ReactNode;
  /** The picture, filling its box (absolutely positioned, `object-cover`). */
  picture?: React.ReactNode;
  /** Its width over its height. */
  aspect: number;
}) {
  const rowRef = React.useRef<HTMLElement>(null);
  const textRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState<{ text: number; row: number } | null>(null);

  React.useEffect(() => {
    const row = rowRef.current;
    const text = textRef.current;
    if (!row || !text || !picture) return;
    const measure = () => setSize({ text: text.getBoundingClientRect().height, row: row.getBoundingClientRect().width });
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(text);
    return () => observer.disconnect();
  }, [picture]);

  // As tall as the text (at least the base width's height), as wide as its shape makes that, up to the caps.
  const height = size
    ? `min(max(${size.text}px, calc(var(--list-picture) / ${aspect})), ${MAX_HEIGHT}px, ${(size.row * MAX_SHARE) / aspect}px)`
    : `min(calc(var(--list-picture) / ${aspect}), ${MAX_HEIGHT}px)`;

  return (
    <article ref={rowRef} className="flex items-center gap-ds-20">
      {picture && (
        <div
          className="relative shrink-0 overflow-hidden [--list-picture:6rem] sm:[--list-picture:9rem]"
          style={{ aspectRatio: aspect, height }}
        >
          {picture}
        </div>
      )}
      <div ref={textRef} className="flex min-w-0 flex-1 flex-col gap-ds-8">
        {children}
      </div>
    </article>
  );
}
