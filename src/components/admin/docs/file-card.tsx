import * as React from "react";
import { cn } from "@beltechi/parabola";

/**
 * A file attached to a page or post (a document, a wireframe): its name, then
 * the date and size, on a light card that steps up to the field shade on hover. The whole card
 * opens the file; the options menu sits over it. Lay cards out in
 * DS_COLUMNS_CLASS (inside an `@container`), as the preview image is.
 */
export function FileCard({
  name,
  meta,
  onOpen,
  actions,
}: {
  name: string;
  meta: string;
  onOpen: () => void;
  actions: React.ReactNode;
}) {
  return (
    <div
      data-slot="file-card"
      className={cn("group relative flex min-w-0 items-center gap-2 rounded-ds-lg bg-ds-surface-subtle p-4 transition-colors hover:bg-ds-field")}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left ds-focus after:absolute after:inset-0 after:rounded-ds-lg after:content-['']"
      >
        <span className="block truncate text-p text-ds-fg">{name}</span>
        <span className="block truncate text-small text-ds-fg-subtle">{meta}</span>
      </button>
      <div className="relative z-10 shrink-0">{actions}</div>
    </div>
  );
}
