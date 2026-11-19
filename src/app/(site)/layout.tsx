import { DS_FONTS, DsThemeStyle } from "@beltechi/parabola";
import { Footer } from "@/components/site/footer";
import { ScrollToTop } from "@/components/site/scroll-to-top";
import { SiteNav } from "@/components/site/site-nav";
import { orderMenu } from "@/lib/cms/menu-order";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DEFAULT_SETTINGS, getSiteSettings, sitePublishedTheme } from "@/lib/db/settings";
import { listCategories } from "@/lib/db/categories";
import { categoryGroups } from "@/lib/cms/category-groups";
import { childPages, listSitePages } from "@/lib/db/site-pages";
import { InstallProblemNotice } from "@/components/admin/install-problem";
import { installProblem } from "@/lib/cms/install-problems";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // No database yet (a fresh install, or a deployment before one is connected):
  // nothing on the site can load, and only the owner is here, so say what's
  // missing straight away, the same screen the sign-in and setup pages show.
  if (!process.env.MONGODB_URI) {
    return <InstallProblemNotice problem={installProblem("DB_NOT_CONFIGURED")!} />;
  }

  const [settings, categories, pages] = await Promise.all([
    // Without its database the page below fails into error.tsx; the frame around it still renders.
    getSiteSettings().catch(() => DEFAULT_SETTINGS),
    listCategories().catch(() => []),
    listSitePages().catch(() => []),
  ]);
  const { siteName } = settings;
  // The nav grows with the site: each top-level category marked for it,
  // then each page marked for it, lit for the pages under it too, in the
  // order set in admin › Pages.
  const sections = orderMenu([
    ...categoryGroups(categories)
      .filter((g) => g.nav)
      .map(({ slug, label, members }) => ({ slug, label, members })),
    ...pages
      .filter((p) => p.settings.nav)
      .map((p) => ({ slug: p.slug, label: p.title, members: [p.slug, ...childPages(pages, p.slug).map((c) => c.slug)] })),
  ], settings.menuOrder);

  const { theme } = sitePublishedTheme(settings);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {/* The project's Parabola theme (Settings › Design), the website's alone. Parabola's
          own fonts are hosted (root layout); a font the theme added loads from Google. */}
      <DsThemeStyle theme={theme} hosted={DS_FONTS.map((f) => f.id)} />
      <div className="site-root min-h-screen bg-ds-bg flex flex-col">
        {/* Rendered once here, not per-page, so it never unmounts (and never
            flickers) when navigating between views. */}
        <SiteNav siteName={siteName} sections={sections} surface={theme.nav.surface} />

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






