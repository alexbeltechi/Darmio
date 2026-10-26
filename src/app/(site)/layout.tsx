import { Footer } from "@/components/site/footer";
import { ScrollToTop } from "@/components/site/scroll-to-top";
import { SiteNav } from "@/components/site/site-nav";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getNavCounts } from "@/lib/db/nav-counts";
import { getSiteSettings } from "@/lib/db/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [navCounts, { siteName }] = await Promise.all([getNavCounts(), getSiteSettings()]);

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
        <SiteNav counts={navCounts} siteName={siteName} />

        {/* Full width by default: the homepage and category grids run edge to
            edge. Pages that need a reading measure (article/post detail) apply
            their own `mx-auto max-w-5xl` to the content only, so sticky
            controls like the close button stay at the viewport edge. */}
        <div className="flex w-full flex-1 flex-col">
          <div className="flex-1">{children}</div>
          <Footer siteName={siteName} />
        </div>
        <ScrollToTop />
      </div>
    </ThemeProvider>
  );
}






