"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AdminMobileNav, AdminRail, ADMIN_RAIL_WIDTH } from "@/components/admin/layout";
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

  // The login and setup pages stand alone, without the navigation.
  if (pathname === "/admin/login" || pathname === "/admin/setup") return <>{children}</>;

  return (
    <div className={cn("min-h-dvh bg-ds-bg text-ds-fg", ADMIN_RAIL_WIDTH)}>
      <AdminRail />
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
