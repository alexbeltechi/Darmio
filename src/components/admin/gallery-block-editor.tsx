"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Image as ImageIcon,
  Upload,
  LayoutTemplate,
  RotateCcw,
  X,
  Loader2,
  Trash2,
  Pencil,
  ArrowLeftToLine,
  ArrowRightToLine,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  DsButton,
  DsCheckbox,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownSeparator,
  DsDropdownTrigger,
  DsTextarea,
  useDsConfirm,
  DsField,
  DsSelect,
  DS_TRAY_CLASS,
  DS_GUTTER_PX,
  dsToast,
} from "@beltechi/parabola";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import type { GalleryBlock, MediaItem } from "@/lib/cms/types";
import { thumbnailUrl } from "@/lib/cms/media-url";
import { aspectOf, galleryColumns, galleryIsFull, justifiedRows, liveGalleryWidth } from "@/lib/cms/justified-rows";
import { useMediaDelete } from "@/components/admin/media-delete-dialog";

const NO_SELECTION = new Set<string>();

interface GalleryBlockEditorProps {
  block: GalleryBlock;
  galleryMedia: MediaItem[];
  onUpdate: (updates: Partial<GalleryBlock>) => void;
  onOpenGalleryPicker?: () => void;
  onReplaceImage?: (index: number) => void;
  onUploadFiles?: (files: File[]) => Promise<void>;
  onEditMedia?: (mediaId: string) => void;
  /** Swap the file itself for a newly uploaded one, in every post that uses it. */
  onReplaceFile?: (mediaId: string) => void;
  /** Images ticked here. The editor holds them, so its ⋮ menu can act on them with ticked blocks. */
  selectedIds?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
}

export function GalleryBlockEditor({
  block,
  galleryMedia,
  onUpdate,
  onOpenGalleryPicker,
  onReplaceImage,
  onUploadFiles,
  onEditMedia,
  onReplaceFile,
  selectedIds = NO_SELECTION,
  onSelectionChange,
}: GalleryBlockEditorProps) {
  const [confirm, confirmDialog] = useDsConfirm();
  const [deleteMediaItems, deleteMediaDialog] = useMediaDelete();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0 && onUploadFiles) {
      const validFiles = Array.from(files).filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/")
      );
      if (validFiles.length > 0) {
        setIsUploading(true);
        try {
          await onUploadFiles(validFiles);
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUploadFiles) {
      const validFiles = Array.from(files).filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/")
      );
      if (validFiles.length > 0) {
        setIsUploading(true);
        try {
          await onUploadFiles(validFiles);
        } finally {
          setIsUploading(false);
        }
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  // Move image left (decrease index) - wraps from first to last
  const moveImageLeft = useCallback(
    (mediaId: string) => {
      const mediaIds = block.mediaIds || [];
      const index = mediaIds.indexOf(mediaId);
      if (index < 0) return;
      const newMediaIds = [...mediaIds];
      if (index === 0) {
        // Wrap: move first item to last
        const [item] = newMediaIds.splice(0, 1);
        newMediaIds.push(item);
      } else {
        [newMediaIds[index], newMediaIds[index - 1]] = [
          newMediaIds[index - 1],
          newMediaIds[index],
        ];
      }
      onUpdate({ mediaIds: newMediaIds });
    },
    [block.mediaIds, onUpdate]
  );

  // Move image right (increase index) - wraps from last to first
  const moveImageRight = useCallback(
    (mediaId: string) => {
      const mediaIds = block.mediaIds || [];
      const index = mediaIds.indexOf(mediaId);
      if (index < 0) return;
      const newMediaIds = [...mediaIds];
      if (index === mediaIds.length - 1) {
        // Wrap: move last item to first
        const [item] = newMediaIds.splice(index, 1);
        newMediaIds.unshift(item);
      } else {
        [newMediaIds[index], newMediaIds[index + 1]] = [
          newMediaIds[index + 1],
          newMediaIds[index],
        ];
      }
      onUpdate({ mediaIds: newMediaIds });
    },
    [block.mediaIds, onUpdate]
  );

  const moveToStart = useCallback(
    (mediaId: string) => {
      const mediaIds = block.mediaIds || [];
      const index = mediaIds.indexOf(mediaId);
      if (index <= 0) return; // Already at start
      const newMediaIds = [...mediaIds];
      const [item] = newMediaIds.splice(index, 1);
      newMediaIds.unshift(item);
      onUpdate({ mediaIds: newMediaIds });
    },
    [block.mediaIds, onUpdate]
  );

  const moveToEnd = useCallback(
    (mediaId: string) => {
      const mediaIds = block.mediaIds || [];
      const index = mediaIds.indexOf(mediaId);
      if (index < 0 || index === mediaIds.length - 1) return; // Already at end
      const newMediaIds = [...mediaIds];
      const [item] = newMediaIds.splice(index, 1);
      newMediaIds.push(item);
      onUpdate({ mediaIds: newMediaIds });
    },
    [block.mediaIds, onUpdate]
  );

  const nameOf = (mediaId: string) => {
    const item = galleryMedia.find((m) => m.id === mediaId);
    return item?.originalName || item?.filename || "this image";
  };

  const handleRemoveImage = async (mediaId: string) => {
    const ok = await confirm({
      title: "Remove image?",
      description: `"${nameOf(mediaId)}" comes out of this gallery and stays in the Library.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    const currentMediaIds = block.mediaIds || [];
    onUpdate({ mediaIds: currentMediaIds.filter((id) => id !== mediaId) });
    if (selectedIds.has(mediaId)) onSelectionChange?.(new Set([...selectedIds].filter((id) => id !== mediaId)));
    dsToast("Image removed", {
      action: {
        label: "Undo",
        onClick: () => onUpdate({ mediaIds: currentMediaIds }),
      },
    });
  };

  // For good, through the library's own confirm (it lists the posts that use it).
  const handleDeleteImage = async (mediaId: string) => {
    if ((await deleteMediaItems([mediaId])).length === 0) return;
    onUpdate({ mediaIds: (block.mediaIds || []).filter((id) => id !== mediaId) });
    if (selectedIds.has(mediaId)) onSelectionChange?.(new Set([...selectedIds].filter((id) => id !== mediaId)));
  };

  const toggleSelected = useCallback(
    (mediaId: string, checked: boolean) => {
      const next = new Set(selectedIds);
      if (checked) next.add(mediaId);
      else next.delete(mediaId);
      onSelectionChange?.(next);
    },
    [onSelectionChange, selectedIds]
  );

  const handleReplaceImage = useCallback(
    (index: number) => {
      onReplaceImage?.(index);
    },
    [onReplaceImage]
  );

  const renderLayoutPreview = () => {
    const layout = block.layout || "auto";

    const renderThumb = (item: MediaItem, index: number, aspectRatio?: number) => (
      <ThumbnailItem
        key={item.id}
        item={item}
        index={index}
        total={galleryMedia.length}
        aspectRatio={aspectRatio}
        selected={selectedIds.has(item.id)}
        onToggleSelect={(checked) => toggleSelected(item.id, checked)}
        onMoveLeft={() => moveImageLeft(item.id)}
        onMoveRight={() => moveImageRight(item.id)}
        onMoveToStart={() => moveToStart(item.id)}
        onMoveToEnd={() => moveToEnd(item.id)}
        onRemove={() => handleRemoveImage(item.id)}
        onDelete={() => handleDeleteImage(item.id)}
        onReplace={() => handleReplaceImage(index)}
        onEdit={() => onEditMedia?.(item.id)}
        onReplaceFile={onReplaceFile ? () => onReplaceFile(item.id) : undefined}
      />
    );

    if (layout === "auto" || layout === "stack") {
      return (
        <AutoRowsPreview items={galleryMedia} width={block.width} stacked={layout === "stack"} renderThumb={renderThumb} />
      );
    }

    if (layout === "grid" || layout === "masonry") {
      // For editor preview: grid uses actual columns (1-3), masonry caps at 3 for visibility.
      const previewColumns = layout === "masonry" ? Math.min(block.columns || 5, 3) : block.columns || 3;
      return (
        // One column on phones, so each image keeps a readable caption row.
        <div
          className="grid grid-cols-1 gap-5 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
          style={{ "--cols": previewColumns } as React.CSSProperties}
        >
          {galleryMedia.map((item, index) => renderThumb(item, index))}
        </div>
      );
    }

    return null;
  };

  const hasImages = galleryMedia && galleryMedia.length > 0;

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col gap-5 rounded-ds-lg border-2 border-transparent transition-colors",
        isDragging && "border-dashed border-ds-fg bg-ds-surface-subtle"
      )}
    >
      {confirmDialog}
      {deleteMediaDialog}

      {/* Image grid with layout preview */}
      {hasImages && renderLayoutPreview()}

      {/* Empty: a 3:2 placeholder where the image will go, holding the ways to
          add one, and a caption below for what it should be. The preview shows
          the same box; the live site skips it. */}
      {!hasImages && (
        <div className="flex flex-col gap-2">
          <div className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-3 rounded-ds-md bg-ds-surface-subtle p-4">
            {isUploading ? (
              <div className="flex items-center gap-2">
                <Loader2 aria-hidden className="size-4 animate-spin text-ds-fg-subtle" />
                <p className="text-p text-ds-fg-muted">Uploading...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <DsButton size="small" iconLeft={Upload} onClick={() => fileInputRef.current?.click()}>
                    Upload
                  </DsButton>
                  <DsButton size="small" iconLeft={ImageIcon} onClick={onOpenGalleryPicker}>
                    Library
                  </DsButton>
                </div>
                <p className="text-small text-ds-fg-subtle">
                  {isDragging ? "Drop files here" : "or drag images and videos here"}
                </p>
              </>
            )}
          </div>
          <DsTextarea
            bare
            value={block.placeholder || ""}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            placeholder="Caption: what image goes here?"
            aria-label="Placeholder caption"
            className="text-small text-ds-fg-muted"
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Uploading into a gallery that already has images (an empty one shows
          progress in its placeholder). More images are added from the + menu
          below the blocks, or by dropping files anywhere on the gallery. */}
      {isUploading && hasImages && (
        <div className="flex items-center gap-2">
          <Loader2 aria-hidden className="size-4 animate-spin text-ds-fg-subtle" />
          <p className="text-p text-ds-fg-muted">Uploading...</p>
        </div>
      )}
    </div>
  );
}

// The editor thumbnail takes the image's own shape. Only extreme shapes are
// cropped: wider than 6:1 or taller than 1:2 (a 9:16 phone screenshot still
// fits whole). Unknown dimensions default to square.
const MAX_THUMB_RATIO = 6; // width / height
const MIN_THUMB_RATIO = 1 / 2;

function getClampedAspectRatio(width?: number, height?: number): number {
  if (!width || !height) return 1;
  return Math.min(MAX_THUMB_RATIO, Math.max(MIN_THUMB_RATIO, width / height));
}

/** "251 kb", or "2.4 MB" from a megabyte up. */
function formatFileSize(bytes: number): string {
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.max(1, Math.round(kb))} kb` : `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * One gallery image (Figma: Folio Dharmify 699:6154): the image with move
 * left/right buttons top right on hover, then a row with a bulk-select
 * checkbox, the file name and size, and small remove (×) and ⋮ buttons.
 */

/**
 * Auto in the editor: the same justified rows as the live page, worked out
 * for the width this gallery has on the live page in a window this size
 * (`liveGalleryWidth`), then scaled to the editor's width. So the rows break
 * where a visitor's do, on desktop, tablet or phone.
 */
function AutoRowsPreview({
  items,
  width,
  stacked = false,
  renderThumb,
}: {
  items: MediaItem[];
  width: GalleryBlock["width"];
  /** The Stacked layout: one image a row. */
  stacked?: boolean;
  renderThumb: (item: MediaItem, index: number, aspectRatio: number) => React.ReactNode;
}) {
  const [viewport, setViewport] = useState(1440);
  useEffect(() => {
    const measure = () => setViewport(window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const aspects = items.map((item) => aspectOf(item.width, item.height));
  const galleryWidth = liveGalleryWidth(viewport, width, items.length);
  const rows = justifiedRows(
    aspects,
    galleryWidth,
    DS_GUTTER_PX,
    items.map((item) => item.height),
    galleryColumns(galleryWidth, galleryIsFull(width, items.length), items.length, stacked)
  );

  return (
    <div className="flex flex-col gap-5">
      {rows.map((row, r) => {
        const total = row.items.reduce((sum, i) => sum + aspects[i], 0);
        return (
          <div key={r} className="flex justify-center" style={{ gap: DS_GUTTER_PX }}>
            {row.items.map((i) => {
              const share = row.mode === "fill" ? aspects[i] / total : aspects[i] * row.height;
              const tileWidth =
                row.mode === "fill"
                  ? `calc((100% - ${(row.items.length - 1) * DS_GUTTER_PX}px) * ${share})`
                  : `${share * 100}%`;
              return (
                <div key={items[i].id} className="min-w-0 shrink-0" style={{ width: tileWidth }}>
                  {renderThumb(items[i], i, aspects[i])}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ThumbnailItem({
  item,
  index,
  total,
  selected,
  onToggleSelect,
  onMoveLeft,
  onMoveRight,
  onMoveToStart,
  onMoveToEnd,
  onRemove,
  onDelete,
  onReplace,
  onEdit,
  onReplaceFile,
  aspectRatio: aspectOverride,
}: {
  item: MediaItem;
  index: number;
  total: number;
  /** The image box's shape; Auto passes the one its rows were worked out with. */
  aspectRatio?: number;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onMoveToStart: () => void;
  onMoveToEnd: () => void;
  onRemove: () => void;
  /** Delete the file from the media library for good. */
  onDelete: () => void;
  onReplace: () => void;
  onEdit?: () => void;
  onReplaceFile?: () => void;
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const name = item.originalName || item.filename;

  // The image's own shape (see getClampedAspectRatio)
  const aspectRatio = aspectOverride ?? getClampedAspectRatio(item.width, item.height);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* min-h-12: a very wide image still leaves room for the buttons on top of it. */}
      <div className="group/thumb relative min-h-12 overflow-hidden rounded-ds-md bg-ds-surface" style={{ aspectRatio }}>
        <img src={thumbnailUrl(item)} alt={item.alt || ""} className="size-full object-cover" />
        {/* Clicking the image opens its details (tags, caption, description); the buttons on top keep their own clicks. */}
        {onEdit && (
          <button
            type="button"
            aria-label={`Edit ${name}`}
            onClick={onEdit}
            className="ds-focus absolute inset-0 cursor-pointer rounded-ds-md"
          />
        )}

        {/* Move left / right (wrapping around) and remove, top right on hover or keyboard focus; always on touch screens. The only remove button, so it isn't repeated in the row below. */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover/thumb:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
          {total > 1 && (
            <>
              <DsButton size="small" iconLeft={ChevronLeft} aria-label={`Move ${name} left`} onClick={onMoveLeft} />
              <DsButton size="small" iconLeft={ChevronRight} aria-label={`Move ${name} right`} onClick={onMoveRight} />
            </>
          )}
          <DsButton size="small" iconLeft={X} aria-label={`Remove ${name} from the gallery`} onClick={onRemove} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex size-6 shrink-0 items-center justify-center">
          <DsCheckbox
            checked={selected}
            onCheckedChange={(checked) => onToggleSelect(checked === true)}
            aria-label={`Select ${name}`}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-p text-ds-fg">{name}</p>
          <p className="truncate text-p text-ds-fg-subtle">{formatFileSize(item.size)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DsDropdown>
            <DsDropdownTrigger asChild>
              <DsButton size="small" variant="text" iconLeft={MoreVertical} aria-label={`Options for ${name}`} />
            </DsDropdownTrigger>
            <DsDropdownContent>
              {onEdit && (
                <DsDropdownItem iconLeft={Pencil} onSelect={onEdit}>
                  Edit
                </DsDropdownItem>
              )}
              <DsDropdownItem
                iconLeft={Copy}
                onSelect={() => {
                  navigator.clipboard.writeText(item.url);
                  dsToast("URL copied");
                }}
              >
                Copy URL
              </DsDropdownItem>
              <DsDropdownItem
                iconLeft={ExternalLink}
                onSelect={() => window.open(item.url, "_blank", "noopener,noreferrer")}
              >
                Open in new tab
              </DsDropdownItem>
              <DsDropdownItem iconLeft={RotateCcw} onSelect={onReplace}>
                Choose another image
              </DsDropdownItem>
              {onReplaceFile && (
                <DsDropdownItem iconLeft={RefreshCw} onSelect={onReplaceFile}>
                  Replace file
                </DsDropdownItem>
              )}
              {!isFirst && (
                <DsDropdownItem iconLeft={ArrowLeftToLine} onSelect={onMoveToStart}>
                  Move to start
                </DsDropdownItem>
              )}
              {!isLast && (
                <DsDropdownItem iconLeft={ArrowRightToLine} onSelect={onMoveToEnd}>
                  Move to end
                </DsDropdownItem>
              )}
              <DsDropdownSeparator />
              <DsDropdownItem tone="danger" iconLeft={X} onSelect={onRemove}>
                Remove
              </DsDropdownItem>
              <DsDropdownItem tone="danger" iconLeft={Trash2} onSelect={onDelete}>
                Permanently delete
              </DsDropdownItem>
            </DsDropdownContent>
          </DsDropdown>
        </div>
      </div>
    </div>
  );
}

const LAYOUT_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "stack", label: "Stacked" },
  { value: "grid", label: "Grid" },
  { value: "masonry", label: "Masonry" },
];
// Auto is the default: inline (stacked up to three, then three a row), full
// width from 20 images (galleryIsFull). "normal", from older posts, shows as Inline.
const WIDTH_OPTIONS = [
  { value: "auto", label: "Auto (by number of images)" },
  { value: "large", label: "Inline (up to 1024px)" },
  { value: "full", label: "Full width" },
];

type LayoutSettings = {
  layout: "auto" | "stack" | "grid" | "masonry";
  columns: number;
  width: "auto" | "large" | "full";
};

/**
 * A column count the layout offers: masonry 1-6 (default 5, also when you
 * switch to it from another layout), grid 1-3.
 */
function columnsFor(layout: LayoutSettings["layout"], columns: number, from?: LayoutSettings["layout"]): number {
  if (layout === "masonry") return from && from !== "masonry" ? 5 : Math.min(Math.max(columns || 5, 1), 6);
  if (layout === "grid") return Math.min(Math.max(columns, 1), 3);
  return columns;
}

/**
 * The gallery's layout settings: an icon button for the block's header that
 * opens a tray with layout, columns and width. Changes apply together with
 * Apply, and Cancel (or closing) throws them away.
 */
export function LayoutSettingsPopover({
  block,
  onUpdate,
}: {
  block: GalleryBlock;
  onUpdate: (updates: Partial<GalleryBlock>) => void;
}) {
  const layout =
    block.layout === "stack" || block.layout === "grid" || block.layout === "masonry" ? block.layout : "auto";
  const columns = block.columns || 1;
  const width = block.width === "full" ? "full" : block.width === "large" || block.width === "normal" ? "large" : "auto";

  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<LayoutSettings>({ layout, columns, width });

  // Start from the block's current settings each time it opens.
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setTemp({ layout, columns: columnsFor(layout, block.columns || (layout === "masonry" ? 5 : 1)), width });
    setOpen(isOpen);
  };

  const setLayout = (next: LayoutSettings["layout"]) =>
    setTemp((t) => ({
      ...t,
      layout: next,
      // Sensible default column counts when switching layouts.
      columns: columnsFor(next, t.columns, t.layout),
    }));

  const columnOptions =
    temp.layout === "masonry"
      ? [1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: n === 1 ? "1 column" : `${n} columns` }))
      : [1, 2, 3].map((n) => ({ value: String(n), label: n === 1 ? "1 column" : `${n} columns` }));

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <DsButton size="small" iconLeft={LayoutTemplate} pressed={open}>
          Layout
        </DsButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className={cn(DS_TRAY_CLASS, "w-72 p-4")}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-p text-ds-fg">Choose layout</p>
              <DsButton
                size="small"
                variant="text"
                iconLeft={RotateCcw}
                onClick={() => setTemp({ layout: "auto", columns: 1, width: "auto" })}
              >
                Reset
              </DsButton>
            </div>

            <DsField label="Layout">
              <DsSelect
                options={LAYOUT_OPTIONS}
                value={temp.layout}
                onValueChange={(value) => setLayout(value as LayoutSettings["layout"])}
              />
            </DsField>

            {(temp.layout === "grid" || temp.layout === "masonry") && (
              <DsField label={temp.layout === "masonry" ? "Max columns" : "Columns"}>
                <DsSelect
                  options={columnOptions}
                  value={String(temp.columns)}
                  onValueChange={(value) => setTemp((t) => ({ ...t, columns: Number(value) }))}
                />
              </DsField>
            )}

            <DsField label="Width">
              <DsSelect
                options={WIDTH_OPTIONS}
                value={temp.width}
                onValueChange={(value) => setTemp((t) => ({ ...t, width: value as LayoutSettings["width"] }))}
              />
            </DsField>

            <div className="flex gap-2">
              <DsButton className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </DsButton>
              <DsButton
                variant="primary"
                className="flex-1"
                onClick={() => {
                  onUpdate({ layout: temp.layout, columns: temp.columns, width: temp.width });
                  setOpen(false);
                }}
              >
                Apply
              </DsButton>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
