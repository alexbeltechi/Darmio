import * as React from "react";

/**
 * A row of the `list` layout: the post's text, and its picture on the right,
 * centred on each other, with room above and below for the rule between
 * rows. The picture keeps its own shape at one height (56px), so every row
 * is as tall as the next whether or not it has one; a very wide picture is
 * cropped at a third of the row.
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
  return (
    <article className="flex min-h-[96px] items-center gap-ds-20 py-ds-20">
      <div className="flex min-w-0 flex-1 flex-col gap-ds-4">{children}</div>
      {picture && (
        <div className="relative h-14 max-w-[33%] shrink-0 overflow-hidden" style={{ aspectRatio: aspect }}>
          {picture}
        </div>
      )}
    </article>
  );
}
