import * as React from "react";

/**
 * A row of the `list` layout, with a rule under it: the post's text at the
 * top left and its picture on the right. The picture is shown whole, in its
 * own shape and with no frame (a drawing on white sits on the page as if
 * drawn there), up to 280px wide and 280px tall, and never more than 40% of
 * the row. A row without one is just its text.
 */
export function PostListRow({
  children,
  picture,
  aspect,
}: {
  children: React.ReactNode;
  /** The picture, filling its box (absolutely positioned, `object-contain`). */
  picture?: React.ReactNode;
  /** Its width over its height. */
  aspect: number;
}) {
  return (
    <article className="flex items-start gap-ds-20 border-b border-ds-border pt-ds-20 pb-ds-40">
      <div className="flex min-w-0 flex-1 flex-col gap-ds-8">{children}</div>
      {picture && (
        <div
          className="relative max-w-[40%] shrink-0"
          // As big as fits in a 280px square, in its own shape.
          style={{ aspectRatio: aspect, width: `${Math.min(280, 280 * aspect)}px` }}
        >
          {picture}
        </div>
      )}
    </article>
  );
}
