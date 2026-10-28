"use client";

/**
 * Theme Provider
 *
 * Wraps the application with next-themes for dark/light mode support, and
 * hooks Parabola into Next: its links use next/link (client-side navigation,
 * prefetching) and its theme toggle saves the choice through next-themes.
 * Given the project's Parabola themes (`themeLibrary`), /parabola can
 * publish them to Settings and reload the page in the one in use.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { DsProvider, type DsThemeLibrary } from "@beltechi/parabola";

function ParabolaNextProvider({
  themeLibrary,
  children,
}: {
  themeLibrary?: DsThemeLibrary;
  children: React.ReactNode;
}) {
  const { setTheme } = useTheme();
  const router = useRouter();
  const publishThemes = React.useCallback(
    async (themes: DsThemeLibrary) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themes }),
      });
      if (res.status === 401 || res.status === 403) throw new Error("Sign in to the admin to save it");
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
      onThemeLibraryChange={themeLibrary ? publishThemes : undefined}
    >
      {children}
    </DsProvider>
  );
}

export function ThemeProvider({
  themeLibrary,
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider> & { themeLibrary?: DsThemeLibrary }) {
  return (
    <NextThemesProvider {...props}>
      <ParabolaNextProvider themeLibrary={themeLibrary}>{children}</ParabolaNextProvider>
    </NextThemesProvider>
  );
}
