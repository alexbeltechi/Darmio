"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, File, FolderOpen, GripVertical, House, Loader2, MoreVertical, Plus, Trash2 } from "lucide-react";
import {
  DsButton,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownLabel,
  DsDropdownSeparator,
  DsDropdownTrigger,
  DsListRow,
  DsPill,
  DsSearch,
  useDsConfirm,
  DsTopBar,
  dsToast,
} from "@beltechi/parabola";
import { AdminMenuButton } from "@/components/admin/layout";
import { useOnSaved } from "@/components/admin/publish/events";
import { describePageDeletion } from "@/components/admin/pages/page-deletion";
import { PAGE_FORMAT_LABELS, PAGE_PRESETS, pageSettings } from "@/lib/cms/page-formats";
import { buildSystemPages, type SystemPage } from "@/lib/cms/system-pages";
import { categoryGroups, type CategoryLike } from "@/lib/cms/category-groups";
import { moveItem, orderMenu } from "@/lib/cms/menu-order";
import type { Entry } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { fetchAll } from "@/lib/api/fetch-all";

/** What the URL has open: a custom page (or "new"), a system page, or nothing. */
function openFromPath(pathname: string): { custom: string | null; system: string | null } {
  const system = pathname.match(/^\/admin\/pages\/system\/([^/]+)/)?.[1] ?? null;
  if (system) return { custom: null, system: decodeURIComponent(system) };
  const custom = pathname.match(/^\/admin\/pages\/([^/]+)/)?.[1] ?? null;
  return { custom: custom ? decodeURIComponent(custom) : null, system: null };
}

const pageTitle = (entry: Entry) => (entry.data.title as string) || "Untitled page";

/** A heading over a group of rows (custom, system). */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return <li className="px-4 pt-3 pb-1 text-small text-ds-fg-subtle first:pt-0">{children}</li>;
}

/**
 * The Pages section, laid out like Posts: the list on the left and the open
 * page on the right; below `lg` one pane shows at a time. The open page is
 * the route, rendered as `children` in the right pane: a custom page's editor
 * (`/admin/pages/<slug>`, `/admin/pages/new`) or a system page's pane
 * (`/admin/pages/system/<slug>`).
 *
 * Custom pages are entries made with the page builder. System pages are the
 * site's coded pages (home, one per category; see lib/cms/system-pages.ts),
 * listed so they're all in one place; editing them comes later.
 *
 * Menu, above both, is what the site's menu shows (categories and pages
 * marked for it), in its order: drag a row, or Move up/down in its menu
 * (which works on a phone), and the order is saved to the site's settings
 * (`menuOrder`).
 */
export function PagesWorkspace({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const open = openFromPath(pathname);
  const isOpen = Boolean(open.custom || open.system);

  const [pages, setPages] = React.useState<Entry[]>([]);
  const [systemPages, setSystemPages] = React.useState<SystemPage[]>([]);
  const [categories, setCategories] = React.useState<CategoryLike[]>([]);
  const [menuOrder, setMenuOrder] = React.useState<string[]>([]);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [confirm, confirmDialog] = useDsConfirm();

  // Bumped whenever the editor saves, so titles and statuses stay current.
  const [savedTick, setSavedTick] = React.useState(0);
  useOnSaved(() => setSavedTick((t) => t + 1));

  // Refetched as pages open and close, and after saves, so a page saved in
  // the editor (new, or renamed) shows up in the list.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pageEntries, categoriesRes, settingsRes] = await Promise.all([
          fetchAll<Entry>("/api/admin/collections/pages/entries"),
          fetch("/api/admin/categories"),
          fetch("/api/admin/settings"),
        ]);
        const categoriesData = categoriesRes.ok ? await categoriesRes.json() : { data: [] };
        const settingsData = settingsRes.ok ? await settingsRes.json() : { data: {} };
        if (cancelled) return;
        setPages(pageEntries);
        setCategories(categoriesData.data || []);
        setSystemPages(buildSystemPages(categoriesData.data || []));
        setMenuOrder(settingsData.data?.menuOrder || []);
      } catch (error) {
        console.error("Failed to fetch pages:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, savedTick]);

  const query = searchQuery.trim().toLowerCase();
  const matches = (...texts: string[]) => !query || texts.some((t) => t.toLowerCase().includes(query));
  const pagesBySlug = new Map(pages.map((p) => [p.slug, p]));

  // The menu as the site builds it (app/(site)/layout.tsx): top-level
  // categories marked for it, then published pages marked for it, in the saved order.
  const menu = orderMenu(
    [
      ...categoryGroups(categories)
        .filter((g) => g.nav)
        .map((g) => ({ slug: g.slug, entry: pagesBySlug.get(g.slug), system: systemPages.find((p) => p.slug === g.slug) })),
      ...pages
        .filter((p) => p.status === "published" && pageSettings(p.data).nav)
        .map((p) => ({ slug: p.slug, entry: p, system: undefined })),
    ],
    menuOrder
  );
  const inMenu = new Set(menu.map((m) => m.slug));
  const menuRows = menu.filter((m) => (m.entry ? matches(pageTitle(m.entry), m.slug) : m.system && matches(m.system.title, m.system.path)));
  // Reordering works on the whole menu, so not while a search hides some of it.
  const canReorder = !query && menu.length > 1;

  const customRows = pages.filter((p) => !inMenu.has(p.slug) && matches(pageTitle(p), p.slug));
  // A page at a system page's slug is its editable version and takes its place.
  const systemRows = systemPages.filter((p) => !inMenu.has(p.slug) && matches(p.title, p.path) && !pages.some((e) => e.slug === p.slug));
  const total = pages.length + systemPages.filter((p) => !pages.some((e) => e.slug === p.slug)).length;

  const saveMenuOrder = async (order: string[]) => {
    setMenuOrder(order);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuOrder: order }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
    } catch (error) {
      dsToast("Couldn't save the menu order", { description: error instanceof Error ? error.message : undefined });
    }
  };
  const menuSlugs = menu.map((m) => m.slug);
  const moveInMenu = (from: number, to: number) => saveMenuOrder(moveItem(menuSlugs, from, to));

  // Dragging reorders the list as it goes over rows; letting go saves it, if it moved.
  const orderBeforeDrag = React.useRef<string>("");
  const menuDrag = (index: number) =>
    canReorder
      ? {
          draggable: true,
          onDragStart: (e: React.DragEvent) => {
            e.dataTransfer.effectAllowed = "move";
            orderBeforeDrag.current = menuSlugs.join(" ");
            setDragging(index);
          },
          onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            if (dragging === null || dragging === index) return;
            setMenuOrder(moveItem(menuSlugs, dragging, index));
            setDragging(index);
          },
          onDragEnd: () => {
            setDragging(null);
            if (menuSlugs.join(" ") !== orderBeforeDrag.current) saveMenuOrder(menuSlugs);
          },
          className: cn("cursor-grab active:cursor-grabbing", dragging === index && "opacity-50"),
        }
      : {};
  /** Move up and down in a menu row's actions: the way to reorder without dragging (a phone, the keyboard). */
  const menuMoves = (index?: number) =>
    index !== undefined &&
    canReorder && (
      <>
        <DsDropdownItem iconLeft={ArrowUp} disabled={index === 0} onSelect={() => moveInMenu(index, index - 1)}>
          Move up
        </DsDropdownItem>
        <DsDropdownItem iconLeft={ArrowDown} disabled={index === menu.length - 1} onSelect={() => moveInMenu(index, index + 1)}>
          Move down
        </DsDropdownItem>
        <DsDropdownSeparator />
      </>
    );
  /** In the menu and reorderable, a row shows the grip in its icon's place. */
  const rowIcon = (index: number | undefined, icon: typeof File) => (index !== undefined && canReorder ? GripVertical : icon);

  /** A custom page's row; `menuIndex` when it's in the menu (Move up/down). */
  const customRow = (entry: Entry, menuIndex?: number) => {
    const title = pageTitle(entry);
    const published = entry.status === "published";
    const settings = pageSettings(entry.data);
    const parent = settings.parent ? pagesBySlug.get(settings.parent) : undefined;
    const isHome = entry.slug === "home";
    return (
      <li key={entry.id} {...(menuIndex !== undefined ? menuDrag(menuIndex) : {})}>
        <DsListRow
          href={`/admin/pages/${entry.slug}`}
          selected={open.custom === entry.slug}
          thumbnailIcon={rowIcon(menuIndex, isHome ? House : File)}
          title={title}
          pill={!published && <DsPill variant="dark">Draft</DsPill>}
          meta={isHome ? "/" : `/${entry.slug}`}
          detail={[
            PAGE_FORMAT_LABELS[settings.format].label,
            parent ? `Under ${pageTitle(parent)}` : settings.nav && menuIndex === undefined ? "In the nav" : null,
            published ? "Published" : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          actions={
            <DsDropdown>
              <DsDropdownTrigger asChild>
                <DsButton
                  size="small"
                  variant="text"
                  iconLeft={MoreVertical}
                  aria-label={`Actions for ${title}`}
                  loading={deleting === entry.slug}
                />
              </DsDropdownTrigger>
              <DsDropdownContent>
                {menuMoves(menuIndex)}
                {published && (
                  <>
                    <DsDropdownItem
                      iconLeft={ExternalLink}
                      onSelect={() => window.open(isHome ? "/" : `/${entry.slug}`, "_blank")}
                    >
                      View on site
                    </DsDropdownItem>
                    <DsDropdownSeparator />
                  </>
                )}
                <DsDropdownItem tone="danger" iconLeft={Trash2} onSelect={() => handleDelete(entry)}>
                  Delete
                </DsDropdownItem>
              </DsDropdownContent>
            </DsDropdown>
          }
        />
      </li>
    );
  };

  /** A system page's row; `menuIndex` when it's in the menu (Move up/down). */
  const systemRow = (page: SystemPage, menuIndex?: number) => (
    <li key={page.slug} {...(menuIndex !== undefined ? menuDrag(menuIndex) : {})}>
      <DsListRow
        href={`/admin/pages/system/${page.slug}`}
        selected={open.system === page.slug}
        thumbnailIcon={rowIcon(menuIndex, page.kind === "home" ? House : FolderOpen)}
        title={page.title}
        pill={<DsPill>System</DsPill>}
        meta={page.path}
        detail="Hardcoded"
        actions={
          <DsDropdown>
            <DsDropdownTrigger asChild>
              <DsButton size="small" variant="text" iconLeft={MoreVertical} aria-label={`Actions for ${page.title}`} />
            </DsDropdownTrigger>
            <DsDropdownContent>
              {menuMoves(menuIndex)}
              <DsDropdownItem iconLeft={ExternalLink} onSelect={() => window.open(page.path, "_blank")}>
                View on site
              </DsDropdownItem>
            </DsDropdownContent>
          </DsDropdown>
        }
      />
    </li>
  );

  const handleDelete = async (entry: Entry) => {
    const ok = await confirm({
      title: `Delete ${pageTitle(entry)}?`,
      description: await describePageDeletion(entry.slug),
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;

    setDeleting(entry.slug);
    try {
      const res = await fetch(`/api/admin/collections/pages/entries/${entry.slug}`, { method: "DELETE" });
      if (res.ok) {
        setPages((prev) => prev.filter((p) => p.slug !== entry.slug));
        if (open.custom === entry.slug) router.push("/admin/pages");
      }
    } catch (error) {
      console.error("Failed to delete page:", error);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex lg:h-dvh">
      {/* List pane: full width below lg (hidden while a page is open), 400px beside the page from lg up. */}
      <section
        aria-label="Pages"
        className={cn(
          "flex min-h-dvh w-full flex-col px-5 lg:min-h-0 lg:w-[400px] lg:shrink-0 lg:overflow-y-auto",
          isOpen && "hidden lg:flex"
        )}
      >
        {/* Header and search stay pinned over the list, as in Posts (`ds-nav-fade`). The bar
            bleeds over the pane's side padding (-mx-5/px-5), so the fade spans the full width. */}
        <DsTopBar className="mb-5 -mx-5 px-5 pb-3">
          <div className="flex items-center gap-2 py-3">
            <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">Pages {!loading && `(${total})`}</h1>
            <DsDropdown>
              <DsDropdownTrigger asChild>
                <DsButton iconLeft={Plus}>Page</DsButton>
              </DsDropdownTrigger>
              <DsDropdownContent align="end">
                <DsDropdownItem iconLeft={File} onSelect={() => router.push("/admin/pages/new")}>
                  Blank page
                </DsDropdownItem>
                <DsDropdownSeparator />
                <DsDropdownLabel>Start from</DsDropdownLabel>
                {PAGE_PRESETS.filter((preset) => !pagesBySlug.has(preset.slug)).map((preset) => (
                  <DsDropdownItem
                    key={preset.id}
                    iconLeft={preset.format === "home" ? House : File}
                    onSelect={() => router.push(`/admin/pages/new?preset=${preset.id}`)}
                  >
                    {preset.label}
                  </DsDropdownItem>
                ))}
              </DsDropdownContent>
            </DsDropdown>
            <AdminMenuButton />
          </div>
          <DsSearch aria-label="Search pages" value={searchQuery} onValueChange={setSearchQuery} className="w-full" />
        </DsTopBar>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 aria-label="Loading pages" className="size-6 animate-spin text-ds-fg-subtle" />
          </div>
        ) : customRows.length === 0 && systemRows.length === 0 && open.custom !== "new" ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-p text-ds-fg-muted">No pages match</p>
          </div>
        ) : (
          <ul className="flex flex-col pb-5">
            {menuRows.length > 0 && (
              <>
                <GroupLabel>Menu{canReorder && " · drag to reorder"}</GroupLabel>
                {menuRows.map((row, index) =>
                  row.entry ? customRow(row.entry, index) : row.system ? systemRow(row.system, index) : null
                )}
              </>
            )}
            <GroupLabel>Custom</GroupLabel>
            {/* A new page isn't saved yet: a placeholder row, selected, as in Posts. */}
            {open.custom === "new" && (
              <li>
                <DsListRow
                  selected
                  thumbnailIcon={File}
                  title="New page"
                  pill={<DsPill variant="dark">Draft</DsPill>}
                  meta="Not saved yet"
                />
              </li>
            )}
            {customRows.length === 0 && open.custom !== "new" && (
              <li className="px-4 py-2 text-p text-ds-fg-subtle">
                {query ? "No custom pages match" : "None"}
              </li>
            )}
            {customRows.map((entry) => customRow(entry))}

            {systemRows.length > 0 && <GroupLabel>System</GroupLabel>}
            {systemRows.map((page) => systemRow(page))}
          </ul>
        )}
      </section>

      {/* Page pane: the route's content. Below lg it shows only while a page is open. */}
      <section
        aria-label="Page"
        className={cn(
          "flex h-dvh min-w-0 flex-1 flex-col lg:border-l lg:border-ds-border",
          !isOpen && "hidden lg:flex"
        )}
      >
        {children}
      </section>
      {confirmDialog}
    </div>
  );
}
