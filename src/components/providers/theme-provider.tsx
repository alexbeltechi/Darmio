"use client";

/**
 * Theme Provider
 *
 * Wraps the application with next-themes for dark/light mode support, and
 * hooks Parabola into Next: its links use next/link (client-side navigation,
 * prefetching) and its theme toggle saves the choice through next-themes.
 */

import * as React from "react";
import Link from "next/link";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { DsProvider } from "@beltechi/parabola";

function ParabolaNextProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();
  return (
    <DsProvider link={Link} onThemeChange={setTheme}>
      {children}
    </DsProvider>
  );
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ParabolaNextProvider>{children}</ParabolaNextProvider>
    </NextThemesProvider>
  );
}
