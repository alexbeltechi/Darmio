import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/db/settings";
import "./globals.css";

/** The browser title is the site's name (Settings › Site); pages add their own before it. */
export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteSettings();
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
