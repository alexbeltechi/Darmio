"use client";

/**
 * Theme Provider
 *
 * Wraps the application with next-themes for dark/light mode support, and
 * hooks Parabola into Next: its links use next/link (client-side navigation,
 * prefetching) and its theme toggle saves the choice through next-themes.
 * Given the project's Parabola theme (`themeConfig`), Parabola's Theme page
 * can save a new one to Settings and reload the page in it.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { DsProvider, type DsThemeConfig } from "@beltechi/parabola";

function ParabolaNextProvider({
  themeConfig,
  children,
}: {
  themeConfig?: DsThemeConfig;
  children: React.ReactNode;
}) {
  const { setTheme } = useTheme();
  const router = useRouter();
  const saveThemeConfig = React.useCallback(
    async (theme: DsThemeConfig) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
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
      themeConfig={themeConfig}
      onThemeConfigChange={themeConfig ? saveThemeConfig : undefined}
    >
      {children}
    </DsProvider>
  );
}

export function ThemeProvider({
  themeConfig,
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider> & { themeConfig?: DsThemeConfig }) {
  return (
    <NextThemesProvider {...props}>
      <ParabolaNextProvider themeConfig={themeConfig}>{children}</ParabolaNextProvider>
    </NextThemesProvider>
  );
}
