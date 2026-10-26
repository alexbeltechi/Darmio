import type { Metadata } from "next";
import { DEFAULT_SETTINGS, getSiteSettings } from "@/lib/db/settings";
import "./globals.css";

/** The browser title is the site's name (Settings › Site); pages add their own before it. */
export async function generateMetadata(): Promise<Metadata> {
  // An install without its database still has to render, so its pages can say what's wrong.
  const siteName = await getSiteSettings().then((s) => s.siteName, () => DEFAULT_SETTINGS.siteName);
  return {
    title: { default: siteName, template: `%s — ${siteName}` },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
