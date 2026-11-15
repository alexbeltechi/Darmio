"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Loader2,
  Trash2,
  Copy,
  ExternalLink,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  DsButton,
  DsDivider,
  DsField,
  DsInput,
  DsPill,
  DsTextarea,
  DsTooltip,
  dsToast,
  DsTopBar,
} from "@beltechi/parabola";
import { formatFileSize } from "@/lib/image-compression";
import { cn } from "@/lib/utils";
import { storedBytes } from "@/lib/cms/stored-bytes";
import type { MediaItem } from "@/lib/cms/types";

interface UsageInfo {
  collection: string;
  slug: string;
  title: string;
}

interface MediaDetailModalProps {
  mediaId: string | null;
  onClose: () => void;
  /** Deletes the file; the caller confirms, deletes and closes the modal. */
  onDelete?: (id: string) => void;
  onReplace?: (id: string) => void;
  showDelete?: boolean;
  showReplace?: boolean;
  onNavigate?: (direction: "prev" | "next") => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
}

/**
 * A media file's details: the preview on the left, its facts and editable
 * fields on the right. Drawn like the Parabola dialog (frosted page behind, a
 * page-colour card with no outline, 16px corners and the raised shadow),
 * only wider. Escape or a click outside closes it. On open, focus goes to the
 * dialog rather than its first button, so no tooltip or focus ring shows
 * until you Tab.
 */
export function MediaDetailModal({
  mediaId,
  onClose,
  onDelete,
  onReplace,
  showDelete = false,
  showReplace = false,
  onNavigate,
  canNavigatePrev = false,
  canNavigateNext = false,
}: MediaDetailModalProps) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usages, setUsages] = useState<UsageInfo[]>([]);

  const [editAlt, setEditAlt] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");

  useEffect(() => {
    if (!mediaId) {
      setItem(null);
      setUsages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      fetch(`/api/admin/media/${mediaId}`).then((res) => res.json()),
      fetch(`/api/admin/media/${mediaId}/usage`).then((res) => res.json()),
    ])
      .then(([mediaData, usageData]) => {
        if (mediaData.data) {
          setItem(mediaData.data);
          setEditAlt(mediaData.data.alt || "");
          setEditTitle(mediaData.data.title || "");
          setEditCaption(mediaData.data.caption || "");
          setEditDescription(mediaData.data.description || "");
          setEditTags((mediaData.data.tags || []).join(", "));
        }
        setUsages(usageData.usages || []);
      })
      .catch((err) => {
        console.error("Failed to fetch media:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [mediaId]);

  const clearKeywords = async () => {
    if (!item) return;
    const res = await fetch(`/api/admin/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: [] }),
    });
    if (!res.ok) {
      dsToast.error("Couldn't clear keywords");
      return;
    }
    setItem((await res.json()).data);
    dsToast("Keywords cleared");
  };

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alt: editAlt,
          title: editTitle,
          caption: editCaption,
          description: editDescription,
          tags: editTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      const updated = await res.json();
      setItem(updated.data);
      dsToast("Changes saved");
    } catch (error) {
      console.error("Failed to save:", error);
      dsToast.error("Couldn't save changes");
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    dsToast("URL copied");
  };

  const isImage = item?.mime.startsWith("image/");
  // Widths it's served at: its renditions (newer uploads) or its variants.
  const sizes =
    item && isImage
      ? (item.renditions?.length
          ? item.renditions
          : [item.variants?.display, item.variants?.medium, item.variants?.thumb]
        )
          .filter((v): v is NonNullable<typeof v> => Boolean(v))
          .map((v) => `${v.width}×${v.height}`)
          .join(", ") || `${item.width}×${item.height}`
      : null;

  return (
    <Dialog.Root open={mediaId !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-(--ds-z-menu) bg-ds-bg/60 backdrop-blur-[24px] motion-safe:animate-in motion-safe:fade-in-0" />
        <Dialog.Content
          data-slot="ds-media-dialog"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
          className={cn(
            "fixed top-1/2 left-1/2 z-(--ds-z-menu) flex h-[min(820px,calc(100dvh-32px))] w-[min(1200px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden",
            "rounded-ds-lg bg-ds-bg text-ds-fg shadow-ds-raised outline-none",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
          )}
        >
          {/* Header: pinned over the content, which fades out beneath it (`ds-nav-fade`,
              as on the list pages); clicks pass through the gradient's empty space. */}
          <DsTopBar surface="blur" className="flex-row top-0 absolute inset-x-0 items-center gap-2 p-5 pb-10">
            <Dialog.Title className="min-w-0 flex-1 truncate text-h3">
              {item?.title || item?.originalName || "Media details"}
            </Dialog.Title>
            {onNavigate && (
              <>
                <DsTooltip content="Previous">
                  <DsButton
                    iconLeft={ChevronLeft}
                    aria-label="Previous file"
                    onClick={() => onNavigate("prev")}
                    disabled={!canNavigatePrev}
                  />
                </DsTooltip>
                <DsTooltip content="Next">
                  <DsButton
                    iconLeft={ChevronRight}
                    aria-label="Next file"
                    onClick={() => onNavigate("next")}
                    disabled={!canNavigateNext}
                  />
                </DsTooltip>
              </>
            )}
            <Dialog.Close asChild>
              <DsButton iconLeft={X} aria-label="Close" />
            </Dialog.Close>
          </DsTopBar>

          {/* Content */}
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 aria-label="Loading" className="size-6 animate-spin text-ds-fg-subtle" />
            </div>
          ) : !item ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-p text-ds-fg-muted">Media not found</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
              {/* Preview */}
              <div className="flex min-h-[280px] shrink-0 p-5 pt-[76px] lg:min-h-0 lg:flex-1 lg:pr-0">
                <div className="flex flex-1 items-center justify-center overflow-hidden">
                  {isImage ? (
                    <img
                      src={item.original?.url || item.url}
                      alt={item.alt || item.originalName}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <video
                      src={item.url}
                      poster={item.poster?.url}
                      controls
                      className="max-h-full max-w-full rounded-ds-md"
                    />
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-col gap-5 p-5 ds-fields-fill lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:pt-[76px]">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-p">
                  <Fact label="Created">{formatDate(item.createdAt)}</Fact>
                  {item.uploadedAt && formatDate(item.uploadedAt) !== formatDate(item.createdAt) && (
                    <Fact label="Uploaded">{formatDate(item.uploadedAt)}</Fact>
                  )}
                  <Fact label="File name">
                    <span className="break-all">{item.originalName}</span>
                  </Fact>
                  <Fact label="Type">{item.mime}</Fact>
                  {sizes && <Fact label="Sizes">{sizes} px</Fact>}
                  <Fact label="Size">
                    {formatFileSize(storedBytes(item))}
                    {item.fallback && ` in all, with a ${item.fallback.url.endsWith(".png") ? "PNG" : "JPEG"} for older browsers`}
                  </Fact>
                  {item.source?.origin && (
                    <Fact label="Source">
                      {item.source.origin === "agent" ? (
                        <DsPill variant="highlight" iconLeft={Sparkles}>
                          {agentName(item.source.agent)}
                        </DsPill>
                      ) : (
                        <DsPill>{item.source.origin.charAt(0).toUpperCase() + item.source.origin.slice(1)}</DsPill>
                      )}
                    </Fact>
                  )}
                  {item.source?.path && (
                    <Fact label="From">
                      <span className="break-all">{item.source.path}</span>
                    </Fact>
                  )}
                  {item.source?.batchId && <Fact label="Batch">{item.source.batchId}</Fact>}
                  <Fact label="Used in">
                    {usages.length > 0 ? (
                      <span className="flex items-start gap-1">
                        <Check aria-hidden className="mt-[3px] size-4 shrink-0" />
                        <span>
                          {usages.map((usage, idx) => (
                            <span key={`${usage.collection}-${usage.slug}`}>
                              <Link
                                href={`/admin/${usage.collection}/${usage.slug}`}
                                className="underline underline-offset-2 hover:opacity-70"
                              >
                                {usage.title}
                              </Link>
                              {idx < usages.length - 1 && ", "}
                            </span>
                          ))}
                        </span>
                      </span>
                    ) : (
                      "Not used yet"
                    )}
                  </Fact>
                </dl>

                <DsDivider />

                <div className="flex flex-col gap-4">
                  <DsField label="Alternative text" description="Leave empty if the image is purely decorative.">
                    <DsTextarea
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      placeholder="Describe this image for screen readers"
                    />
                  </DsField>
                  <DsField label="Title">
                    <DsInput value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Image title" />
                  </DsField>
                  <DsField label="Caption">
                    <DsTextarea
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Caption displayed below the image"
                    />
                  </DsField>
                  <DsField label="Description">
                    <DsTextarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Longer description for the image"
                    />
                  </DsField>
                  <DsField label="Tags" description="Internal tags for organising and filtering media.">
                    <DsInput value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="name, company, place" />
                  </DsField>
                  {item.keywords?.length ? (
                    // Written by an agent that looked at the image; shown with who and when, and cleared in one go.
                    <DsField
                      label="Keywords"
                      description={`From ${item.keywordsFrom?.by ?? "an agent"}${
                        item.keywordsFrom ? `, ${new Date(item.keywordsFrom.at).toLocaleDateString()}` : ""
                      }. Searchable.`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {item.keywords.map((keyword) => (
                          <DsPill key={keyword}>{keyword}</DsPill>
                        ))}
                        <DsButton size="small" variant="text" destructive onClick={clearKeywords}>
                          Clear
                        </DsButton>
                      </div>
                    </DsField>
                  ) : null}
                  <DsField label="File URL">
                    <div className="flex items-center gap-2">
                      <DsInput value={item.url} readOnly className="min-w-0 flex-1" />
                      <DsTooltip content="Copy URL">
                        <DsButton iconLeft={Copy} aria-label="Copy URL" onClick={() => copyUrl(item.url)} />
                      </DsTooltip>
                      <DsTooltip content="Open in new tab">
                        <DsButton
                          iconLeft={ExternalLink}
                          aria-label="Open in new tab"
                          onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                        />
                      </DsTooltip>
                    </div>
                  </DsField>
                </div>

                {/* Actions, stacked full width with the main one first, as in the Parabola dialog */}
                <div className="flex flex-col gap-2 [&>*]:w-full">
                  <DsButton variant="primary" loading={saving} onClick={handleSave}>
                    Save changes
                  </DsButton>
                  {showReplace && onReplace && (
                    <DsButton iconLeft={RefreshCw} onClick={() => onReplace(item.id)}>
                      Replace file
                    </DsButton>
                  )}
                  {showDelete && onDelete && (
                    <DsButton variant="text" destructive iconLeft={Trash2} className="h-9" onClick={() => onDelete(item.id)}>
                      Delete file
                    </DsButton>
                  )}
                </div>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** One row of the facts list: label muted on the left, value on the right. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-ds-fg-muted">{label}</dt>
      <dd className="min-w-0 text-ds-fg">{children}</dd>
    </>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function agentName(agent?: string) {
  if (!agent) return "Agent";
  return agent.charAt(0).toUpperCase() + agent.slice(1);
}
