import { Footer } from "@/components/site/footer";
import { ScrollToTop } from "@/components/site/scroll-to-top";
import { SiteNav } from "@/components/site/site-nav";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DEFAULT_SETTINGS, getSiteSettings } from "@/lib/db/settings";
import { listCategories } from "@/lib/db/categories";
import { categoryGroups } from "@/lib/cms/category-groups";
import { childPages, listSitePages } from "@/lib/db/site-pages";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [{ siteName }, categories, pages] = await Promise.all([
    // Without its database the page below fails into error.tsx; the frame around it still renders.
    getSiteSettings().catch(() => DEFAULT_SETTINGS),
    listCategories().catch(() => []),
    listSitePages().catch(() => []),
  ]);
  // The nav grows with the site: each top-level category marked for it
  // (decisions, 2026-10-26), then each top-level page marked for it, lit for
  // the pages under it too (decisions, 2026-10-28).
  const sections = [
    ...categoryGroups(categories)
      .filter((g) => g.nav)
      .map(({ slug, label, members }) => ({ slug, label, members })),
    ...pages
      .filter((p) => p.settings.nav)
      .map((p) => ({ slug: p.slug, label: p.title, members: [p.slug, ...childPages(pages, p.slug).map((c) => c.slug)] })),
  ];

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="site-root min-h-screen bg-ds-bg flex flex-col">
        {/* Rendered once here, not per-page, so it never unmounts (and never
            flickers) when navigating between views. */}
        <SiteNav siteName={siteName} sections={sections} />

        {/* Full width by default: the homepage and category grids run edge to
            edge. Pages that need a reading measure (article/post detail) apply
            their own `mx-auto max-w-5xl` to the content only, so sticky
            controls like the close button stay at the viewport edge. */}
        <div className="flex w-full flex-1 flex-col">
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer siteName={siteName} />
        </div>
        <ScrollToTop />
      </div>
    </ThemeProvider>
  );
}






