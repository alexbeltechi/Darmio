"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Check, ExternalLink, LogOut, UserRound } from "lucide-react";
import {
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownLabel,
  DsDropdownSeparator,
  DsDropdownTrigger,
} from "@beltechi/parabola";

/**
 * The project menu behind the admin's mark (decisions, 2026-10-24), the way
 * Figma's logo opens one: the project you're in, then the site, your account
 * and sign out. One project until the hub arrives (roadmap, pre-release step
 * 5); "Add project" comes with it rather than as a dead control now.
 *
 * `children` is the trigger: the rail passes the initial, the mobile menu the
 * name.
 */
export function ProjectMenu({
  siteName,
  align = "start",
  children,
}: {
  siteName: string | null;
  align?: "start" | "center" | "end";
  children: React.ReactElement;
}) {
  const router = useRouter();

  return (
    <DsDropdown modal={false}>
      <DsDropdownTrigger asChild>{children}</DsDropdownTrigger>
      <DsDropdownContent align={align} sideOffset={8} className="min-w-56">
        <DsDropdownLabel>Project</DsDropdownLabel>
        <DsDropdownItem trailing={<Check aria-hidden />} onSelect={() => router.push("/admin")}>
          {siteName ?? "…"}
        </DsDropdownItem>
        <DsDropdownSeparator />
        <DsDropdownItem iconLeft={ExternalLink} onSelect={() => router.push("/")}>
          View site
        </DsDropdownItem>
        <DsDropdownItem iconLeft={UserRound} onSelect={() => router.push("/admin/settings#account")}>
          Account
        </DsDropdownItem>
        <DsDropdownSeparator />
        <DsDropdownItem iconLeft={LogOut} onSelect={() => signOut({ callbackUrl: "/admin/login" })}>
          Sign out
        </DsDropdownItem>
      </DsDropdownContent>
    </DsDropdown>
  );
}
