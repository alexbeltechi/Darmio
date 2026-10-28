"use client";

/**
 * Theme Provider
 *
 * Wraps the application with next-themes for dark/light mode support, and
 * hooks Parabola into Next: its links use next/link (client-side navigation,
 * prefetching) and its theme toggle saves the choice through next-themes.
 * Given the project's Parabola themes (`themeLibrary`, `publishedTheme`),
 * /parabola can save them to Settings, publish one to the website, and
 * reload the page.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { DsProvider, type DsThemeEntry, type DsThemeLibrary } from "@beltechi/parabola";

function ParabolaNextProvider({
  themeLibrary,
  publishedTheme,
  children,
}: {
  themeLibrary?: DsThemeLibrary;
  publishedTheme?: DsThemeEntry;
  children: React.ReactNode;
}) {
  const { setTheme } = useTheme();
  const router = useRouter();
  const publishThemes = React.useCallback(
    async (themes: DsThemeLibrary, publish?: DsThemeEntry) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(publish ? { themes, publishedTheme: publish } : { themes }),
      });
      if (res.status === 401 || res.status === 403) {
        // Saving goes through the admin; /parabola opens without it. The error carries the way in (a new tab, so
        // the changes here wait), which /parabola's toast offers.
        const href = `/admin/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        throw Object.assign(new Error("Sign in to the admin in the new tab, then try again here."), {
          action: { label: "Sign in", onClick: () => window.open(href, "_blank") },
        });
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "The settings didn't save");
      router.refresh();
    },
    [router]
  );
  return (
    <DsProvider
      link={Link}
      onThemeChange={setTheme}
      themeLibrary={themeLibrary}
      publishedTheme={publishedTheme}
      onThemeLibraryChange={themeLibrary ? publishThemes : undefined}
    >
      {children}
    </DsProvider>
  );
}

export function ThemeProvider({
  themeLibrary,
  publishedTheme,
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider> & { themeLibrary?: DsThemeLibrary; publishedTheme?: DsThemeEntry }) {
  return (
    <NextThemesProvider {...props}>
      <ParabolaNextProvider themeLibrary={themeLibrary} publishedTheme={publishedTheme}>
        {children}
      </ParabolaNextProvider>
    </NextThemesProvider>
  );
}
