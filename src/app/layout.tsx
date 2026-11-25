import type { Metadata } from "next";
import localFont from "next/font/local";
import { DEFAULT_SETTINGS, getSiteSettings } from "@/lib/db/settings";
import "./globals.css";

// Parabola's own fonts, Geist Sans and Geist Serif, hosted with the app by
// next/font from Vercel's `geist` package (no request to Google or a CDN,
// from a visitor's browser or at build). Each sets the `--ds-font-<id>` that
// its stack in Parabola's fonts.ts tries first; a theme picks among them. The
// theme itself is the website's only ((site) layout) and /parabola's canvas:
// the admin always wears Parabola's own, so a theme can't make it unusable.
const geistSans = localFont({
  src: [
    { path: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2", style: "normal" },
    { path: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Italic[wght].woff2", style: "italic" },
  ],
  weight: "400 700",
  variable: "--ds-font-geist",
  display: "swap",
});
const geistSerif = localFont({
  src: [{ path: "../../node_modules/geist/dist/fonts/geist-serif/GeistSerif-Regular.woff2", style: "normal" }],
  weight: "400",
  variable: "--ds-font-geist-serif",
  display: "swap",
});

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
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistSerif.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
