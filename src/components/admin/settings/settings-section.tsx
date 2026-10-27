import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One block on the settings page, on a `ds-surface-subtle` panel (decisions,
 * 2026-10-27): the H3 title, then one short muted line saying what it is or
 * runs on ("MongoDB Atlas", "Not published"), then, apart from that, the
 * `note` in the same muted text for the longer explanation, then its content.
 * A card with nothing below its title has no body, so its padding stays even.
 * Settings-only layout, so it lives here rather than in Parabola.
 */
export function SettingsSection({
  id,
  title,
  description,
  note,
  className,
  children,
}: {
  /** An anchor, e.g. "site" for /admin/settings#site. */
  id?: string;
  title: React.ReactNode;
  /** One short line under the title: what it is, or what it runs on. */
  description?: React.ReactNode;
  /** The longer explanation, first in the body. */
  note?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-5 flex-col gap-5 rounded-ds-lg bg-ds-surface-subtle p-5 text-ds-fg">
      <div className="flex flex-col gap-2">
        <h2 className="text-h3">{title}</h2>
        {description && <p className="text-p text-ds-fg-muted">{description}</p>}
      </div>
      {(note || children) && (
        <div className={cn("flex flex-col gap-5", className)}>
          {note && <p className="text-p text-ds-fg-muted">{note}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

/** A link out of the admin inside a card's text: in the text's own colour, underlined, with a small ↗. */
export function SettingsLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-0.5 underline underline-offset-4 hover:text-ds-fg"
    >
      {children}
      <ArrowUpRight aria-hidden className="size-3.5 shrink-0 self-center" />
    </a>
  );
}
