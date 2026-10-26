"use client";

import { useEffect, useState } from "react";
import { DsButton, DsDatePicker, DsDialog, DsDialogActions, DsField, DsInput } from "@beltechi/parabola";
import { CategoryInput } from "@/components/admin/category-input";
import type { Entry } from "@/lib/cms/types";

/** The post fields that can be set across several posts at once. */
export type PostBulkUpdates = {
  title?: string;
  categories?: string[];
  date?: string;
  tags?: string;
};

type Field = keyof PostBulkUpdates;

const MULTIPLE_VALUES = "Multiple values";

const read = (entry: Entry, field: Field): unknown => {
  const value = entry.data[field];
  if (field === "categories") return Array.isArray(value) ? value : [];
  return value ?? "";
};

/** True when the selected posts don't all share one value for the field. */
const differs = (entries: Entry[], field: Field) => {
  if (entries.length < 2) return false;
  const first = JSON.stringify(read(entries[0], field));
  return entries.some((entry) => JSON.stringify(read(entry, field)) !== first);
};

/**
 * Edit title, categories, date and tags across the selected posts, like the
 * media library's bulk edit. A field the posts share starts filled in; one
 * they differ on starts empty with "Multiple values" as its placeholder.
 * Only the fields you touch are saved, so the rest keep each post's own value.
 */
export function PostBulkEditModal({
  open,
  onOpenChange,
  selectedEntries,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEntries: Entry[];
  onSave: (updates: PostBulkUpdates) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [tags, setTags] = useState("");
  const [edited, setEdited] = useState<Set<Field>>(new Set());
  const [mixed, setMixed] = useState<Set<Field>>(new Set());

  // Fill the form each time it opens, from what the selected posts share.
  useEffect(() => {
    if (!open || selectedEntries.length === 0) return;
    const fields: Field[] = ["title", "categories", "date", "tags"];
    const nextMixed = new Set(fields.filter((field) => differs(selectedEntries, field)));
    const first = selectedEntries[0];
    setMixed(nextMixed);
    setEdited(new Set());
    setTitle(nextMixed.has("title") ? "" : String(read(first, "title")));
    setCategories(nextMixed.has("categories") ? [] : (read(first, "categories") as string[]));
    const firstDate = read(first, "date");
    setDate(nextMixed.has("date") || !firstDate ? null : new Date(String(firstDate)));
    setTags(nextMixed.has("tags") ? "" : String(read(first, "tags")));
  }, [open, selectedEntries]);

  const touch = (field: Field) => setEdited((prev) => new Set(prev).add(field));
  const placeholder = (field: Field, fallback: string) => (mixed.has(field) ? MULTIPLE_VALUES : fallback);

  const handleSave = async () => {
    const updates: PostBulkUpdates = {};
    if (edited.has("title") && title.trim()) updates.title = title.trim();
    if (edited.has("categories")) updates.categories = categories;
    if (edited.has("date") && date) updates.date = date.toISOString();
    if (edited.has("tags")) updates.tags = tags.trim();

    if (Object.keys(updates).length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(updates);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const count = selectedEntries.length;

  return (
    <DsDialog
      open={open}
      onOpenChange={(next) => !saving && onOpenChange(next)}
      title="Edit posts"
      description={`Editing ${count} ${count === 1 ? "post" : "posts"}. Only the fields you change are saved${
        count > 1 ? "; the others keep each post's own value" : ""
      }.`}
      className="max-h-[calc(100dvh-32px)] overflow-y-auto"
    >
      <div className="flex flex-col gap-4">
        <DsField label="Title">
          <DsInput
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              touch("title");
            }}
            placeholder={placeholder("title", "Post title")}
          />
        </DsField>

        <DsField label="Categories" description={mixed.has("categories") ? "Replaces each post's categories." : undefined}>
          <CategoryInput
            value={categories}
            onChange={(next) => {
              setCategories(next);
              touch("categories");
            }}
            placeholder={placeholder("categories", "Add categories")}
          />
        </DsField>

        <DsField label="Publishing date">
          <DsDatePicker
            value={date}
            onValueChange={(next) => {
              setDate(next);
              touch("date");
            }}
            placeholder={placeholder("date", "Select date")}
          />
        </DsField>

        <DsField label="Tags">
          <DsInput
            value={tags}
            onChange={(e) => {
              setTags(e.target.value);
              touch("tags");
            }}
            placeholder={placeholder("tags", "Add tags, separated by commas")}
          />
        </DsField>
      </div>

      <DsDialogActions>
        <DsButton variant="primary" loading={saving} onClick={handleSave}>
          Save changes
        </DsButton>
        <DsButton disabled={saving} onClick={() => onOpenChange(false)}>
          Cancel
        </DsButton>
      </DsDialogActions>
    </DsDialog>
  );
}
