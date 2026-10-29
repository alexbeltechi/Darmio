import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { DEFAULT_SETTINGS, getSiteSettings } from "@/lib/db/settings";
import "./globals.css";

// Parabola's Google fonts, hosted with the app by next/font (no request to
// Google from a visitor's browser). Each sets the `--ds-font-<id>` that its
// stack in Parabola's fonts.ts tries first; a theme picks among them. The
// theme itself is the website's only ((site) layout) and /parabola's canvas:
// the admin always wears Parabola's own, so a theme can't make it unusable.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--ds-font-instrument-sans",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--ds-font-instrument-serif",
  display: "swap",
  // Only for a theme that pairs it; not worth fetching on every first visit.
  preload: false,
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
    <html lang="en" suppressHydrationWarning className={`${instrumentSans.variable} ${instrumentSerif.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
