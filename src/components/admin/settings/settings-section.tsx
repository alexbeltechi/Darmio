import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * One block on the settings page: H3 title, muted description, then its
 * content, on a `ds-surface-subtle` panel. Settings-only layout, so it lives
 * here rather than in Parabola.
 */
export function SettingsSection({
  id,
  title,
  description,
  className,
  children,
}: {
  /** An anchor, e.g. "site" for /admin/settings#site. */
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-5 flex-col gap-5 rounded-ds-lg bg-ds-surface-subtle p-5 text-ds-fg">
      <div className="flex flex-col gap-2">
        <h2 className="text-h3">{title}</h2>
        {description && <p className="text-p text-ds-fg-muted">{description}</p>}
      </div>
      <div className={cn("flex flex-col gap-5", className)}>{children}</div>
    </section>
  );
}
