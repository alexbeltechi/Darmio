"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AdminMobileNav, AdminRail, ADMIN_RAIL_WIDTH } from "@/components/admin/layout";
import { DatabaseErrorHandler } from "@/components/admin/database-error-handler";
import { DsToaster } from "@beltechi/parabola";
import { cn } from "@/lib/utils";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The login page stands alone, without the navigation.
  if (pathname === "/admin/login") return <>{children}</>;

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
