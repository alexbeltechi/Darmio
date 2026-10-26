import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DsShell } from "@beltechi/parabola/showcase/ds-shell";

// Hidden: not linked anywhere and kept out of search results.
export const metadata: Metadata = {
  title: { absolute: "Parabola" },
  robots: { index: false, follow: false },
};

// Standalone from the (site) group so the site nav and footer stay out of the way.
export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="site-root min-h-screen bg-ds-bg text-ds-fg">
        <DsShell>{children}</DsShell>
      </div>
    </ThemeProvider>
  );
}
