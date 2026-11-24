"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EyeOff,
  Image,
  Mail,
  Minus,
  MoreVertical,
  Play,
  Plus,
  Quote,
  RotateCcw,
  Slash,
  Trash2,
  Type,
  Upload,
  X,
  Youtube,
} from "lucide-react";
import {
  DsButton,
  DsConfirmDialog,
  DsDivider,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownTrigger,
  DsField,
  DsInput,
  DsPill,
  DsSelect,
  DsSwitch,
  DsTextarea,
  DsTooltip,
  DS_FIELDS_CLASS,
  cn,
  dsToast,
  DsTopBar,
} from "@beltechi/parabola";
import { useEditorSelection } from "@/components/admin/remove-items-dialog";
import { useFocusNewBlock } from "@/components/admin/focus-new-block";
import { ContentBlockEditor, isBlockEmpty } from "@/components/admin/content-block-editor";
import { DocsField } from "@/components/admin/docs/docs-field";
import { describePageDeletion } from "@/components/admin/pages/page-deletion";
import { WireframesField } from "@/components/admin/pages/wireframes-field";
import { MediaDetailModal } from "@/components/admin/media-detail-modal";
import { MediaPicker } from "@/components/admin/media-picker";
import { announceSaved, publishPosts } from "@/components/admin/publish/events";
import { UnsavedChangesModal } from "@/components/admin/unsaved-changes-modal";
import { fetchAll } from "@/lib/api/fetch-all";
import { parseBlocks } from "@/lib/agent/markdown";
import {
  PAGE_FORMATS,
  PAGE_FORMAT_LABELS,
  pagePreset,
  pageSettings,
  type PageFormat,
  type PageLink,
} from "@/lib/cms/page-formats";
import type { Block, Entry, MediaItem } from "@/lib/cms/types";
import { slugify } from "@/lib/slug";

/** A new block of a type, empty. */
function newBlock(type: Block["type"]): Block | null {
  const id = crypto.randomUUID();
  switch (type) {
    case "text":
      return { type: "text", id, html: "" };
    case "gallery":
      return { type: "gallery", id, mediaIds: [], layout: "auto", width: "auto" };
    case "youtube":
      return { type: "youtube", id, url: "", caption: "" };
    case "quote":
      return { type: "quote", id, text: "", attribution: "" };
    case "divider":
      return { type: "divider", id };
    case "newsletter":
      return { type: "newsletter", id, heading: "", text: "", buttonLabel: "" };
    default:
      return null;
  }
}

/** A page's format and place, as the editor holds them (lib/cms/page-formats.ts). */
type FormatFields = {
  format: PageFormat;
  parent: string;
  nav: boolean;
  links: PageLink[];
  postsCategory: string;
  newsletterHeading: string;
  newsletterText: string;
};

const NO_FORMAT: FormatFields = {
  format: "text",
  parent: "",
  nav: false,
  links: [],
  postsCategory: "",
  newsletterHeading: "",
  newsletterText: "",
};

function formatFields(data: Record<string, unknown>): FormatFields {
  const s = pageSettings(data);
  return {
    format: s.format,
    parent: s.parent ?? "",
    nav: s.nav,
    links: s.links,
    postsCategory: s.postsCategory ?? "",
    newsletterHeading: s.newsletter?.heading ?? "",
    newsletterText: s.newsletter?.text ?? "",
  };
}

/** The format fields as page data, with only what the format uses. */
function formatData(f: FormatFields): Record<string, unknown> {
  const newsletter =
    f.format === "home" && (f.newsletterHeading.trim() || f.newsletterText.trim())
      ? { heading: f.newsletterHeading.trim(), text: f.newsletterText.trim() }
      : null;
  return {
    format: f.format,
    parent: f.parent || null,
    nav: !f.parent && f.nav,
    links: f.format === "links" ? f.links.filter((l) => l.label.trim() && l.url.trim()) : [],
    postsCategory: f.format === "home" && f.postsCategory ? f.postsCategory : null,
    newsletter,
  };
}

// The "Under" picker's value for top level: a select item can't have an empty value.
const TOP_LEVEL = "top-level";
// The "Posts from" picker's value for the first category in the nav.
const FIRST_IN_NAV = "first-in-nav";

/** The fields the editor saves, as one comparable snapshot. */
type PageFields = { title: string; slug: string; description: string; docs: string[]; blocks: Block[]; settings: FormatFields };
const snapshot = (f: PageFields) => JSON.stringify(f);

/**
 * A page in the editor, built like the post editor: a floating top bar
 * (close, status, Preview, Save, Publish or Update), the page's details, then
 * its content blocks, which are the post blocks. Saving a published page stores
 * unpublished changes; the site keeps the live version until Update.
 * Pages live at /<slug>.
 */
export function PageEditorForm({ slug, preset: presetId, onClose }: { slug?: string; preset?: string; onClose: () => void }) {
  // A new page started from a preset (admin › Pages › New page): its title,
  // URL, format, place and starting text, to fill in by hand or by agent.
  const preset = slug ? undefined : pagePreset(presetId);
  const router = useRouter();
  const [currentSlug, setCurrentSlug] = useState<string | undefined>(slug);
  const isEditMode = Boolean(currentSlug);

  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [title, setTitle] = useState(preset?.title ?? "");
  const [urlSlug, setUrlSlug] = useState(preset?.slug ?? "");
  // A new page's URL follows its title until it's edited by hand.
  const [slugTouched, setSlugTouched] = useState(Boolean(slug || preset));
  const [description, setDescription] = useState(preset?.description ?? "");
  const [docs, setDocs] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (slug) return [];
    if (preset?.starter) return parseBlocks(preset.starter).map((b) => b.block);
    return [newBlock("text")!];
  });
  const [settings, setSettings] = useState<FormatFields>(() =>
    preset
      ? formatFields({ ...preset, links: preset.links ?? [], newsletter: preset.newsletter })
      : NO_FORMAT
  );
  const patchSettings = (patch: Partial<FormatFields>) => setSettings((prev) => ({ ...prev, ...patch }));

  // The pages it can sit under (top-level ones, not itself) and the categories a home page can list.
  const [parentOptions, setParentOptions] = useState<{ value: string; label: string }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pages, categoriesRes] = await Promise.all([
        fetchAll<Entry>("/api/admin/collections/pages/entries").catch(() => [] as Entry[]),
        fetch("/api/admin/categories").catch(() => null),
      ]);
      const categories = (categoriesRes?.ok ? (await categoriesRes.json()).data : []) as {
        slug: string;
        label: string;
        parentId?: string | null;
      }[];
      if (cancelled) return;
      setParentOptions(
        pages
          .filter((p) => p.slug !== slug && p.slug !== "home" && !pageSettings(p.data).parent)
          .map((p) => ({ value: p.slug, label: (p.data.title as string) || p.slug }))
      );
      setCategoryOptions(categories.filter((c) => !c.parentId).map((c) => ({ value: c.slug, label: c.label })));
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);
  // What was last saved, to tell edits apart (existing pages only).
  const [saved, setSaved] = useState("");

  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());

  const [galleryMedia, setGalleryMedia] = useState<Record<string, MediaItem[]>>({});
  const selection = useEditorSelection({
    collection: "pages",
    slug: currentSlug,
    blocks,
    setBlocks,
    setGalleryMedia,
    selectedBlocks,
    setSelectedBlocks,
    entryMediaIds: [],
  });  const galleryMediaCache = useRef(new Map<string, MediaItem>());
  const [galleryPickerBlockId, setGalleryPickerBlockId] = useState<string | null>(null);
  const [galleryReplaceIndex, setGalleryReplaceIndex] = useState<number | null>(null);
  const [mediaDetailId, setMediaDetailId] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<string | null>(null);

  const [publishDialog, setPublishDialog] = useState(false);
  const [unpublishDialog, setUnpublishDialog] = useState(false);
  const [discardDialog, setDiscardDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteDescription, setDeleteDescription] = useState("");
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const fields: PageFields = { title, slug: urlSlug, description, docs, blocks, settings };
  const isDirty = isEditMode
    ? snapshot(fields) !== saved
    : title.trim() !== "" || description.trim() !== "" || docs.length > 0 || blocks.some((b) => !isBlockEmpty(b));
  const isHome = (currentSlug ?? urlSlug) === "home";

  // Load the page as last saved: its unpublished changes over the live version.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/collections/pages/entries/${slug}`);
        if (!res.ok) {
          router.push("/admin/pages");
          return;
        }
        const loaded = (await res.json()).data as Entry;
        if (cancelled) return;
        const working = { ...loaded.data, ...loaded.pendingData } as Record<string, unknown>;
        const next: PageFields = {
          title: (working.title as string) || "",
          slug: loaded.slug,
          description: (working.description as string) || "",
          docs: (working.docs as string[]) || [],
          blocks: (working.content as Block[]) || [],
          settings: formatFields(working),
        };
        setEntry(loaded);
        setCurrentSlug(loaded.slug);
        setTitle(next.title);
        setUrlSlug(next.slug);
        setDescription(next.description);
        setDocs(next.docs);
        setBlocks(next.blocks);
        setSettings(next.settings);
        setSaved(snapshot(next));

        // Every gallery's images, for the editor's thumbnails.
        const ids = [...new Set(next.blocks.flatMap((b) => (b.type === "gallery" ? b.mediaIds : [])))];
        if (ids.length > 0) {
          const mediaRes = await fetch(`/api/admin/media/bulk?ids=${ids.join(",")}`);
          const byId = new Map(((mediaRes.ok ? (await mediaRes.json()).data : []) as MediaItem[]).map((m) => [m.id, m]));
          const map: Record<string, MediaItem[]> = {};
          for (const b of next.blocks) {
            if (b.type === "gallery") map[b.id] = b.mediaIds.map((id) => byId.get(id)).filter((m): m is MediaItem => Boolean(m));
          }
          if (!cancelled) setGalleryMedia(map);
        }
      } catch (error) {
        console.error("Failed to load page:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, router, reloadKey]);

  // Warn before leaving the browser tab with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  /**
   * Save the page as it's being edited: a new page is created as a draft; a
   * published one stores unpublished changes. Autosave calls it `quiet`.
   * Resolves to the saved page, or null.
   */
  const handleSave = async ({ quiet = false }: { quiet?: boolean } = {}): Promise<Entry | null> => {
    if (!title.trim()) {
      if (!quiet) dsToast("Give the page a title first");
      return null;
    }
    setSaving(true);
    try {
      const nextSlug = slugify(urlSlug || title);
      const data = {
        title,
        description,
        docs,
        content: blocks.filter((b) => !isBlockEmpty(b)),
        ...formatData(settings),
      };
      const res = await fetch(
        currentSlug ? `/api/admin/collections/pages/entries/${currentSlug}` : "/api/admin/collections/pages/entries",
        {
          method: currentSlug ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            currentSlug
              ? { stage: true, data, slug: nextSlug !== currentSlug ? nextSlug : undefined }
              : { status: "draft", slug: nextSlug, data }
          ),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't save the page");

      const savedEntry = json.data as Entry;
      setEntry(savedEntry);
      setSaved(snapshot({ ...fields, slug: savedEntry.slug }));
      setUrlSlug(savedEntry.slug);
      announceSaved();

      // A new page, or a new URL: the admin follows it.
      if (savedEntry.slug !== currentSlug) {
        setCurrentSlug(savedEntry.slug);
        router.replace(`/admin/pages/${savedEntry.slug}`);
      }
      return savedEntry;
    } catch (error) {
      dsToast("Couldn't save the page", { description: error instanceof Error ? error.message : undefined });
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Autosave a moment after you stop editing, once the page exists.
  useEffect(() => {
    if (!entry || !isDirty || saving || publishing || statusChanging) return;
    const timer = setTimeout(() => handleSave({ quiet: true }), 1500);
    return () => clearTimeout(timer);
    // handleSave reads the latest edits; the timer restarts on each of them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, isDirty, saving, publishing, statusChanging, title, urlSlug, description, docs, blocks, settings]);

  const handlePublish = async () => {
    const wasPublished = entry?.status === "published";
    setPublishing(true);
    try {
      const target = isDirty || !entry ? await handleSave({ quiet: true }) : entry;
      if (!target) return;
      const { failed } = await publishPosts([target.slug], "pages");
      if (failed.length > 0) {
        dsToast(wasPublished ? "Couldn't update" : "Couldn't publish", { description: failed[0].error });
        return;
      }
      dsToast(wasPublished ? "Updated" : "Published");
      setReloadKey((k) => k + 1);
    } catch (error) {
      dsToast(wasPublished ? "Couldn't update" : "Couldn't publish", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPublishing(false);
      setPublishDialog(false);
    }
  };

  /** Unpublish or discard: a status change, after saving any edits. */
  const patchStatus = async (body: Record<string, unknown>, done: string, failed: string) => {
    if (!currentSlug) return;
    setStatusChanging(true);
    try {
      if (isDirty && body.pendingData !== null && !(await handleSave({ quiet: true }))) return;
      const res = await fetch(`/api/admin/collections/pages/entries/${currentSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      announceSaved();
      setReloadKey((k) => k + 1);
      if (done) dsToast(done);
    } catch (error) {
      dsToast(failed, { description: error instanceof Error ? error.message : undefined });
    } finally {
      setStatusChanging(false);
      setUnpublishDialog(false);
      setDiscardDialog(false);
    }
  };

  const handleDelete = async () => {
    if (!currentSlug) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/collections/pages/entries/${currentSlug}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      announceSaved();
      onClose();
    } catch {
      dsToast("Couldn't delete the page");
    } finally {
      setDeleting(false);
      setDeleteDialog(false);
    }
  };

  /**
   * Preview is a real link (`target="_blank"`), which every browser opens in a
   * new tab. With edits not yet saved, save first and then open the same kind
   * of link, so the preview shows them.
   */
  const handlePreview = async (event: React.MouseEvent) => {
    if (!currentSlug || !isDirty) return;
    event.preventDefault();
    const saved = await handleSave({ quiet: true });
    if (!saved) return;
    Object.assign(document.createElement("a"), {
      href: `/${saved.slug}/preview`,
      target: "_blank",
      rel: "noopener noreferrer",
    }).click();
  };

  const handleClose = useCallback(() => {
    if (isDirty) setShowUnsavedModal(true);
    else onClose();
  }, [isDirty, onClose]);

  // ---- Blocks (as in the post editor) ----

  const newBlockFocus = useFocusNewBlock();

  const addBlock = (type: Block["type"]) => {
    const block = newBlock(type);
    if (!block) return;
    setBlocks((prev) => [...prev, block]);
    return block.id;
  };

  const updateBlock = (id: string, updates: Partial<Block>) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)) as Block[]);

  const removeBlock = (id: string) => {
    const index = blocks.findIndex((b) => b.id === id);
    const removed = blocks[index];
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (removed) {
      dsToast("Block removed", {
        action: {
          label: "Undo",
          onClick: () =>
            setBlocks((prev) => {
              const next = [...prev];
              next.splice(Math.min(index, next.length), 0, removed);
              return next;
            }),
        },
      });
    }
  };

  const moveBlock = (index: number, direction: "up" | "down") =>
    setBlocks((prev) => {
      const to = direction === "up" ? index - 1 : index + 1;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  const uploadToGallery = async (blockId: string, files: File[]) => {
    const uploaded: MediaItem[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body: form }).catch(() => null);
      if (res?.ok) uploaded.push((await res.json()).data);
    }
    if (uploaded.length === 0) return;
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId && b.type === "gallery" ? { ...b, mediaIds: [...b.mediaIds, ...uploaded.map((m) => m.id)] } : b))
    );
    setGalleryMedia((prev) => ({ ...prev, [blockId]: [...(prev[blockId] || []), ...uploaded] }));
  };

  // "Upload images" / "Add from library": into the gallery that ends the page, or a new one.
  const addImages = (source: "upload" | "library") => {
    const last = blocks[blocks.length - 1];
    const targetId = last?.type === "gallery" ? last.id : addBlock("gallery");
    if (!targetId) return;
    if (source === "library") {
      setGalleryPickerBlockId(targetId);
    } else {
      uploadTargetRef.current = targetId;
      uploadInputRef.current?.click();
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const mediaId = replaceTargetRef.current;
    e.target.value = "";
    replaceTargetRef.current = null;
    if (!file || !mediaId) return;
    setStatusChanging(true);
    try {
      if (isDirty && !(await handleSave({ quiet: true }))) return;
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/admin/media/${mediaId}/replace`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error);
      setReloadKey((k) => k + 1);
      dsToast("File replaced");
    } catch (error) {
      dsToast("Couldn't replace file", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setStatusChanging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-4 p-5">
        <Skeleton className="size-9 rounded-ds-pill" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const status = entry?.status || "draft";
  const published = status === "published";
  const hasChanges = published && (Boolean(entry?.pendingData) || isDirty);
  const liveUrl = isHome ? "/" : `/${urlSlug || slugify(title) || "…"}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Top bar, as in the post editor: floats over the content, which fades
            out beneath it (`ds-nav-fade`); clicks pass through all but its controls. */}
        <div className="sticky top-0 z-20 h-0">
          <DsTopBar surface="blur" className="flex-row top-0 absolute inset-x-0 items-center justify-between gap-2 px-5 pt-5 pb-10">
            <div className="flex min-w-0 items-center gap-3">
              <DsButton iconLeft={X} aria-label="Close" onClick={handleClose} />
              <div className="hidden min-w-0 items-center gap-2 md:flex">
                <h1 className="truncate text-h3 text-ds-fg">{isEditMode ? "Edit page" : "New page"}</h1>
                <DsPill variant={published ? "light" : "dark"}>{published ? "Published" : "Draft"}</DsPill>
                {hasChanges && <DsPill variant="light">Changes</DsPill>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentSlug && (
                <DsTooltip content="Preview">
                  <DsButton
                    iconLeft={Play}
                    aria-label="Preview"
                    href={`/${currentSlug}/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handlePreview}
                  />
                </DsTooltip>
              )}
              <DsButton onClick={() => handleSave()} disabled={saving || !isDirty}>
                {saving ? "Saving…" : isDirty ? "Save" : "Saved"}
              </DsButton>
              <DsButton
                variant="primary"
                loading={publishing}
                disabled={!title.trim() || (published && !hasChanges)}
                onClick={() => (published ? handlePublish() : setPublishDialog(true))}
              >
                {!published ? "Publish" : hasChanges ? "Update" : "Published"}
              </DsButton>
              {(isEditMode || selection.count > 0) && (
                <DsDropdown>
                  <DsDropdownTrigger asChild>
                    <DsButton iconLeft={MoreVertical} aria-label="More actions" />
                  </DsDropdownTrigger>
                  <DsDropdownContent>
                    {published && entry?.pendingData && (
                      <DsDropdownItem iconLeft={RotateCcw} onSelect={() => setDiscardDialog(true)}>
                        Discard changes
                      </DsDropdownItem>
                    )}
                    {published && (
                      <DsDropdownItem iconLeft={EyeOff} onSelect={() => setUnpublishDialog(true)}>
                        Unpublish
                      </DsDropdownItem>
                    )}
                    {isEditMode && (
                      <DsDropdownItem
                        tone="danger"
                        iconLeft={Trash2}
                        onSelect={async () => {
                          if (!currentSlug) return;
                          setDeleteDescription(await describePageDeletion(currentSlug));
                          setDeleteDialog(true);
                        }}
                      >
                        Delete page
                      </DsDropdownItem>
                    )}
                    {selection.count > 0 && (
                      <>
                        <DsDropdownItem tone="danger" iconLeft={Trash2} onSelect={selection.deleteSelected}>
                          Delete {selection.count} {selection.count === 1 ? "item" : "items"}
                        </DsDropdownItem>
                        <DsDropdownItem iconLeft={X} onSelect={selection.deselectAll}>
                          Deselect all
                        </DsDropdownItem>
                      </>
                    )}
                  </DsDropdownContent>
                </DsDropdown>
              )}
            </div>
          </DsTopBar>
        </div>

        {/* Clears the floating bar. */}
        <div aria-hidden className="h-[76px]" />

        <div className={cn("@container px-5 pb-5", DS_FIELDS_CLASS)}>
          <DsField label="Title" required>
            <DsInput
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setUrlSlug(slugify(e.target.value));
              }}
              placeholder="Page title"
            />
          </DsField>

          <DsField label="URL" description={published ? `Live at ${liveUrl}` : `Will live at ${liveUrl}`}>
            <DsInput
              iconLeft={Slash}
              value={urlSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setUrlSlug(slugify(e.target.value));
              }}
              placeholder={slugify(title) || "page-url"}
            />
          </DsField>

          <DsField label="Description" description="For search results and sharing.">
            <DsTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One or two sentences about the page"
            />
          </DsField>

          <DsField label="Format" description={PAGE_FORMAT_LABELS[settings.format].description}>
            <DsSelect
              options={PAGE_FORMATS.map((value) => ({ value, label: PAGE_FORMAT_LABELS[value].label }))}
              value={settings.format}
              onValueChange={(format) => patchSettings({ format: format as PageFormat })}
            />
          </DsField>

          {!isHome && (
            <DsField label="Under" description="A page under another is listed at the end of it, and on a home page under its title.">
              <DsSelect
                // Radix shows a value only if its option was there on mount: remount once the pages arrive.
                key={parentOptions.length}
                options={[{ value: TOP_LEVEL, label: "Top level" }, ...parentOptions]}
                value={settings.parent || TOP_LEVEL}
                onValueChange={(value) => patchSettings({ parent: value === TOP_LEVEL ? "" : value })}
              />
            </DsField>
          )}

          {!isHome && !settings.parent && (
            <div className="flex w-(--ds-field-width) items-center gap-ds-8 self-end py-2">
              <label htmlFor="page-nav" className="text-p text-ds-fg">
                In the site&apos;s nav
              </label>
              <DsSwitch id="page-nav" checked={settings.nav} onCheckedChange={(nav) => patchSettings({ nav })} />
            </div>
          )}

          {settings.format === "home" && (
            <>
              <DsField label="Posts from" description="The category whose latest posts it lists.">
                <DsSelect
                  key={categoryOptions.length}
                  options={[{ value: FIRST_IN_NAV, label: "The first in the nav" }, ...categoryOptions]}
                  value={settings.postsCategory || FIRST_IN_NAV}
                  onValueChange={(value) => patchSettings({ postsCategory: value === FIRST_IN_NAV ? "" : value })}
                />
              </DsField>
              <DsField label="Newsletter" description="At the foot of the page. Empty leaves it out.">
                <DsInput
                  value={settings.newsletterHeading}
                  onChange={(e) => patchSettings({ newsletterHeading: e.target.value })}
                  placeholder="Heading"
                />
              </DsField>
              <DsField label="Newsletter line" description="What people get, and how often.">
                <DsInput
                  value={settings.newsletterText}
                  onChange={(e) => patchSettings({ newsletterText: e.target.value })}
                  placeholder="A few letters a year"
                />
              </DsField>
            </>
          )}

          {settings.format === "links" && (
            <DsField label="Links" description="Each with a short note on the right: a handle, how often." className="w-full">
              <LinksEditor links={settings.links} onChange={(links) => patchSettings({ links })} />
            </DsField>
          )}

          <DsField label="Documents" description="Anything that gives Claude context for this page: notes, copy, a brief, HTML. All of them live in Agent." className="w-full">
            <DocsField value={docs} onChange={setDocs} />
          </DsField>

          <DsField label="Wireframes" description="HTML sketches of this page, before it's built. They go if the page is deleted." className="w-full">
            <WireframesField pageSlug={currentSlug} />
          </DsField>
        </div>

        <DsDivider className="mx-5 w-auto" />

        <div className="px-5">
          <div className="flex items-center justify-between py-5">
            <h2 className="text-h3 text-ds-fg">Content</h2>
            <span className="text-small text-ds-fg-muted">
              {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
            </span>
          </div>

          <div ref={newBlockFocus.listRef} className="flex flex-col gap-8">
            {blocks.map((block, index) => (
              <ContentBlockEditor
                key={block.id}
                block={block}
                index={index}
                total={blocks.length}
                selected={selectedBlocks.has(block.id)}
                onToggleSelect={(checked) =>
                  setSelectedBlocks((prev) => {
                    const next = new Set(prev);
                    if (checked) next.add(block.id);
                    else next.delete(block.id);
                    return next;
                  })
                }
                onUpdate={(updates) => {
                  updateBlock(block.id, updates);
                  // Reorders and removals in a gallery arrive as a new mediaIds
                  // list; rebuild its thumbnails from the images seen so far.
                  if (block.type === "gallery" && "mediaIds" in updates && updates.mediaIds) {
                    const ids = updates.mediaIds as string[];
                    setGalleryMedia((prev) => {
                      (prev[block.id] || []).forEach((m) => galleryMediaCache.current.set(m.id, m));
                      return {
                        ...prev,
                        [block.id]: ids.map((id) => galleryMediaCache.current.get(id)).filter((m): m is MediaItem => Boolean(m)),
                      };
                    });
                  }
                }}
                onRemove={() => removeBlock(block.id)}
                onMove={(dir) => moveBlock(index, dir)}
                onOpenGalleryPicker={() => setGalleryPickerBlockId(block.id)}
                onReplaceGalleryImage={(imageIndex) => {
                  setGalleryPickerBlockId(block.id);
                  setGalleryReplaceIndex(imageIndex);
                }}
                onUploadGalleryFiles={(files) => uploadToGallery(block.id, files)}
                galleryMedia={galleryMedia[block.id] || []}
                onEditMedia={setMediaDetailId}
                selectedImages={selection.imagesFor(block.id)}
                onSelectImages={(next) => selection.setImagesFor(block.id, next)}
                onReplaceFile={(mediaId) => {
                  replaceTargetRef.current = mediaId;
                  replaceInputRef.current?.click();
                }}
              />
            ))}
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              if (files.length > 0 && uploadTargetRef.current) uploadToGallery(uploadTargetRef.current, files);
            }}
          />
          <div className="flex pt-4 pb-8">
            <DsDropdown>
              <DsDropdownTrigger asChild>
                <DsButton iconLeft={Plus} aria-label="Add block" />
              </DsDropdownTrigger>
              <DsDropdownContent align="start" onCloseAutoFocus={newBlockFocus.onCloseAutoFocus}>
                <DsDropdownItem
                  iconLeft={Type}
                  onSelect={() => {
                    newBlockFocus.focusNext();
                    addBlock("text");
                  }}
                >
                  Text
                </DsDropdownItem>
                <DsDropdownItem iconLeft={Upload} onSelect={() => addImages("upload")}>
                  Upload images
                </DsDropdownItem>
                <DsDropdownItem iconLeft={Image} onSelect={() => addImages("library")}>
                  Add from library
                </DsDropdownItem>
                <DsDropdownItem
                  iconLeft={Youtube}
                  onSelect={() => {
                    newBlockFocus.focusNext();
                    addBlock("youtube");
                  }}
                >
                  YouTube
                </DsDropdownItem>
                <DsDropdownItem
                  iconLeft={Quote}
                  onSelect={() => {
                    newBlockFocus.focusNext();
                    addBlock("quote");
                  }}
                >
                  Quote
                </DsDropdownItem>
                <DsDropdownItem iconLeft={Minus} onSelect={() => addBlock("divider")}>
                  Divider
                </DsDropdownItem>
                <DsDropdownItem iconLeft={Mail} onSelect={() => addBlock("newsletter")}>
                  Newsletter
                </DsDropdownItem>
              </DsDropdownContent>
            </DsDropdown>
          </div>
        </div>
      </div>

      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onDiscard={() => {
          setShowUnsavedModal(false);
          onClose();
        }}
        onSave={async () => {
          if (await handleSave()) {
            setShowUnsavedModal(false);
            onClose();
          }
        }}
        onCancel={() => setShowUnsavedModal(false)}
        isSaving={saving}
        isPublished={published}
      />

      <MediaPicker
        isOpen={Boolean(galleryPickerBlockId)}
        onClose={() => {
          setGalleryPickerBlockId(null);
          setGalleryReplaceIndex(null);
        }}
        onSelect={(items) => {
          const block = blocks.find((b) => b.id === galleryPickerBlockId);
          if (block?.type === "gallery" && items.length > 0) {
            if (galleryReplaceIndex !== null) {
              const ids = [...block.mediaIds];
              ids[galleryReplaceIndex] = items[0].id;
              updateBlock(block.id, { mediaIds: ids });
              setGalleryMedia((prev) => {
                const shown = [...(prev[block.id] || [])];
                shown[galleryReplaceIndex] = items[0];
                return { ...prev, [block.id]: shown };
              });
            } else {
              updateBlock(block.id, { mediaIds: [...block.mediaIds, ...items.map((m) => m.id)] });
              setGalleryMedia((prev) => ({ ...prev, [block.id]: [...(prev[block.id] || []), ...items] }));
            }
          }
          setGalleryPickerBlockId(null);
          setGalleryReplaceIndex(null);
        }}
        multiple={galleryReplaceIndex === null}
        kinds={["image"]}
      />

      <input ref={replaceInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleReplaceFile} />
      <MediaDetailModal mediaId={mediaDetailId} onClose={() => setMediaDetailId(null)} showDelete={false} />

      {selection.dialog}
      <DsConfirmDialog
        open={publishDialog}
        onOpenChange={setPublishDialog}
        title="Publish page?"
        description={`It goes live at ${liveUrl}.`}
        confirmLabel="Publish"
        loading={publishing}
        onConfirm={handlePublish}
      />
      <DsConfirmDialog
        open={unpublishDialog}
        onOpenChange={setUnpublishDialog}
        title="Unpublish page?"
        description="This takes the page off your site and keeps it as a draft, with any unpublished changes."
        confirmLabel="Unpublish"
        loading={statusChanging}
        onConfirm={() => patchStatus({ status: "draft" }, "Unpublished", "Couldn't unpublish")}
      />
      <DsConfirmDialog
        open={discardDialog}
        onOpenChange={setDiscardDialog}
        title="Discard changes?"
        description="The page goes back to what's live on your site. Your unpublished changes are lost."
        confirmLabel="Discard changes"
        destructive
        loading={statusChanging}
        onConfirm={() => patchStatus({ pendingData: null }, "", "Couldn't discard changes")}
      />
      <DsConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Delete page?"
        description={deleteDescription}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/** A links page's links: a row of label, URL and note each, added and removed in place. */
function LinksEditor({ links, onChange }: { links: PageLink[]; onChange: (links: PageLink[]) => void }) {
  const update = (index: number, patch: Partial<PageLink>) =>
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  return (
    <div className="flex flex-col gap-2">
      {links.map((link, index) => (
        // One link per line, its parts side by side: a row of a list, not a form.
        <div key={index} className="flex flex-wrap items-center gap-ds-20">
          <DsInput aria-label="Label" value={link.label} onChange={(e) => update(index, { label: e.target.value })} placeholder="YouTube" />
          <DsInput aria-label="URL" value={link.url} onChange={(e) => update(index, { url: e.target.value })} placeholder="https://…" />
          <DsInput aria-label="Note" value={link.note ?? ""} onChange={(e) => update(index, { note: e.target.value })} placeholder="@you" />
          <DsButton iconLeft={X} aria-label="Remove link" variant="text" onClick={() => onChange(links.filter((_, i) => i !== index))} />
        </div>
      ))}
      <div>
        <DsButton iconLeft={Plus} onClick={() => onChange([...links, { label: "", url: "" }])}>
          Link
        </DsButton>
      </div>
    </div>
  );
}

/** A pulsing block standing in for content while the page loads. */
function Skeleton({ className }: { className: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-ds-md bg-ds-surface-subtle", className)} />;
}
