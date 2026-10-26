"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AdminMobileNav, AdminRail, ADMIN_RAIL_WIDTH } from "@/components/admin/layout";
import { HomeSidebar, HOME_SIDEBAR_WIDTH } from "@/components/admin/home/home-sidebar";
import { isHomePath } from "@/components/admin/home/home-routes";
import { DatabaseErrorHandler } from "@/components/admin/database-error-handler";
import { DsToaster } from "@beltechi/parabola";
import { cn } from "@/lib/utils";

/**
 * An install with no users needs its setup, even when the browser still holds
 * a session (from a database that was reset, or an account since removed):
 * sessions are signed cookies, so the middleware can't tell they're stale.
 */
function useSetupGuard(pathname: string) {
  useEffect(() => {
    if (pathname === "/admin/setup") return;
    fetch("/api/setup")
      .then((res) => res.json())
      .then((json) => json.data?.needed && signOut({ callbackUrl: "/admin/setup" }))
      .catch(() => {});
  }, [pathname]);
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useSetupGuard(pathname);

  // Signing in, setting up and resetting a password stand alone, without the navigation.
  if (pathname === "/admin/login" || pathname === "/admin/setup" || pathname === "/admin/reset") return <>{children}</>;

  // Home's pages (every project, the install's settings) get Home's sidebar; a project's, the rail.
  const home = isHomePath(pathname);
  return (
    <div className={cn("min-h-dvh bg-ds-bg text-ds-fg", home ? HOME_SIDEBAR_WIDTH : ADMIN_RAIL_WIDTH)}>
      {home ? <HomeSidebar /> : <AdminRail />}
      <AdminMobileNav>
        <main className="min-h-dvh">{children}</main>
      </AdminMobileNav>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <DatabaseErrorHandler>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </DatabaseErrorHandler>
      <DsToaster />
    </ThemeProvider>
  );
}
