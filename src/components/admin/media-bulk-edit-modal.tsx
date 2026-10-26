"use client";

import { useState, useEffect } from "react";
import {
  DsButton,
  DsDialog,
  DsDialogActions,
  DsField,
  DsInput,
  DsTextarea,
} from "@beltechi/parabola";
import type { MediaItem } from "@/lib/cms/types";

interface MediaBulkEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMedia: MediaItem[];
  onSave: (updates: Partial<MediaItem>) => Promise<void>;
}

const MULTIPLE_VALUES = "Multiple values";

/** Whether the selected items disagree on a field (tags compare as lists). */
function hasMultipleValues(items: MediaItem[], field: keyof MediaItem): boolean {
  if (items.length === 0) return false;
  const first = items[0][field];
  return !items.every((item) => {
    const value = item[field];
    if (Array.isArray(first) && Array.isArray(value)) return JSON.stringify(first) === JSON.stringify(value);
    return value === first;
  });
}

export function MediaBulkEditModal({
  open,
  onOpenChange,
  selectedMedia,
  onSave,
}: MediaBulkEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  // Track which fields were edited by the user
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  const markFieldAsEdited = (field: string) => {
    setEditedFields((prev) => new Set([...prev, field]));
  };

  // Check if field has multiple values across selected items
  // Initialize form with values or "Multiple values" placeholder
  useEffect(() => {
    if (!open || selectedMedia.length === 0) return;

    setEditedFields(new Set());

    if (hasMultipleValues(selectedMedia, "alt")) {
      setAlt("");
    } else {
      setAlt(selectedMedia[0].alt || "");
    }

    if (hasMultipleValues(selectedMedia, "title")) {
      setTitle("");
    } else {
      setTitle(selectedMedia[0].title || "");
    }

    if (hasMultipleValues(selectedMedia, "caption")) {
      setCaption("");
    } else {
      setCaption(selectedMedia[0].caption || "");
    }

    if (hasMultipleValues(selectedMedia, "description")) {
      setDescription("");
    } else {
      setDescription(selectedMedia[0].description || "");
    }

    if (hasMultipleValues(selectedMedia, "tags")) {
      setTags("");
    } else {
      const firstTags = selectedMedia[0].tags || [];
      setTags(firstTags.join(", "));
    }
  }, [open, selectedMedia]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Partial<MediaItem> = {};

      // Only include fields that the user actually edited
      if (editedFields.has("alt")) {
        updates.alt = alt.trim();
      }
      if (editedFields.has("title")) {
        updates.title = title.trim();
      }
      if (editedFields.has("caption")) {
        updates.caption = caption.trim();
      }
      if (editedFields.has("description")) {
        updates.description = description.trim();
      }
      if (editedFields.has("tags")) {
        updates.tags = tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }

      // Check if there are any updates to send
      if (Object.keys(updates).length === 0) {
        onOpenChange(false);
        return;
      }

      await onSave(updates);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save changes:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const getPlaceholder = (field: keyof MediaItem) => {
    return hasMultipleValues(selectedMedia, field) ? MULTIPLE_VALUES : "";
  };

  const count = selectedMedia.length;

  return (
    <DsDialog
      open={open}
      onOpenChange={(next) => !saving && onOpenChange(next)}
      title="Edit details"
      description={`Editing ${count} ${count === 1 ? "item" : "items"}. Only the fields you change are saved${
        count > 1 ? "; the others keep each item's own value" : ""
      }.`}
      className="max-h-[calc(100dvh-32px)] overflow-y-auto"
    >
      <div className="flex flex-col gap-4">
        <DsField label="Alternative text">
          <DsInput
            value={alt}
            onChange={(e) => {
              setAlt(e.target.value);
              markFieldAsEdited("alt");
            }}
            placeholder={getPlaceholder("alt") || "Describe this image for screen readers"}
          />
        </DsField>
        <DsField label="Title">
          <DsInput
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markFieldAsEdited("title");
            }}
            placeholder={getPlaceholder("title") || "Image title"}
          />
        </DsField>
        <DsField label="Caption">
          <DsTextarea
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value);
              markFieldAsEdited("caption");
            }}
            placeholder={getPlaceholder("caption") || "Caption displayed below the image"}
          />
        </DsField>
        <DsField label="Description">
          <DsTextarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markFieldAsEdited("description");
            }}
            placeholder={getPlaceholder("description") || "Longer description for the image"}
          />
        </DsField>
        <DsField label="Tags" description="Internal tags for organising and filtering media.">
          <DsInput
            value={tags}
            onChange={(e) => {
              setTags(e.target.value);
              markFieldAsEdited("tags");
            }}
            placeholder={getPlaceholder("tags") || "name, company, place"}
          />
        </DsField>
      </div>

      <DsDialogActions>
        <DsButton variant="primary" loading={saving} onClick={handleSave}>
          Save changes
        </DsButton>
        <DsButton disabled={saving} onClick={handleCancel}>
          Cancel
        </DsButton>
      </DsDialogActions>
    </DsDialog>
  );
}
