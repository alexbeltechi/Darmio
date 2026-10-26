"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { DsButton, DsCheckbox, DsDivider, DsInput, DsTextarea } from "@beltechi/parabola";
import { DsRichText } from "@beltechi/parabola/primitives/rich-text";
import { GalleryBlockEditor, LayoutSettingsPopover } from "@/components/admin/gallery-block-editor";
import type { Block, GalleryBlock, MediaItem } from "@/lib/cms/types";

/**
 * One content block in an editor (posts and pages): a slim header row
 * (select, type, tools) over the block's own fields.
 */
export /** A block with nothing in it. Empty blocks are dropped on save, so the
 * starter Text slot never reaches the published post. An empty gallery is
 * kept: it's a placeholder for an image still to come (shown in the editor
 * and the preview, skipped on the live site). */
function isBlockEmpty(block: Block): boolean {
  switch (block.type) {
    case "text":
      return !block.html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    case "gallery":
      return false;
    case "image":
    case "video":
      return !block.mediaId;
    case "youtube":
      return !block.url.trim();
    case "quote":
      return !block.text.trim();
    default:
      return false;
  }
}

export function ContentBlockEditor({
  block,
  index,
  total,
  selected,
  onToggleSelect,
  onUpdate,
  onRemove,
  onMove,
  onOpenGalleryPicker,
  onReplaceGalleryImage,
  onUploadGalleryFiles,
  galleryMedia,
  onEditMedia,
  onReplaceFile,
  selectedImages,
  onSelectImages,
}: {
  block: Block;
  index: number;
  total: number;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onUpdate: (updates: Partial<Block>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  onOpenGalleryPicker?: () => void;
  onReplaceGalleryImage?: (imageIndex: number) => void;
  onUploadGalleryFiles?: (files: File[]) => Promise<void>;
  galleryMedia?: MediaItem[];
  onEditMedia?: (mediaId: string) => void;
  onReplaceFile?: (mediaId: string) => void;
  /** For a gallery: its ticked images, held by the editor. */
  selectedImages?: Set<string>;
  onSelectImages?: (next: Set<string>) => void;
}) {
  const getBlockName = () => {
    switch (block.type) {
      case "text":
        return "Text";
      case "gallery":
        return "Gallery";
      case "youtube":
        return "YouTube";
      case "quote":
        return "Quote";
      case "divider":
        return "Divider";
      case "newsletter":
        return "Newsletter";
      default:
        return block.type;
    }
  };

  return (
    // The block reads as plain page: no outlines. A slim header row (select,
    // type, tools) sits above the content, which runs from the left edge.
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-6 shrink-0 items-center justify-center">
          <DsCheckbox
            checked={selected}
            onCheckedChange={(checked) => onToggleSelect(checked === true)}
            aria-label={`Select ${getBlockName()} block`}
          />
        </div>
        <span className="min-w-0 flex-1 truncate text-p text-ds-fg-muted">{getBlockName()}</span>
        <div className="flex shrink-0 items-center gap-1">
        {block.type === "gallery" && (
          <LayoutSettingsPopover block={block as GalleryBlock} onUpdate={(updates) => onUpdate(updates)} />
        )}
        <DsButton
          size="small"
          iconLeft={ChevronUp}
          aria-label="Move block up"
          onClick={() => onMove("up")}
          disabled={index === 0}
        />
        <DsButton
          size="small"
          iconLeft={ChevronDown}
          aria-label="Move block down"
          onClick={() => onMove("down")}
          disabled={index === total - 1}
        />
        <DsButton
          size="small"
          iconLeft={Trash2}
          aria-label="Remove block"
          onClick={onRemove}
        />
        </div>
      </div>

      <div className="min-w-0">
        {block.type === "text" && (
          <DsRichText
            value={block.html}
            onValueChange={(html) => onUpdate({ html })}
            placeholder="Write something..."
            aria-label="Text"
          />
        )}

        {block.type === "youtube" && (
          <div className="flex flex-col gap-1">
            <DsInput
              bare
              value={block.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="Paste a YouTube link"
              aria-label="YouTube URL"
            />
            <DsInput
              bare
              value={block.caption || ""}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="Caption"
              aria-label="Caption"
              className="text-small"
            />
          </div>
        )}

        {block.type === "quote" && (
          // The same soft box as on the site.
          <div className="flex flex-col gap-3 rounded-[24px] bg-ds-surface-subtle p-5 sm:p-6">
            <DsTextarea
              bare
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Quote"
              aria-label="Quote"
              className="text-prose"
            />
            <DsInput
              bare
              value={block.attribution || ""}
              onChange={(e) => onUpdate({ attribution: e.target.value })}
              placeholder="Attribution"
              aria-label="Attribution"
              className="text-small"
            />
          </div>
        )}

        {block.type === "divider" && (
          <div className="py-2">
            <DsDivider />
          </div>
        )}

        {block.type === "newsletter" && (
          // The sign-up's words; the form itself is Parabola's and shows in the preview.
          <div className="flex flex-col gap-1">
            <DsInput
              bare
              value={block.heading || ""}
              onChange={(e) => onUpdate({ heading: e.target.value })}
              placeholder="Heading (Get new work by email)"
              aria-label="Heading"
              className="text-h2"
            />
            <DsInput
              bare
              value={block.text || ""}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="A line on what people get, and how often"
              aria-label="Text"
            />
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              <DsInput
                bare
                value={block.buttonLabel || ""}
                onChange={(e) => onUpdate({ buttonLabel: e.target.value })}
                placeholder="Button (Subscribe)"
                aria-label="Button label"
                className="text-small sm:max-w-[200px]"
              />
              <DsInput
                bare
                value={block.list || ""}
                onChange={(e) => onUpdate({ list: e.target.value })}
                placeholder="List (news)"
                aria-label="List slug"
                className="text-small sm:max-w-[200px]"
              />
              <DsInput
                bare
                value={block.source || ""}
                onChange={(e) => onUpdate({ source: e.target.value })}
                placeholder="Source (this page)"
                aria-label="Source"
                className="text-small sm:max-w-[200px]"
              />
            </div>
          </div>
        )}

        {block.type === "gallery" && (
          <GalleryBlockEditor
            block={block as GalleryBlock}
            galleryMedia={galleryMedia || []}
            onUpdate={(updates) => onUpdate(updates)}
            onOpenGalleryPicker={onOpenGalleryPicker}
            onReplaceImage={onReplaceGalleryImage}
            onUploadFiles={onUploadGalleryFiles}
            onEditMedia={onEditMedia}
            onReplaceFile={onReplaceFile}
            selectedIds={selectedImages}
            onSelectionChange={onSelectImages}
          />
        )}
      </div>
    </div>
  );
}
