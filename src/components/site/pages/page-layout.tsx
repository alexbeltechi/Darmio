import Link from "next/link";

/**
 * The frame every formatted page shares: one reading column under the fixed
 * nav, and sections in it, each a heading (a link when it has a page of its
 * own) over what's in it. Site-only layout, so it lives with the pages, not
 * in Parabola.
 */

/** A section of a page: its heading in H2, then what's in it. */
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
      <h2 className="text-h2 text-ds-fg">
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
