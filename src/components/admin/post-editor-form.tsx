"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  EyeOff,
  RotateCcw,
  Trash2,
  Type,
  Image,
  Youtube,
  Quote,
  Minus,
  Upload,
  MoreVertical,
  Replace,
  Play,
} from "lucide-react";

import { CategoryInput } from "@/components/admin/category-input";
import { DocsField } from "@/components/admin/docs/docs-field";
import {
  DsButton,
  DsConfirmDialog,
  DsDatePicker,
  DsDivider,
  DsTextarea,
  dsToast,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownTrigger,
  DsField,
  DsInput,
  DsListRow,
  DsPill,
  DsTooltip,
  DS_COLUMNS_CLASS,
  DS_FIELDS_CLASS,
  cn,
  DsTopBar,
} from "@beltechi/parabola";
import { UnsavedChangesModal } from "@/components/admin/unsaved-changes-modal";
import { announceSaved, publishPosts, useOnPublished } from "@/components/admin/publish/events";
import { MediaPicker } from "@/components/admin/media-picker";
import { MediaDetailModal } from "@/components/admin/media-detail-modal";
import { useEditorSelection } from "@/components/admin/remove-items-dialog";
import { ContentBlockEditor, isBlockEmpty } from "@/components/admin/content-block-editor";
import { CrosspostFields, SourceFields, runSyndication, useIntegrations } from "@/components/admin/post-crosspost";
import type { Block, Entry, MediaItem } from "@/lib/cms/types";
import { PLATFORMS, type Crosspost, type Syndication } from "@/lib/integrations/types";
import { thumbnailUrl } from "@/lib/cms/media-url";
import { usePostDelete } from "@/components/admin/posts/post-delete-dialog";

/** Every new post starts with an empty gallery and an empty text block. */
function starterBlocks(mediaIds: string[] = []): Block[] {
  return [
    { type: "gallery", id: crypto.randomUUID(), mediaIds, layout: "auto", width: "auto" },
    { type: "text", id: crypto.randomUUID(), html: "" },
  ];
}

interface PostEditorFormProps {
  slug?: string; // If provided, edit mode. If not, create mode.
  onClose?: () => void; // For sheet/modal usage
  onSaved?: (entry: Entry) => void; // Callback after successful save
  isSheet?: boolean; // Whether rendered in a sheet
  preSelectedMediaIds?: string[]; // New post from media library: pre-fills the starting gallery
}

export function PostEditorForm({
  slug,
  onClose,
  onSaved,
  isSheet = false,
  preSelectedMediaIds,
}: PostEditorFormProps) {
  const router = useRouter();
  const [currentSlug, setCurrentSlug] = useState<string | undefined>(slug);
  const isEditMode = !!slug || !!currentSlug;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [entry, setEntry] = useState<Entry | null>(null);

  const [title, setTitle] = useState("");
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<MediaItem | null>(null);
  const [showPreviewImagePicker, setShowPreviewImagePicker] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [docs, setDocs] = useState<string[]>([]);
  const [publishDate, setPublishDate] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [crosspost, setCrosspost] = useState<Crosspost>({});
  // Written by the server only (cross-post results); never sent on save.
  const [syndication, setSyndication] = useState<Syndication>({});
  const [retryingSyndication, setRetryingSyndication] = useState(false);
  const { connections, sourceLabels } = useIntegrations();
  const [starter] = useState(() => (slug ? null : starterBlocks(preSelectedMediaIds)));
  const [blocks, setBlocks] = useState<Block[]>(starter ?? []);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);
  // Gallery images seen so far by id, so removing one can be undone.
  const galleryMediaCache = useRef(new Map<string, MediaItem>());
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const [deletePosts, deleteDialog] = usePostDelete();
  const [unpublishDialog, setUnpublishDialog] = useState(false);
  const [discardDialog, setDiscardDialog] = useState(false);
  const [publishDialog, setPublishDialog] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  // Bumped to reload the post from the server (after a publish, discard or unpublish).
  const [reloadKey, setReloadKey] = useState(0);
  const [galleryPickerBlockId, setGalleryPickerBlockId] = useState<
    string | null
  >(null);
  const [galleryMedia, setGalleryMedia] = useState<
    Record<string, MediaItem[]>
  >({});
  const [galleryReplaceIndex, setGalleryReplaceIndex] = useState<number | null>(
    null
  );
  const [mediaDetailId, setMediaDetailId] = useState<string | null>(null);

  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
  const selection = useEditorSelection({
    collection: "posts",
    slug: currentSlug,
    blocks,
    setBlocks,
    setGalleryMedia,
    selectedBlocks,
    setSelectedBlocks,
    entryMediaIds: [previewImageId],
  });


  // Track initial values for dirty state
  const [initialTitle, setInitialTitle] = useState("");
  const [initialPreviewImageId, setInitialPreviewImageId] = useState<string | null>(
    null
  );
  const [initialCategories, setInitialCategories] = useState<string[]>([]);
  const [initialTags, setInitialTags] = useState("");
  const [initialDescription, setInitialDescription] = useState("");
  const [initialDocs, setInitialDocs] = useState("[]");
  const [initialPublishDate, setInitialPublishDate] = useState<string | null>(
    null
  );
  const [initialBlocks, setInitialBlocks] = useState<string>("");
  const [initialSourceLabel, setInitialSourceLabel] = useState("");
  const [initialSourceUrl, setInitialSourceUrl] = useState("");
  const [initialCrosspost, setInitialCrosspost] = useState("{}");

  const isDirty = isEditMode
    ? title !== initialTitle ||
      previewImageId !== initialPreviewImageId ||
      // Order counts (it's draggable), and never sort `categories` itself:
      // it's state, and sorting in place undid every reorder.
      JSON.stringify(categories) !== JSON.stringify(initialCategories) ||
      tags !== initialTags ||
      description !== initialDescription ||
      JSON.stringify(docs) !== initialDocs ||
      publishDate !== initialPublishDate ||
      JSON.stringify(blocks) !== initialBlocks ||
      sourceLabel !== initialSourceLabel ||
      sourceUrl !== initialSourceUrl ||
      JSON.stringify(crosspost) !== initialCrosspost
    : title.trim() !== "" ||
      previewImageId !== null ||
      categories.length > 0 ||
      tags.trim() !== "" ||
      description.trim() !== "" ||
      docs.length > 0 ||
      publishDate !== null ||
      sourceLabel !== "" ||
      PLATFORMS.some((p) => crosspost[p]) ||
      blocks.some((b) => !isBlockEmpty(b));

  const [allowNavigation, setAllowNavigation] = useState(false);

  // Warn before leaving page with unsaved changes (only when not in sheet mode)
  useEffect(() => {
    if (isSheet || !isDirty || allowNavigation) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link && link.href && link.href.startsWith(window.location.origin)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setPendingNavUrl(link.href);
        setShowUnsavedModal(true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isDirty, allowNavigation, isSheet]);

  const handleDiscardChanges = () => {
    setAllowNavigation(true);
    setShowUnsavedModal(false);
    if (pendingNavUrl) {
      setTimeout(() => {
        window.location.href = pendingNavUrl;
      }, 0);
    }
  };

  const handleSaveAndNavigate = async () => {
    const saved = await handleSave();
    // A failed save keeps the dialog open so the edits aren't lost.
    if (!saved) return;

    setAllowNavigation(true);
    setShowUnsavedModal(false);
    if (pendingNavUrl) {
      // Same hand-off as discarding: leave for the link that was clicked.
      setTimeout(() => {
        window.location.href = pendingNavUrl;
      }, 0);
    } else {
      onClose?.();
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedModal(false);
    setPendingNavUrl(null);
  };

  useEffect(() => {
    if (!isEditMode) return;

    async function fetchEntry() {
      try {
        const res = await fetch(
          `/api/admin/collections/posts/entries/${slug}`
        );
        if (!res.ok) {
          if (!isSheet) {
            router.push("/admin/posts");
          }
          return;
        }
        const data = await res.json();
        const entry = data.data as Entry;
        setEntry(entry);

        // The editor works on the post as last saved: its unpublished
        // changes over the live version.
        const working = { ...entry.data, ...entry.pendingData } as Record<string, unknown>;
        const titleVal = (working.title as string) || "";
        const previewImageIdVal = (working.previewImage as string) || null;
        const catsVal = (working.categories as string[]) || [];
        const rawTags = working.tags;
        const tagsVal = Array.isArray(rawTags)
          ? rawTags.join(", ")
          : (rawTags as string) || "";
        const dateVal = (working.date as string) || null;
        const descriptionVal = (working.description as string) || "";
        const docsVal = (working.docs as string[]) || [];
        const blocksVal = (working.content as Block[]) || [];
        const sourceLabelVal = (working.sourceLabel as string) || "";
        const sourceUrlVal = (working.sourceUrl as string) || "";
        const crosspostVal = (working.crosspost as Crosspost) || {};

        setTitle(titleVal);
        setPreviewImageId(previewImageIdVal);
        setCategories(catsVal);
        setTags(tagsVal);
        setDescription(descriptionVal);
        setDocs(docsVal);
        setPublishDate(dateVal);
        setBlocks(blocksVal);
        setSourceLabel(sourceLabelVal);
        setSourceUrl(sourceUrlVal);
        setCrosspost(crosspostVal);
        setSyndication((working.syndication as Syndication) || {});

        setInitialTitle(titleVal);
        setInitialPreviewImageId(previewImageIdVal);
        setInitialCategories(catsVal);
        setInitialTags(tagsVal);
        setInitialDescription(descriptionVal);
        setInitialDocs(JSON.stringify(docsVal));
        setInitialPublishDate(dateVal);
        setInitialBlocks(JSON.stringify(blocksVal));
        setInitialSourceLabel(sourceLabelVal);
        setInitialSourceUrl(sourceUrlVal);
        setInitialCrosspost(JSON.stringify(crosspostVal));

        if (previewImageIdVal) {
          try {
            const mediaRes = await fetch(
              `/api/admin/media/${previewImageIdVal}`
            );
            if (mediaRes.ok) {
              const mediaData = await mediaRes.json();
              setPreviewImage(mediaData.data);
            }
          } catch (err) {
            console.error("Failed to load preview image:", err);
          }
        }

        const galleryBlocks = blocksVal.filter(
          (b) => b.type === "gallery"
        ) as Array<{ id: string; mediaIds: string[] }>;
        if (galleryBlocks.length > 0) {
          const galleryMediaMap: Record<string, MediaItem[]> = {};

          for (const block of galleryBlocks) {
            if (block.mediaIds && block.mediaIds.length > 0) {
              try {
                const mediaRes = await fetch(
                  `/api/admin/media/bulk?ids=${block.mediaIds.join(",")}`
                );
                if (mediaRes.ok) {
                  const mediaData = await mediaRes.json();
                  const fetchedMedia = mediaData.data || [];

                  const mediaMap = new Map(
                    fetchedMedia.map((m: MediaItem) => [m.id, m])
                  );
                  const orderedMedia = block.mediaIds
                    .map((id) => mediaMap.get(id))
                    .filter((m): m is MediaItem => m !== undefined);

                  galleryMediaMap[block.id] = orderedMedia;
                }
              } catch (err) {
                console.error(
                  `Failed to load media for gallery ${block.id}:`,
                  err
                );
              }
            }
          }

          setGalleryMedia(galleryMediaMap);
        }
      } catch (error) {
        console.error("Failed to fetch entry:", error);
        if (!isSheet) {
          router.push("/admin/posts");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchEntry();
  }, [slug, router, isEditMode, isSheet, reloadKey]);

  // New post started from the media library: load the pre-filled starter
  // gallery's media so its thumbnails show in the editor.
  useEffect(() => {
    const galleryId = starter?.[0].id;
    if (!galleryId || !preSelectedMediaIds?.length) return;

    fetch(`/api/admin/media/bulk?ids=${preSelectedMediaIds.join(",")}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const byId = new Map((data.data as MediaItem[]).map((m) => [m.id, m]));
        const ordered = preSelectedMediaIds
          .map((id) => byId.get(id))
          .filter((m): m is MediaItem => m !== undefined);
        setGalleryMedia((prev) => ({ ...prev, [galleryId]: ordered }));
      })
      .catch((err) => console.error("Failed to load pre-selected media:", err));
  }, [starter, preSelectedMediaIds]);

  const addBlock = (type: Block["type"]): string | undefined => {
    const id = crypto.randomUUID();
    let newBlock: Block;

    switch (type) {
      case "text":
        newBlock = { type: "text", id, html: "" };
        break;
      case "gallery":
        newBlock = {
          type: "gallery",
          id,
          mediaIds: [],
          layout: "auto",
          width: "auto",
        };
        break;
      case "video":
        newBlock = { type: "video", id, mediaId: "", caption: "" };
        break;
      case "youtube":
        newBlock = { type: "youtube", id, url: "", caption: "" };
        break;
      case "quote":
        newBlock = { type: "quote", id, text: "", attribution: "" };
        break;
      case "divider":
        newBlock = { type: "divider", id };
        break;
      default:
        return;
    }

    setBlocks((prevBlocks) => [...prevBlocks, newBlock]);
    return id;
  };

  // Uploads files to the media library and appends them to a gallery block.
  const uploadToGallery = async (blockId: string, files: File[]) => {
    const uploadedMedia: MediaItem[] = [];
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/admin/media", { method: "POST", body: formData });
        if (uploadRes.ok) uploadedMedia.push((await uploadRes.json()).data);
      } catch (err) {
        console.error("Failed to upload file:", err);
      }
    }
    if (uploadedMedia.length === 0) return;

    const newIds = uploadedMedia.map((m) => m.id);
    setBlocks(
      (prev) =>
        prev.map((b) =>
          b.id === blockId && b.type === "gallery" ? { ...b, mediaIds: [...(b.mediaIds || []), ...newIds] } : b
        ) as Block[]
    );
    setGalleryMedia((prev) => ({ ...prev, [blockId]: [...(prev[blockId] || []), ...uploadedMedia] }));
  };

  // "Upload images" / "Add from library" in the + menu: add to the gallery
  // that ends the post, or start a new one.
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

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks((prevBlocks) =>
      prevBlocks.map((b) => (b.id === id ? { ...b, ...updates } : b)) as Block[]
    );
  };

  // Removing is immediate, with an Undo in the toast: a browser confirm()
  // dialog is easy to dismiss by accident and is blocked in some browsers,
  // which made the × look dead.
  const removeBlock = (id: string) => {
    const index = blocks.findIndex((b) => b.id === id);
    const removed = blocks[index];
    setBlocks((prevBlocks) => prevBlocks.filter((b) => b.id !== id));
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
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    setBlocks((prevBlocks) => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prevBlocks.length) return prevBlocks;

      const newBlocks = [...prevBlocks];
      [newBlocks[index], newBlocks[newIndex]] = [
        newBlocks[newIndex],
        newBlocks[index],
      ];
      return newBlocks;
    });
  };

  const toggleBlockSelection = (id: string, checked: boolean) => {
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  /**
   * Save the post as you're editing it. On a published post this stores
   * unpublished changes (the site keeps the live version until Publish); a
   * draft is saved as is. Autosave calls it `quiet`: no navigation, and a
   * failure is a toast rather than an alert. Resolves to the saved post, or
   * null if it couldn't be saved.
   */
  const handleSave = async ({ quiet = false }: { quiet?: boolean } = {}): Promise<Entry | null> => {
    setSaving(true);

    try {
      const effectiveSlug = currentSlug || slug;
      const endpoint = effectiveSlug
        ? `/api/admin/collections/posts/entries/${effectiveSlug}`
        : "/api/admin/collections/posts/entries";

      // A source link only means something with a label.
      const savedSourceUrl = sourceLabel ? sourceUrl.trim() : "";
      const data = {
        title,
        previewImage: previewImageId,
        content: blocks.filter((b) => !isBlockEmpty(b)),
        categories,
        tags: tags || "",
        description,
        docs,
        date: publishDate || initialPublishDate || new Date().toISOString(),
        sourceLabel,
        sourceUrl: savedSourceUrl,
        crosspost,
      };

      const res = await fetch(endpoint, {
        method: effectiveSlug ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        // New posts start as drafts; existing ones are staged (see above).
        body: JSON.stringify(effectiveSlug ? { stage: true, data } : { status: "draft", data }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save post");
      }

      const saved = (await res.json()).data as Entry;

      // What was just sent is now the saved state. Edits made while the
      // request was in flight stay dirty and get the next save.
      setEntry(saved);
      setInitialTitle(title);
      setInitialPreviewImageId(previewImageId);
      setInitialCategories([...categories]);
      setInitialTags(tags);
      setInitialDescription(description);
      setInitialDocs(JSON.stringify(docs));
      setInitialPublishDate(publishDate);
      setInitialBlocks(JSON.stringify(blocks));
      setInitialSourceLabel(sourceLabel);
      setInitialSourceUrl(savedSourceUrl);
      setInitialCrosspost(JSON.stringify(crosspost));
      announceSaved();

      if (saved.slug) setCurrentSlug(saved.slug);
      onSaved?.(saved);

      // A new post gets its own page once it exists.
      if (!isSheet && !effectiveSlug && !quiet) {
        setAllowNavigation(true);
        router.push(`/admin/posts/${saved.slug}`);
      }
      return saved;
    } catch (error) {
      console.error("Save error:", error);
      const message = error instanceof Error ? error.message : "Failed to save post";
      dsToast(quiet ? "Couldn't save changes" : "Couldn't save", { description: message });
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Autosave: a moment after you stop editing. Only for posts that exist
  // (a new one in the media library's sheet is created by its first Save).
  useEffect(() => {
    if (!entry || !isDirty || saving || statusChanging || publishing) return;
    const timer = setTimeout(() => handleSave({ quiet: true }), 1500);
    return () => clearTimeout(timer);
    // handleSave reads the latest edits; the timer restarts on each of them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, isDirty, saving, statusChanging, publishing, title, previewImageId, categories, tags, publishDate, blocks, sourceLabel, sourceUrl, crosspost, docs, description]);

  /**
   * Publish (a draft) or Update (a published post's changes): save the last
   * edits first, then make the post live. One post, this one; several at once
   * is the Posts list's bulk Publish.
   */
  const handlePublish = async () => {
    const wasPublished = entry?.status === "published";
    setPublishing(true);
    try {
      const target = isDirty || !entry ? await handleSave({ quiet: true }) : entry;
      if (!target) return;
      const { failed } = await publishPosts([target.slug]);
      if (failed.length > 0) {
        dsToast(wasPublished ? "Couldn't update" : "Couldn't publish", { description: failed[0].error });
        return;
      }
      dsToast(wasPublished ? "Updated" : "Published");
    } catch (error) {
      dsToast(wasPublished ? "Couldn't update" : "Couldn't publish", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPublishing(false);
      setPublishDialog(false);
    }
  };

  // Replace file: swap an image's file for a new upload, in every post that
  // uses it. The server moves every reference (this post's saved version too),
  // so save first, then reload the post to pick up the new file.
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<string | null>(null);
  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const mediaId = replaceTargetRef.current;
    e.target.value = "";
    replaceTargetRef.current = null;
    if (!file || !mediaId) return;

    setStatusChanging(true);
    try {
      if (isDirty && !(await handleSave({ quiet: true }))) return;
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/admin/media/${mediaId}/replace`, { method: "POST", body });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to replace file");
      announceSaved();
      setReloadKey((k) => k + 1);
      dsToast("File replaced");
    } catch (error) {
      dsToast("Couldn't replace file", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setStatusChanging(false);
    }
  };

  /** Unpublish: off the site, back to a draft, carrying any unpublished changes with it. */
  const handleUnpublish = async () => {
    const effectiveSlug = currentSlug || slug;
    if (!effectiveSlug) return;
    setStatusChanging(true);
    try {
      if (isDirty && !(await handleSave({ quiet: true }))) return;
      const res = await fetch(`/api/admin/collections/posts/entries/${effectiveSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to unpublish");
      announceSaved();
      setReloadKey((k) => k + 1);
      dsToast("Unpublished");
    } catch (error) {
      dsToast("Couldn't unpublish", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setStatusChanging(false);
      setUnpublishDialog(false);
    }
  };

  /** Discard unpublished changes: back to the live version. */
  const handleDiscardPending = async () => {
    const effectiveSlug = currentSlug || slug;
    if (!effectiveSlug) return;
    setStatusChanging(true);
    try {
      const res = await fetch(`/api/admin/collections/posts/entries/${effectiveSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingData: null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to discard changes");
      announceSaved();
      setReloadKey((k) => k + 1);
    } catch (error) {
      dsToast("Couldn't discard changes", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setStatusChanging(false);
      setDiscardDialog(false);
    }
  };

  // After a publish that included this post: reload it (live now, maybe
  // under a new slug), unless there are edits it would overwrite.
  useOnPublished(({ published }) => {
    const effectiveSlug = currentSlug || slug;
    const mine = published.find((p) => p.previousSlug === effectiveSlug);
    if (!mine) return;
    if (mine.slug !== effectiveSlug && !isSheet) {
      setAllowNavigation(true);
      router.replace(`/admin/posts/${mine.slug}`);
      return;
    }
    if (!isDirty) setReloadKey((k) => k + 1);
  });

  /** Take the server's cross-post results, and the source line it may have filled in. */
  const applySyndicated = (updated: Entry) => {
    setEntry(updated);
    setSyndication((updated.data.syndication as Syndication) || {});
    const label = (updated.data.sourceLabel as string) || "";
    const url = (updated.data.sourceUrl as string) || "";
    setSourceLabel(label);
    setSourceUrl(url);
    setInitialSourceLabel(label);
    setInitialSourceUrl(url);
  };

  const retrySyndication = async () => {
    const effectiveSlug = currentSlug || slug;
    if (!effectiveSlug) return;
    setRetryingSyndication(true);
    try {
      const updated = await runSyndication(effectiveSlug);
      if (updated) applySyndicated(updated);
    } finally {
      setRetryingSyndication(false);
    }
  };

  const handleDelete = async () => {
    if (!entry || !(await deletePosts([{ ...entry, slug: currentSlug ?? entry.slug }]))) return;
    onSaved?.(null as unknown as Entry);
    if (isSheet && onClose) {
      onClose();
    } else {
      router.push("/admin/posts");
    }
  };

  const handleClose = useCallback(() => {
    if (isDirty && !allowNavigation) {
      setShowUnsavedModal(true);
      return;
    }
    onClose?.();
  }, [isDirty, allowNavigation, onClose]);

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
      href: `/post/${saved.slug}/preview`,
      target: "_blank",
      rel: "noopener noreferrer",
    }).click();
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex shrink-0 items-center p-5">
          <Placeholder className="size-9 rounded-ds-pill" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-4">
            <Placeholder className="h-10 w-full" />
            <Placeholder className="h-24 w-full" />
            <Placeholder className="h-10 w-full" />
            <Placeholder className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Unpublished changes: saved ones, or edits about to be.
  const hasChanges = entry?.status === "published" && (Boolean(entry.pendingData) || isDirty);

  const getStatusPill = () => {
    const status = entry?.status || "draft";
    return (
      <>
        <DsPill variant={status === "draft" ? "dark" : "light"}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </DsPill>
        {hasChanges && <DsPill variant="light">Changes</DsPill>}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full bg-ds-bg">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
      {/* Top bar: close and the title on the
          left, actions on the right. No surface of its own: the buttons float
          over the content, which fades out beneath the Parabola nav fade (`ds-nav-fade`).
          The zero-height sticky wrapper pins it without taking up room, and the
          bar lets clicks through everywhere but its controls. */}
      <div className="sticky top-0 z-20 h-0">
        <DsTopBar surface="blur" className="flex-row top-0 absolute inset-x-0 items-center justify-between gap-2 px-5 pt-5 pb-10">
        <div className="flex min-w-0 items-center gap-3">
          <DsButton iconLeft={X} aria-label="Close" onClick={handleClose} />
          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <h1 className="truncate text-h3 text-ds-fg">{isEditMode ? "Edit post" : "New post"}</h1>
            {getStatusPill()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentSlug && (
            <DsTooltip content="Preview">
              <DsButton
                iconLeft={Play}
                aria-label="Preview"
                href={`/post/${currentSlug}/preview`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePreview}
              />
            </DsTooltip>
          )}

          {/* Saving stores the post; it goes live from Publish. Autosave keeps this
              current, so it mostly reads as a status. */}
          <DsButton onClick={() => handleSave()} disabled={saving || !isDirty}>
            {saving ? "Saving…" : isDirty ? "Save" : "Saved"}
          </DsButton>

          {/* Publish a draft (after a confirm), or Update a published post's
              changes. Nothing to update: it just says Published. */}
          <DsButton
            variant="primary"
            loading={publishing}
            disabled={entry?.status === "published" && !hasChanges}
            onClick={() => (entry?.status === "published" ? handlePublish() : setPublishDialog(true))}
          >
            {entry?.status !== "published" ? "Publish" : hasChanges ? "Update" : "Published"}
          </DsButton>

          {(entry?.status === "published" || selection.count > 0 || isEditMode) && (
            <DsDropdown>
              <DsDropdownTrigger asChild>
                <DsButton iconLeft={MoreVertical} aria-label="More actions" />
              </DsDropdownTrigger>
              <DsDropdownContent>
                {entry?.status === "published" && entry.pendingData && (
                  <DsDropdownItem iconLeft={RotateCcw} onSelect={() => setDiscardDialog(true)}>
                    Discard changes
                  </DsDropdownItem>
                )}
                {entry?.status === "published" && (
                  <DsDropdownItem iconLeft={EyeOff} onSelect={() => setUnpublishDialog(true)}>
                    Unpublish
                  </DsDropdownItem>
                )}
                {isEditMode && (
                  <DsDropdownItem tone="danger" iconLeft={Trash2} onSelect={handleDelete}>
                    Delete post
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

        {/* Details */}
        {/* `@container`: the DS_COLUMNS_CLASS rows below size to this form, not the screen. */}
        <div className={cn("@container px-5 pb-5", DS_FIELDS_CLASS)}>
          <DsField label="Title" required>
            <DsInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
          </DsField>

          <DsField label="Preview image" className="w-full">
            {previewImage ? (
              <div className={DS_COLUMNS_CLASS}>
                <DsListRow
                  hover={false}
                  className="px-0"
                  thumbnail={thumbnailUrl(previewImage)}
                  title={previewImage.originalName}
                  meta={`${(previewImage.size / 1024 / 1024).toFixed(1)} MB`}
                  actions={
                    <DsDropdown>
                      <DsDropdownTrigger asChild>
                        <DsButton size="small" iconLeft={MoreVertical} aria-label="Preview image options" />
                      </DsDropdownTrigger>
                      <DsDropdownContent>
                        <DsDropdownItem iconLeft={Replace} onSelect={() => setShowPreviewImagePicker(true)}>
                          Replace
                        </DsDropdownItem>
                        <DsDropdownItem
                          tone="danger"
                          iconLeft={X}
                          onSelect={() => {
                            setPreviewImageId(null);
                            setPreviewImage(null);
                          }}
                        >
                          Remove
                        </DsDropdownItem>
                      </DsDropdownContent>
                    </DsDropdown>
                  }
                />
              </div>
            ) : (
              <DsButton iconLeft={Upload} onClick={() => setShowPreviewImagePicker(true)} className="self-start">
                Add image
              </DsButton>
            )}
          </DsField>

          <DsField label="Categories">
            <CategoryInput value={categories} onChange={setCategories} />
          </DsField>

          <DsField label="Publishing date">
            <DsDatePicker
              value={publishDate ? new Date(publishDate) : null}
              onValueChange={(date) => setPublishDate(date ? date.toISOString() : null)}
            />
          </DsField>

          <DsField label="Tags">
            <DsInput
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Add tags, separated by commas"
            />
          </DsField>

          <DsField label="Description" description="Optional. Shown under the post in feeds; blank uses the start of the text.">
            <DsTextarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Leave blank" />
          </DsField>

          <DsField label="Documents" description="Anything that gives Claude context for this post: notes, copy, a brief, HTML. All of them live in Agent." className="w-full">
            <DocsField value={docs} onChange={setDocs} />
          </DsField>

          <SourceFields
            label={sourceLabel}
            url={sourceUrl}
            presets={sourceLabels}
            onLabelChange={setSourceLabel}
            onUrlChange={setSourceUrl}
          />

          <CrosspostFields
            value={crosspost}
            syndication={syndication}
            connections={connections}
            isPublished={entry?.status === "published"}
            retrying={retryingSyndication}
            onChange={setCrosspost}
            onRetry={retrySyndication}
          />
        </div>

        <DsDivider className="mx-5 w-auto" />

        {/* Content Section */}
        <div className="px-5">
          <div className="flex items-center justify-between py-5">
            <h2 className="text-h3 text-ds-fg">Content</h2>
            <span className="text-small text-ds-fg-muted">
              {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
            </span>
          </div>

          {/* Content Blocks */}
          <div className="flex flex-col gap-8">
            {blocks.map((block, index) => (
              <ContentBlockEditor
                key={block.id}
                block={block}
                index={index}
                total={blocks.length}
                selected={selectedBlocks.has(block.id)}
                onToggleSelect={(checked) =>
                  toggleBlockSelection(block.id, checked)
                }
                onUpdate={(updates) => {
                  updateBlock(block.id, updates);

                  // A gallery's images shown in the editor live in galleryMedia, apart
                  // from the block's mediaIds. Reorders, removals and undoing a
                  // removal all arrive here as a new mediaIds list, so rebuild the
                  // shown images from it. (Adding images goes through the upload
                  // and library handlers, which set galleryMedia themselves.)
                  if (
                    block.type === "gallery" &&
                    "mediaIds" in updates &&
                    updates.mediaIds
                  ) {
                    const newMediaIds = updates.mediaIds as string[];
                    setGalleryMedia((prev) => {
                      const currentMedia = prev[block.id] || [];
                      // Remember every image seen, so a removal can be undone.
                      currentMedia.forEach((m) => galleryMediaCache.current.set(m.id, m));
                      const newMedia = newMediaIds
                        .map((id) => galleryMediaCache.current.get(id))
                        .filter((m): m is MediaItem => m !== undefined);
                      return { ...prev, [block.id]: newMedia };
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
                onEditMedia={(mediaId) => setMediaDetailId(mediaId)}
                selectedImages={selection.imagesFor(block.id)}
                onSelectImages={(next) => selection.setImagesFor(block.id, next)}
                onReplaceFile={(mediaId) => {
                  replaceTargetRef.current = mediaId;
                  replaceInputRef.current?.click();
                }}
              />
            ))}
          </div>

          {/* Add block */}
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []).filter(
                (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
              );
              if (files.length > 0 && uploadTargetRef.current) uploadToGallery(uploadTargetRef.current, files);
              e.target.value = "";
            }}
          />
          <div className="flex pt-4 pb-8">
            <DsDropdown>
              <DsDropdownTrigger asChild>
                <DsButton iconLeft={Plus} aria-label="Add block" />
              </DsDropdownTrigger>
              <DsDropdownContent align="start">
                <DsDropdownItem iconLeft={Type} onSelect={() => addBlock("text")}>
                  Text
                </DsDropdownItem>
                <DsDropdownItem iconLeft={Upload} onSelect={() => addImages("upload")}>
                  Upload images
                </DsDropdownItem>
                <DsDropdownItem iconLeft={Image} onSelect={() => addImages("library")}>
                  Add from library
                </DsDropdownItem>
                <DsDropdownItem iconLeft={Youtube} onSelect={() => addBlock("youtube")}>
                  YouTube
                </DsDropdownItem>
                <DsDropdownItem iconLeft={Quote} onSelect={() => addBlock("quote")}>
                  Quote
                </DsDropdownItem>
                <DsDropdownItem iconLeft={Minus} onSelect={() => addBlock("divider")}>
                  Divider
                </DsDropdownItem>
              </DsDropdownContent>
            </DsDropdown>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onDiscard={() => {
          const closing = !pendingNavUrl;
          handleDiscardChanges();
          if (closing) onClose?.();
        }}
        onSave={handleSaveAndNavigate}
        onCancel={handleCancelNavigation}
        isSaving={saving}
        isPublished={entry?.status === "published"}
      />

      {/* Gallery Media Picker */}
      <MediaPicker
        isOpen={!!galleryPickerBlockId}
        onClose={() => {
          setGalleryPickerBlockId(null);
          setGalleryReplaceIndex(null);
        }}
        onSelect={(items) => {
          if (galleryPickerBlockId && items.length > 0) {
            const block = blocks.find((b) => b.id === galleryPickerBlockId);
            if (block && block.type === "gallery") {
              if (galleryReplaceIndex !== null) {
                const newMediaIds = [...(block.mediaIds || [])];
                newMediaIds[galleryReplaceIndex] = items[0].id;
                updateBlock(galleryPickerBlockId, { mediaIds: newMediaIds });

                setGalleryMedia((prev) => {
                  const existingMedia = [
                    ...(prev[galleryPickerBlockId] || []),
                  ];
                  existingMedia[galleryReplaceIndex] = items[0];
                  return { ...prev, [galleryPickerBlockId]: existingMedia };
                });
              } else {
                const existingIds = block.mediaIds || [];
                const newIds = items.map((item) => item.id);
                updateBlock(galleryPickerBlockId, {
                  mediaIds: [...existingIds, ...newIds],
                });

                setGalleryMedia((prev) => ({
                  ...prev,
                  [galleryPickerBlockId]: [
                    ...(prev[galleryPickerBlockId] || []),
                    ...items,
                  ],
                }));
              }
            }
          }
          setGalleryPickerBlockId(null);
          setGalleryReplaceIndex(null);
        }}
        multiple={galleryReplaceIndex === null}
        accept={["image/*"]}
      />

      {/* Preview Image Picker */}
      <MediaPicker
        isOpen={showPreviewImagePicker}
        onClose={() => setShowPreviewImagePicker(false)}
        onSelect={(items) => {
          if (items.length > 0) {
            const selectedItem = items[0];
            setPreviewImageId(selectedItem.id);
            setPreviewImage(selectedItem);
          }
          setShowPreviewImagePicker(false);
        }}
        multiple={false}
        accept={["image/*"]}
      />

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleReplaceFileChange}
      />

      {/* Media Detail Modal */}
      <MediaDetailModal
        mediaId={mediaDetailId}
        onClose={() => setMediaDetailId(null)}
        showDelete={false}
      />

      {deleteDialog}
      {selection.dialog}

      <DsConfirmDialog
        open={publishDialog}
        onOpenChange={setPublishDialog}
        title="Publish post?"
        description="It goes live on your site."
        confirmLabel="Publish"
        loading={publishing}
        onConfirm={handlePublish}
      />

      <DsConfirmDialog
        open={unpublishDialog}
        onOpenChange={setUnpublishDialog}
        title="Unpublish post?"
        description="This takes your post off the public site and keeps it as a draft, with any unpublished changes."
        confirmLabel="Unpublish"
        loading={statusChanging}
        onConfirm={handleUnpublish}
      />

      <DsConfirmDialog
        open={discardDialog}
        onOpenChange={setDiscardDialog}
        title="Discard changes?"
        description="The post goes back to what's live on your site. Your unpublished changes are lost."
        confirmLabel="Discard changes"
        destructive
        loading={statusChanging}
        onConfirm={handleDiscardPending}
      />
    </div>
  );
}


/** A pulsing block standing in for content while the post loads. */
function Placeholder({ className }: { className: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-ds-md bg-ds-surface-subtle", className)} />;
}
