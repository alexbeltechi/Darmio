import { File, FileText, Library, Settings, Tag, type LucideIcon } from "lucide-react";

export type AdminNavKey = "posts" | "pages" | "categories" | "library" | "settings";

export type AdminNavItem = {
  key: AdminNavKey;
  href: string;
  label: string;
  icon: LucideIcon;
};

/** The admin sections, in rail and menu order. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { key: "posts", href: "/admin/posts", label: "Posts", icon: FileText },
  { key: "pages", href: "/admin/pages", label: "Pages", icon: File },
  { key: "categories", href: "/admin/categories", label: "Categories", icon: Tag },
  // Images, video and documents (agent-made ones included): decisions, 2026-10-24.
  { key: "library", href: "/admin/library", label: "Library", icon: Library },
  { key: "settings", href: "/admin/settings", label: "Settings", icon: Settings },
];

/** The section a path belongs to, including anything nested under it. */
export function activeNavItem(pathname: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
