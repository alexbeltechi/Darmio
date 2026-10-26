"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, File, FolderOpen, House, Loader2, MoreVertical, Plus, Trash2 } from "lucide-react";
import {
  DsButton,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownSeparator,
  DsDropdownTrigger,
  DsListRow,
  DsPill,
  DsSearch,
  useDsConfirm,
} from "@beltechi/parabola";
import { AdminMenuButton } from "@/components/admin/layout";
import { useOnSaved } from "@/components/admin/publish/events";
import { describePageDeletion } from "@/components/admin/pages/page-deletion";
import { buildSystemPages, type SystemPage } from "@/lib/cms/system-pages";
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
 */
export function PagesWorkspace({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const open = openFromPath(pathname);
  const isOpen = Boolean(open.custom || open.system);

  const [pages, setPages] = React.useState<Entry[]>([]);
  const [systemPages, setSystemPages] = React.useState<SystemPage[]>([]);
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
        const [pageEntries, categoriesRes] = await Promise.all([
          fetchAll<Entry>("/api/admin/collections/pages/entries"),
          fetch("/api/admin/categories"),
        ]);
        const categoriesData = categoriesRes.ok ? await categoriesRes.json() : { data: [] };
        if (cancelled) return;
        setPages(pageEntries);
        setSystemPages(buildSystemPages(categoriesData.data || []));
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
  const customRows = pages.filter((p) => matches(pageTitle(p), p.slug));
  const systemRows = systemPages.filter((p) => matches(p.title, p.path));
  const total = pages.length + systemPages.length;

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
        <div className="pointer-events-none sticky top-0 z-20 -mx-5 flex flex-col ds-nav-fade px-5 pb-5 [&>*]:pointer-events-auto">
          <div className="flex items-center gap-2 py-5">
            <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">Pages {!loading && `(${total})`}</h1>
            <DsButton href="/admin/pages/new" iconLeft={Plus}>
              Page
            </DsButton>
            <AdminMenuButton />
          </div>
          <DsSearch aria-label="Search pages" value={searchQuery} onValueChange={setSearchQuery} className="w-full" />
        </div>

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
            {customRows.map((entry) => {
              const title = pageTitle(entry);
              const published = entry.status === "published";
              return (
                <li key={entry.id}>
                  <DsListRow
                    href={`/admin/pages/${entry.slug}`}
                    selected={open.custom === entry.slug}
                    thumbnailIcon={File}
                    title={title}
                    pill={!published && <DsPill variant="dark">Draft</DsPill>}
                    meta={`/${entry.slug}`}
                    detail={published ? "Published" : undefined}
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
                          {published && (
                            <>
                              <DsDropdownItem
                                iconLeft={ExternalLink}
                                onSelect={() => window.open(`/${entry.slug}`, "_blank")}
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
            })}

            {systemRows.length > 0 && <GroupLabel>System</GroupLabel>}
            {systemRows.map((page) => (
              <li key={page.slug}>
                <DsListRow
                  href={`/admin/pages/system/${page.slug}`}
                  selected={open.system === page.slug}
                  thumbnailIcon={page.kind === "home" ? House : FolderOpen}
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
                        <DsDropdownItem iconLeft={ExternalLink} onSelect={() => window.open(page.path, "_blank")}>
                          View on site
                        </DsDropdownItem>
                      </DsDropdownContent>
                    </DsDropdown>
                  }
                />
              </li>
            ))}
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
