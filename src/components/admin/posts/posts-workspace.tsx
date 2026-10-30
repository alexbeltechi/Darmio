"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Film,
  Loader2,
  MoreVertical,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Pencil,
} from "lucide-react";
import { DsEmptyState,
  DsButton,
  DsCheckbox,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownRadioGroup,
  DsDropdownRadioItem,
  DsDropdownLabel,
  DsDropdownSeparator,
  DsDropdownTrigger,
  DsListRow,
  DsPill,
  DsSearch,
  DsTooltip,
  dsToast,
  useDsConfirm,
  DsTopBar,
} from "@beltechi/parabola";
import { AdminMenuButton } from "@/components/admin/layout";
import { publishPosts, useOnPublished, useOnSaved } from "@/components/admin/publish/events";
import { PostBulkEditModal, type PostBulkUpdates } from "./post-bulk-edit-modal";
import { usePostDelete } from "./post-delete-dialog";
import { getPreviewCandidateIds, getPreviewText } from "@/components/site/post-grid-shared";
import type { Entry, MediaItem } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { thumbnailUrl } from "@/lib/cms/media-url";
import { fetchAll } from "@/lib/api/fetch-all";

const ITEMS_PER_PAGE = 40;
const LIST_HREF = "/admin/posts";

type StatusFilter = "all" | "draft" | "published" | "archived";
type SourceFilter = "all" | "web" | "agent";
type SortOption = "edited" | "date-newest" | "date-oldest" | "created-newest" | "created-oldest" | "name-asc" | "name-desc";

// "Date" is the post's own date (the one shown on each row, backdated for
// archive work); "Created" is when it was added to the CMS.
const SORT_LABELS: Record<SortOption, string> = {
  edited: "Last edited",
  "date-newest": "Date, newest first",
  "date-oldest": "Date, oldest first",
  "created-newest": "Created, newest first",
  "created-oldest": "Created, oldest first",
  "name-asc": "Name (A-Z)",
  "name-desc": "Name (Z-A)",
};

type PostsWorkspaceContext = {
  /** Re-fetch the list, e.g. after the editor saves or deletes. */
  refresh: () => void;
  /** Create an empty draft and open it. */
  createPost: () => void;
  /** Leave the open post for the list (or the empty pane beside it). */
  closePost: () => void;
};

const Ctx = React.createContext<PostsWorkspaceContext | null>(null);

export function usePostsWorkspace() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("usePostsWorkspace must be used inside PostsWorkspace");
  return ctx;
}

/** The slug open in the editor pane, "new" for a new post, or null. */
function openSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/admin\/posts\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const postTitle = (entry: Entry) => (entry.data.title as string)?.trim() || "Untitled";

// New posts are created as drafts the moment you press +, so they can sit
// selected in the list. One that's left untouched is deleted when you leave
// it. The slugs are kept in sessionStorage because leaving through the
// unsaved-changes prompt reloads the page.
const EMPTY_DRAFTS_KEY = "admin:empty-drafts";

const readEmptyDrafts = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(EMPTY_DRAFTS_KEY) || "[]");
  } catch {
    return [];
  }
};
const writeEmptyDrafts = (slugs: string[]) => {
  try {
    sessionStorage.setItem(EMPTY_DRAFTS_KEY, JSON.stringify(slugs));
  } catch {
    /* storage unavailable: worst case an empty draft stays in the list */
  }
};

/** A draft with nothing in it: no title, content, categories, tags or preview. */
function isEmptyDraft(entry: Entry): boolean {
  const d = entry.data as Record<string, unknown>;
  const blank = (v: unknown) => (Array.isArray(v) ? v.length === 0 : !v || (typeof v === "string" && !v.trim()));
  return entry.status === "draft" && blank(d.title) && blank(d.content) && blank(d.categories) && blank(d.tags) && blank(d.previewImage);
}

/** "Dec 2, 2026 at 16:02", or just the date for a date-only value. */
function formatPostDate(entry: Entry): string | null {
  const value = (entry.data.date as string) || entry.publishedAt || entry.createdAt;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(/^\d{4}-\d{2}-\d{2}$/.test(value) && { timeZone: "UTC" }),
  });
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return day;
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day} at ${time}`;
}

function agentName(agent?: string) {
  if (!agent) return "Agent";
  return agent.charAt(0).toUpperCase() + agent.slice(1);
}

/** Status and provenance pills beside a post's title. */
function PostPills({ entry }: { entry: Entry }) {
  return (
    <>
      {entry.source?.origin === "agent" && <DsPill variant="highlight">{agentName(entry.source.agent)}</DsPill>}
      {entry.status === "draft" && <DsPill variant="dark">Draft</DsPill>}
      {entry.status === "published" && entry.pendingData && <DsPill variant="light">Changes</DsPill>}
      {entry.status === "archived" && <DsPill variant="light">Archived</DsPill>}
    </>
  );
}

/**
 * The Posts section, laid
 * out like Claude desktop: the list on the left and the open post on the
 * right. It lives in the content layout, so it stays mounted (scroll, search
 * and selection kept) while you move between posts; the open post is the
 * route (`/admin/posts/<slug>`), rendered as `children` in the right
 * pane. Below `lg` one pane shows at a time: the list, or the post.
 */
export function PostsWorkspace({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const openSlug = openSlugFromPath(pathname);

  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [mediaMap, setMediaMap] = React.useState<Record<string, MediaItem>>({});
  const [loading, setLoading] = React.useState(true);

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>("all");
  const [sortBy, setSortBy] = React.useState<SortOption>("edited");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [showBulkEdit, setShowBulkEdit] = React.useState(false);

  const fetchEntries = React.useCallback(async () => {
    try {
      const posts = await fetchAll<Entry>("/api/admin/collections/posts/entries");
      // The list shows each post as you're editing it: unpublished changes over the live version.
      setEntries(posts.map((e) => (e.pendingData ? { ...e, data: { ...e.data, ...e.pendingData } } : e)));
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    }
  }, []);

  // The open post saved (its title or "Changes" pill may differ) or posts
  // were published (statuses and slugs change): show the list as it is now.
  useOnSaved(() => {
    fetchEntries();
  });
  useOnPublished(() => {
    fetchEntries();
  });

  // Media only feeds the thumbnails, so it loads once alongside the first list.
  React.useEffect(() => {
    Promise.all([
      fetchEntries(),
      fetchAll<MediaItem>("/api/admin/media")
        .then((items) => {
          const map: Record<string, MediaItem> = {};
          items.forEach((item) => {
            map[item.id] = item;
          });
          setMediaMap(map);
        })
        .catch((error) => console.error("Failed to fetch media:", error)),
    ]).finally(() => setLoading(false));
  }, [fetchEntries]);

  const filteredEntries = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const ms = (value: unknown) => new Date((value as string) || 0).getTime() || 0;
    const edited = (e: Entry) => ms(e.updatedAt || e.createdAt);
    const postDate = (e: Entry) => ms(e.data.date || e.publishedAt || e.createdAt);
    const created = (e: Entry) => ms(e.createdAt);
    return entries
      .filter((entry) => {
        if (statusFilter !== "all" && entry.status !== statusFilter) return false;
        if (sourceFilter === "agent" && entry.source?.origin !== "agent") return false;
        if (sourceFilter === "web" && entry.source?.origin === "agent") return false;
        if (query) {
          const title = postTitle(entry).toLowerCase();
          if (!title.includes(query) && !getPreviewText(entry).toLowerCase().includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "edited":
            return edited(b) - edited(a);
          case "date-newest":
            return postDate(b) - postDate(a);
          case "date-oldest":
            return postDate(a) - postDate(b);
          case "created-newest":
            return created(b) - created(a);
          case "created-oldest":
            return created(a) - created(b);
          case "name-asc":
            return postTitle(a).localeCompare(postTitle(b));
          case "name-desc":
            return postTitle(b).localeCompare(postTitle(a));
        }
      });
  }, [entries, statusFilter, sourceFilter, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pageEntries = filteredEntries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const thumbnailFor = (entry: Entry): { url: string | null; isVideo: boolean } => {
    const id = getPreviewCandidateIds(entry).find((candidate) => mediaMap[candidate]);
    const item = id ? mediaMap[id] : undefined;
    if (!item) return { url: null, isVideo: false };
    if (item.mime.startsWith("video/")) return { url: item.poster?.url ?? null, isVideo: true };
    return { url: thumbnailUrl(item), isVideo: false };
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedOnPage = pageEntries.filter((e) => selectedIds.has(e.id)).length;
  const allOnPageSelected = pageEntries.length > 0 && selectedOnPage === pageEntries.length;

  const hasActiveFilters = statusFilter !== "all" || sourceFilter !== "all" || sortBy !== "edited";

  const resetFilters = () => {
    setStatusFilter("all");
    setSourceFilter("all");
    setSortBy("edited");
    setCurrentPage(1);
  };

  const goToPage = (next: number) => {
    setCurrentPage(next);
    setSelectedIds(new Set());
  };

  const closePost = React.useCallback(() => router.push(LIST_HREF), [router]);

  const [confirm, confirmDialog] = useDsConfirm();
  const [deletePosts, deleteDialog] = usePostDelete();
  const [creating, setCreating] = React.useState(false);
  const createPost = React.useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/collections/posts/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "draft",
          data: { title: "", content: [], categories: [], tags: "", date: new Date().toISOString() },
        }),
      });
      if (!res.ok) throw new Error("Couldn't create post");
      const slug: string = (await res.json()).data.slug;
      writeEmptyDrafts([...readEmptyDrafts(), slug]);
      await fetchEntries();
      router.push(`/admin/posts/${slug}`);
    } catch (error) {
      console.error("Failed to create post:", error);
      dsToast.error("Couldn't create post");
    } finally {
      setCreating(false);
    }
  }, [fetchEntries, router]);

  // Delete drafts made with + that you've left without writing anything.
  React.useEffect(() => {
    const stale = readEmptyDrafts().filter((slug) => slug !== openSlug);
    if (stale.length === 0) return;
    writeEmptyDrafts(readEmptyDrafts().filter((slug) => slug === openSlug));
    (async () => {
      let removed = false;
      for (const slug of stale) {
        try {
          const res = await fetch(`/api/admin/collections/posts/entries/${slug}`);
          if (!res.ok) continue; // already gone, or renamed by a save
          const entry: Entry = (await res.json()).data;
          if (isEmptyDraft(entry)) {
            await fetch(`/api/admin/collections/posts/entries/${slug}`, { method: "DELETE" });
            removed = true;
          }
        } catch {
          /* leave it; it'll be checked again next time */
        }
      }
      if (removed) fetchEntries();
    })();
  }, [openSlug, fetchEntries]);

  const patchStatus = (entry: Entry, status: Entry["status"]) =>
    fetch(`/api/admin/collections/${entry.collection}/entries/${entry.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

  /** Publish through the same path as the Publish button: pending changes go live with it. */
  const publishSlugs = async (slugs: string[]) => {
    const { failed } = await publishPosts(slugs);
    if (failed.length > 0) throw new Error(failed.map((f) => f.error).join("; "));
  };

  const handleToggleStatus = async (entry: Entry) => {
    const newStatus = entry.status === "published" ? "draft" : "published";
    const action = entry.status === "published" ? "unpublish" : "publish";
    const ok = await confirm({
      title: `${action === "publish" ? "Publish" : "Unpublish"} post?`,
      description: `"${postTitle(entry)}" will ${action === "publish" ? "go live on your site" : "come off the public site and stay as a draft"}.`,
      confirmLabel: action === "publish" ? "Publish" : "Unpublish",
    });
    if (!ok) return;

    setActionLoading(entry.id);
    try {
      if (newStatus === "published") {
        await publishSlugs([entry.slug]);
      } else {
        const res = await patchStatus(entry, newStatus);
        if (!res.ok) throw new Error("Couldn't update status");
        await fetchEntries();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      dsToast.error("Couldn't update status", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (entry: Entry) => {
    if (!(await deletePosts([entry]))) return;
    removeEntries([entry]);
  };

  const removeEntries = (gone: Entry[]) => {
    const ids = new Set(gone.map((e) => e.id));
    setEntries((prev) => prev.filter((e) => !ids.has(e.id)));
    setSelectedIds((prev) => new Set([...prev].filter((id) => !ids.has(id))));
    if (gone.some((e) => e.slug === openSlug)) closePost();
  };

  const handleDuplicate = async (entry: Entry) => {
    setActionLoading(entry.id);
    try {
      const res = await fetch(`/api/admin/collections/${entry.collection}/entries/${entry.slug}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      await fetchEntries();
      dsToast.success("Post duplicated");
    } catch (error) {
      console.error("Failed to duplicate:", error);
      dsToast.error("Couldn't duplicate post");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: "publish" | "unpublish" | "delete" | "duplicate") => {
    const selected = entries.filter((e) => selectedIds.has(e.id));
    if (selected.length === 0) return;
    if (action === "delete") {
      if (await deletePosts(selected)) removeEntries(selected);
      return;
    }
    const label = { publish: "Publish", unpublish: "Unpublish", duplicate: "Duplicate" }[action];
    const noun = `${selected.length} ${selected.length === 1 ? "post" : "posts"}`;
    const ok = await confirm({
      title: `${label} ${noun}?`,
      description: {
        publish: "They'll go live on your site.",
        unpublish: "They'll come off the public site and stay as drafts.",
        duplicate: "Each gets a copy, saved as a draft.",
      }[action],
      confirmLabel: label,
    });
    if (!ok) return;

    setActionLoading("bulk");
    try {
      if (action === "publish") {
        await publishSlugs(selected.map((e) => e.slug));
      } else if (action === "unpublish") {
        await Promise.all(selected.map((entry) => patchStatus(entry, "draft")));
        await fetchEntries();
      } else {
        for (const entry of selected) {
          await fetch(`/api/admin/collections/${entry.collection}/entries/${entry.slug}/duplicate`, { method: "POST" });
        }
        await fetchEntries();
      }
      setSelectedIds(new Set());
      const done = { publish: "Published", unpublish: "Unpublished", duplicate: "Duplicated" }[action];
      dsToast.success(`${done} ${selected.length} posts`);
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      dsToast.error(`Couldn't ${action} some posts`, { description: error instanceof Error ? error.message : undefined });
    } finally {
      setActionLoading(null);
    }
  };

  const selectedEntries = React.useMemo(() => entries.filter((e) => selectedIds.has(e.id)), [entries, selectedIds]);

  const handleBulkEdit = async (updates: PostBulkUpdates) => {
    const results = await Promise.all(
      selectedEntries.map(async (entry) => {
        const res = await fetch(`/api/admin/collections/${entry.collection}/entries/${entry.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          // Staged: on published posts the edits wait for Publish, like the editor's.
          body: JSON.stringify({ data: updates, stage: true }),
        });
        return res.ok ? ((await res.json()).data as Entry) : null;
      })
    );
    const updated = new Map(results.filter((e): e is Entry => e !== null).map((e) => [e.id, e]));
    await fetchEntries();
    const failed = selectedEntries.length - updated.size;
    if (failed > 0) dsToast.error(`Couldn't update ${failed} ${failed === 1 ? "post" : "posts"}`);
    else dsToast.success(`Updated ${updated.size} ${updated.size === 1 ? "post" : "posts"}`);
  };

  const contextValue = React.useMemo(() => ({ refresh: fetchEntries, createPost, closePost }), [fetchEntries, createPost, closePost]);
  const selectedCount = selectedIds.size;

  return (
    <Ctx.Provider value={contextValue}>
      <div className="flex lg:h-dvh">
        {/* List pane: full width below lg (hidden while a post is open), 360px beside the post from lg up. */}
        <section
          aria-label="Posts"
          className={cn(
            "flex min-h-dvh w-full flex-col px-5 lg:min-h-0 lg:w-[400px] lg:shrink-0 lg:overflow-y-auto",
            openSlug && "hidden lg:flex"
          )}
        >
          {/* Header and search stay pinned over the list, which fades out beneath
              the Parabola nav fade (`ds-nav-fade`); clicks pass through the gradient's
              empty space to the rows under it. The bar ends
              20px under the search and the list starts right below it, so no row
              sits under the fade until it scrolls there. The bar bleeds over the
              pane's side padding (-mx-5/px-5), so the fade spans the full width. */}
          <DsTopBar className="mb-5 -mx-5 px-5 pb-3">
            <div className="flex items-center gap-2 py-3">
              <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">
                Posts {!loading && `(${filteredEntries.length})`}
              </h1>
              <DsButton iconLeft={Plus} loading={creating} onClick={createPost}>
                Post
              </DsButton>
              <AdminMenuButton />
            </div>

            {/* Search with the secondary actions beside it, as in Media and Categories */}
            <div className="flex items-center gap-2">
              <DsSearch
                aria-label="Search posts"
                value={searchQuery}
                onValueChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                className="min-w-0 flex-1"
              />
              <DsDropdown>
                <DsTooltip content="Filter and sort">
                  <DsDropdownTrigger asChild>
                    <DsButton iconLeft={SlidersHorizontal} aria-label="Filter and sort" pressed={hasActiveFilters} />
                  </DsDropdownTrigger>
                </DsTooltip>
                <DsDropdownContent className="w-56">
                  <DsDropdownLabel>Status</DsDropdownLabel>
                  <DsDropdownRadioGroup
                    value={statusFilter}
                    onValueChange={(v) => {
                      setStatusFilter(v as StatusFilter);
                      setCurrentPage(1);
                    }}
                  >
                    <DsDropdownRadioItem value="all">All statuses</DsDropdownRadioItem>
                    <DsDropdownRadioItem value="published">Published</DsDropdownRadioItem>
                    <DsDropdownRadioItem value="draft">Draft</DsDropdownRadioItem>
                    <DsDropdownRadioItem value="archived">Archived</DsDropdownRadioItem>
                  </DsDropdownRadioGroup>
                  <DsDropdownSeparator />
                  <DsDropdownLabel>Sort by</DsDropdownLabel>
                  <DsDropdownRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                      <DsDropdownRadioItem key={option} value={option}>
                        {SORT_LABELS[option]}
                      </DsDropdownRadioItem>
                    ))}
                  </DsDropdownRadioGroup>
                  <DsDropdownSeparator />
                  <DsDropdownLabel>Source</DsDropdownLabel>
                  <DsDropdownRadioGroup
                    value={sourceFilter}
                    onValueChange={(v) => {
                      setSourceFilter(v as SourceFilter);
                      setCurrentPage(1);
                    }}
                  >
                    <DsDropdownRadioItem value="all">All sources</DsDropdownRadioItem>
                    <DsDropdownRadioItem value="web">Web</DsDropdownRadioItem>
                    <DsDropdownRadioItem value="agent">Agent</DsDropdownRadioItem>
                  </DsDropdownRadioGroup>
                  {hasActiveFilters && (
                    <>
                      <DsDropdownSeparator />
                      <DsDropdownItem tone="subtle" iconLeft={RotateCcw} onSelect={resetFilters}>
                        Reset filters
                      </DsDropdownItem>
                    </>
                  )}
                </DsDropdownContent>
              </DsDropdown>

              <DsDropdown>
                <DsTooltip content={selectedCount ? `${selectedCount} selected` : "Select posts"}>
                  <DsDropdownTrigger asChild>
                    <DsButton iconLeft={MoreVertical} aria-label="Bulk actions" loading={actionLoading === "bulk"} />
                  </DsDropdownTrigger>
                </DsTooltip>
                <DsDropdownContent>
                  {!allOnPageSelected && (
                    <DsDropdownItem
                      disabled={pageEntries.length === 0}
                      onSelect={() => setSelectedIds(new Set(pageEntries.map((e) => e.id)))}
                    >
                      Select all
                    </DsDropdownItem>
                  )}
                  {selectedCount > 0 && (
                    <>
                      <DsDropdownItem onSelect={() => setSelectedIds(new Set())}>Deselect all</DsDropdownItem>
                      <DsDropdownSeparator />
                      <DsDropdownItem iconLeft={Pencil} meta={selectedCount} onSelect={() => setShowBulkEdit(true)}>
                        Edit
                      </DsDropdownItem>
                      <DsDropdownItem iconLeft={Eye} meta={selectedCount} onSelect={() => handleBulkAction("publish")}>
                        Publish
                      </DsDropdownItem>
                      <DsDropdownItem iconLeft={EyeOff} meta={selectedCount} onSelect={() => handleBulkAction("unpublish")}>
                        Unpublish
                      </DsDropdownItem>
                      <DsDropdownItem iconLeft={Copy} meta={selectedCount} onSelect={() => handleBulkAction("duplicate")}>
                        Duplicate
                      </DsDropdownItem>
                      <DsDropdownSeparator />
                      <DsDropdownItem
                        tone="danger"
                        iconLeft={Trash2}
                        meta={selectedCount}
                        onSelect={() => handleBulkAction("delete")}
                      >
                        Delete
                      </DsDropdownItem>
                    </>
                  )}
                </DsDropdownContent>
              </DsDropdown>

            </div>
          </DsTopBar>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 aria-label="Loading posts" className="size-6 animate-spin text-ds-fg-subtle" />
            </div>
          ) : pageEntries.length === 0 && openSlug !== "new" ? (
            <DsEmptyState
              action={
                !searchQuery &&
                !hasActiveFilters && (
                  <DsButton iconLeft={Plus} loading={creating} onClick={createPost}>
                    New post
                  </DsButton>
                )
              }
            >
              {searchQuery || hasActiveFilters ? "No posts match" : "No posts yet"}
            </DsEmptyState>
          ) : (
            <ul className="flex flex-col pb-5">
              {/* A new post isn't in the database until it's saved, so it shows
                  here as a placeholder row, selected; closing it unsaved leaves
                  nothing behind to clean up. */}
              {openSlug === "new" && (
                <li>
                  <DsListRow
                    selected
                    thumbnailIcon={FileText}
                    title="New post"
                    pill={<DsPill variant="dark">Draft</DsPill>}
                    meta="Not saved yet"
                  />
                </li>
              )}
              {pageEntries.map((entry) => {
                const thumb = thumbnailFor(entry);
                const title = postTitle(entry);
                return (
                  <li key={entry.id}>
                    <DsListRow
                      href={`/admin/posts/${entry.slug}`}
                      selected={openSlug === entry.slug}
                      leading={
                        <DsCheckbox
                          checked={selectedIds.has(entry.id)}
                          onCheckedChange={() => toggleSelect(entry.id)}
                          aria-label={`Select ${title}`}
                        />
                      }
                      thumbnail={thumb.url}
                      thumbnailIcon={thumb.isVideo ? Film : FileText}
                      title={title}
                      pill={<PostPills entry={entry} />}
                      meta={formatPostDate(entry)}
                      detail={entry.status === "published" ? "Published" : undefined}
                      actions={
                        <DsDropdown>
                          <DsDropdownTrigger asChild>
                            <DsButton
                              size="small"
                              variant="text"
                            iconLeft={MoreVertical}
                              aria-label={`Actions for ${title}`}
                              loading={actionLoading === entry.id}
                            />
                          </DsDropdownTrigger>
                          <DsDropdownContent>
                            <DsDropdownItem iconLeft={Copy} onSelect={() => handleDuplicate(entry)}>
                              Duplicate
                            </DsDropdownItem>
                            <DsDropdownItem
                              iconLeft={entry.status === "published" ? EyeOff : Eye}
                              onSelect={() => handleToggleStatus(entry)}
                            >
                              {entry.status === "published" ? "Unpublish" : "Publish"}
                            </DsDropdownItem>
                            <DsDropdownSeparator />
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
            </ul>
          )}

          {!loading && totalPages > 1 && (
            <div className="mt-auto flex items-center justify-between py-5">
              <DsButton variant="text" iconLeft={ChevronLeft} onClick={() => goToPage(page - 1)} disabled={page === 1}>
                Previous
              </DsButton>
              <span className="text-small text-ds-fg-subtle">
                Page {page} of {totalPages}
              </span>
              <DsButton
                variant="text"
                iconRight={ChevronRight}
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </DsButton>
            </div>
          )}
        </section>

        {/* Post pane: the route's content. Below lg it shows only while a post is open. */}
        <section
          aria-label="Post"
          className={cn(
            "flex h-dvh min-w-0 flex-1 flex-col lg:border-l lg:border-ds-border",
            !openSlug && "hidden lg:flex"
          )}
        >
          {children}
        </section>
      </div>
      {confirmDialog}
      {deleteDialog}
      <PostBulkEditModal
        open={showBulkEdit}
        onOpenChange={setShowBulkEdit}
        selectedEntries={selectedEntries}
        onSave={handleBulkEdit}
      />
    </Ctx.Provider>
  );
}
