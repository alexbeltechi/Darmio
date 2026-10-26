"use client";

import { useEffect, useState } from "react";
import { DsMultiSelect, dsToast } from "@beltechi/parabola";
import { CATEGORY_COLOR_VALUES } from "@/lib/cms/category-colors";
import { slugify } from "@/lib/slug";

interface Category {
  id: string;
  label: string;
  color: string;
}

interface CategoryInputProps {
  /** Selected category ids, in order. */
  value: string[];
  onChange: (categories: string[]) => void;
  placeholder?: string;
}

// A random accent for new categories (still used by the site).
function generateRandomColor(): string {
  return CATEGORY_COLOR_VALUES[Math.floor(Math.random() * CATEGORY_COLOR_VALUES.length)];
}

/**
 * The post editor's categories field: a Parabola DsMultiSelect over the
 * categories from the API, with "Create" for new ones. Pills reorder by
 * dragging their grip. Put it inside a DsField for the label.
 */
export function CategoryInput({ value, onChange, placeholder = "Add categories" }: CategoryInputProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.data || []))
      .catch((error) => console.error("Failed to fetch categories:", error));
  }, []);

  const createCategory = async (label: string) => {
    const id = slugify(label);
    if (!id) return;

    if (categories.some((c) => c.id === id)) {
      if (!value.includes(id)) onChange([...value, id]);
      return;
    }

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, label: label.trim(), color: generateRandomColor() }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create category");
      }
      const created: Category = (await res.json()).data;
      setCategories((prev) => [...prev, created]);
      onChange([...value, created.id]);
    } catch (error) {
      console.error("Failed to create category:", error);
      dsToast("Couldn't create category", { description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <DsMultiSelect
      options={categories.map((c) => ({ value: c.id, label: c.label }))}
      value={value}
      onValueChange={onChange}
      onCreate={createCategory}
      placeholder={placeholder}
    />
  );
}
