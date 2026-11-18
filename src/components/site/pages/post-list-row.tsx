import * as React from "react";

/**
 * A row of the `list` layout, with a rule under it: the post's text at the
 * top left and its picture on the right. The picture is shown whole, in its
 * own shape and with no frame (a drawing on white sits on the page as if
 * drawn there), 112px tall and never more than 40% of the row. A row without
 * one is just its text.
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
    <article className="flex items-start gap-ds-20 border-b border-ds-border py-ds-20">
      <div className="flex min-w-0 flex-1 flex-col gap-ds-8">{children}</div>
      {picture && (
        <div className="relative h-28 max-w-[40%] shrink-0" style={{ aspectRatio: aspect }}>
          {picture}
        </div>
      )}
    </article>
  );
}
