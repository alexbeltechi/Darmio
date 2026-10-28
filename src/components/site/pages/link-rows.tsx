import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type LinkRow = {
  label: string;
  href: string;
  /** On the right, muted: a year and read time, a handle, a date. */
  meta?: string;
};

const isExternal = (href: string) => /^(https?:)?\/\//.test(href) || href.startsWith("mailto:");

/**
 * A list of links, one a row: the label underlined on the left, its meta
 * muted on the right (nicksaraev.com's lists). The rows of a home page's
 * sections, a links page and the Writing list. Links off the site open in a
 * new tab and carry a small ↗.
 *
 * A Parabola candidate (`DsLinkList`): kept with the site's pages until Alex
 * designs it (decisions, 2026-10-28).
 */
export function LinkRows({ rows, divided = false }: { rows: LinkRow[]; divided?: boolean }) {
  return (
    <ul className={divided ? "flex flex-col divide-y divide-ds-border border-y border-ds-border" : "flex flex-col"}>
      {rows.map((row) => {
        const external = isExternal(row.href);
        const label = (
          <>
            <span className="underline decoration-ds-border underline-offset-4 transition-colors group-hover:decoration-ds-fg">
              {row.label}
            </span>
            {external && <ArrowUpRight aria-hidden className="ml-0.5 inline size-3.5 align-baseline text-ds-fg-subtle" />}
          </>
        );
        return (
          <li key={`${row.href}-${row.label}`} className={divided ? "py-3" : "py-1.5"}>
            {external ? (
              <a href={row.href} target="_blank" rel="noopener noreferrer" className="group flex items-baseline justify-between gap-4">
                <span className="text-p text-ds-fg">{label}</span>
                {row.meta && <span className="shrink-0 text-small text-ds-fg-subtle tabular-nums">{row.meta}</span>}
              </a>
            ) : (
              <Link href={row.href} className="group flex items-baseline justify-between gap-4">
                <span className="text-p text-ds-fg">{label}</span>
                {row.meta && <span className="shrink-0 text-small text-ds-fg-subtle tabular-nums">{row.meta}</span>}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** A section of a page: its heading (a link when it has a page of its own), then what's in it. */
export function PageSection({
  title,
  href,
  id,
  children,
}: {
  title: string;
  href?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-ds-16">
      <h2 className="text-h3 text-ds-fg">
        {href ? (
          <Link href={href} className="hover:underline hover:underline-offset-4">
            {title}
          </Link>
        ) : (
          title
        )}
      </h2>
      {children}
    </section>
  );
}

/** The column every formatted page reads in, with the room the fixed nav needs above it. */
export function PageColumn({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex w-full flex-1 flex-col px-5 pt-24 pb-ds-80 sm:pt-36">
      <div data-content-start="" className="mx-auto flex w-full max-w-[661px] flex-col gap-ds-40">
        {children}
      </div>
    </main>
  );
}
