import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DsShell } from "@beltechi/parabola/showcase/ds-shell";
import { DEFAULT_SETTINGS, getSiteSettings } from "@/lib/db/settings";

// Hidden: not linked anywhere and kept out of search results.
export const metadata: Metadata = {
  title: { absolute: "Parabola" },
  robots: { index: false, follow: false },
};

// Standalone from the (site) group so the site nav and footer stay out of the way.
// The project's Parabola themes go to /parabola, which can publish them.
export default async function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  const { themes } = await getSiteSettings().catch(() => DEFAULT_SETTINGS);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange themeLibrary={themes}>
      <div className="site-root min-h-screen bg-ds-bg text-ds-fg">
        <DsShell>{children}</DsShell>
      </div>
    </ThemeProvider>
  );
}
