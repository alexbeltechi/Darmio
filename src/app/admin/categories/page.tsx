"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  GripVertical,
  MoreVertical,
  Eye,
  EyeOff,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DsEmptyState,
  DS_ACCENTS,
  DsButton,
  DsCheckbox,
  DsColourDot,
  DsDialog,
  DsDialogActions,
  DsDialogCancel,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownSeparator,
  DsDropdownTrigger,
  DsField,
  DsInput,
  DsListRow,
  DsPill,
  DsSearch,
  DsSelect,
  DsSwitch,
  DsTooltip,
  dsToast,
  useDsConfirm,
  type DsSelectOption,
} from "@beltechi/parabola";
import { AdminMenuButton } from "@/components/admin/layout";
import { CATEGORY_COLOR_PRESETS, DEFAULT_CATEGORY_COLOR } from "@/lib/cms/category-colors";
import { CATEGORY_LAYOUTS, type CategoryLayout } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 25;

interface Category {
  id: string;
  label: string;
  color: string;
  description?: string;
  order?: number;
  parentId?: string | null;
  nav?: boolean;
  headline?: string;
  layout?: CategoryLayout;
}

type VisibilityFilter = "all" | "visible" | "hidden";
type SortOption = "manual" | "a-z" | "z-a";

/** The add/edit dialog's form: `id` is set when editing. */
type CategoryForm = {
  id?: string;
  label: string;
  color: string;
  description: string;
  /** "" for top-level. */
  parentId: string;
  nav: boolean;
  headline: string;
  layout: CategoryLayout;
};

const EMPTY_FORM: CategoryForm = {
  label: "",
  color: DEFAULT_CATEGORY_COLOR,
  description: "",
  parentId: "",
  nav: true,
  headline: "",
  layout: "hero",
};

// The "Inside" picker's value for top-level: a select item can't have an empty value.
const TOP_LEVEL = "top-level";

const LAYOUT_LABELS: Record<CategoryLayout, string> = {
  hero: "Headline over the posts",
  left: "Text beside the posts",
  wall: "Posts only",
  list: "Stacked like a blog",
};

const visibilityOptions: DsSelectOption[] = [
  { value: "all", label: "All" },
  { value: "visible", label: "In the nav" },
  { value: "hidden", label: "Not in the nav" },
];

const sortOptions: DsSelectOption[] = [
  { value: "manual", label: "Manual order" },
  { value: "a-z", label: "A → Z" },
  { value: "z-a", label: "Z → A" },
];

/** The offered swatches, each with its dot; a category's own colour outside them stays pickable. */
function colourOptions(current: string): DsSelectOption[] {
  const options: DsSelectOption[] = CATEGORY_COLOR_PRESETS.map((c) => ({
    value: c.value,
    label: c.name,
    indicator: <DsColourDot color={c.value} />,
  }));
  if (!options.some((o) => o.value === current)) {
    const name = DS_ACCENTS.find((c) => c.value === current)?.name;
    options.push({ value: current, label: name ? `${name} (current)` : `Current (${current})`, indicator: <DsColourDot color={current} /> });
  }
  return options;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CategoryForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("manual");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);

  // Action loading: a category id, or "bulk"
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [confirm, confirmDialog] = useDsConfirm();

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCategories = useMemo(() => {
    let result = [...categories];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (cat) => cat.label.toLowerCase().includes(query) || cat.description?.toLowerCase().includes(query)
      );
    }

    if (visibilityFilter === "visible") {
      result = result.filter((cat) => !cat.parentId && cat.nav !== false);
    } else if (visibilityFilter === "hidden") {
      result = result.filter((cat) => cat.parentId || cat.nav === false);
    }

    if (sortOption === "a-z") {
      result.sort((a, b) => a.label.localeCompare(b.label));
    } else if (sortOption === "z-a") {
      result.sort((a, b) => b.label.localeCompare(a.label));
    }
    // "manual" keeps the stored order

    return result;
  }, [categories, searchQuery, visibilityFilter, sortOption]);

  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE);
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCategories.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCategories, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, visibilityFilter, sortOption]);

  const hasActiveFilters = visibilityFilter !== "all" || sortOption !== "manual" || searchQuery.trim() !== "";
  // Dragging only makes sense over the whole list in its stored order.
  const canReorder = sortOption === "manual" && visibilityFilter === "all" && !searchQuery.trim() && totalPages <= 1;

  const resetFilters = () => {
    setSearchQuery("");
    setVisibilityFilter("all");
    setSortOption("manual");
  };

  async function handleSave() {
    if (!form || !form.label.trim()) return;
    const { id, ...body } = form;

    setSaving(true);
    try {
      const res = await fetch(id ? `/api/admin/categories/${id}` : "/api/admin/categories", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, label: body.label.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      await fetchCategories();
      setForm(null);
      dsToast.success(id ? "Category updated" : "Category created");
    } catch (error) {
      dsToast.error(error instanceof Error ? error.message : "Failed to save the category");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(category: Category) {
    const ok = await confirm({
      title: `Delete ${category.label}?`,
      description: "Posts in it stay, without this category. This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;

    setActionLoading(category.id);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      await fetchCategories();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(category.id);
        return next;
      });
      dsToast.success("Category deleted");
    } catch (error) {
      dsToast.error(error instanceof Error ? error.message : "Failed to delete the category");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleVisibility(category: Category) {
    const newVisibility = !(category.nav ?? true);
    setActionLoading(category.id);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nav: newVisibility }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      await fetchCategories();
      dsToast.success(`${category.label} ${newVisibility ? "added to" : "taken out of"} the nav`);
    } catch (error) {
      dsToast.error(error instanceof Error ? error.message : "Failed to update visibility");
    } finally {
      setActionLoading(null);
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected =
    paginatedCategories.length > 0 && paginatedCategories.every((c) => selectedIds.has(c.id));

  const selectAll = () => setSelectedIds(new Set(paginatedCategories.map((c) => c.id)));

  async function handleBulkAction(action: "show" | "hide" | "delete") {
    const count = selectedIds.size;
    if (count === 0) return;
    const noun = count === 1 ? "category" : "categories";

    if (action === "delete") {
      const ok = await confirm({
        title: `Delete ${count} ${noun}?`,
        description: "Posts in them stay, without these categories. This can't be undone.",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
    }

    setActionLoading("bulk");
    try {
      const ids = Array.from(selectedIds);
      if (action === "delete") {
        await Promise.all(ids.map((id) => fetch(`/api/admin/categories/${id}`, { method: "DELETE" })));
      } else {
        await Promise.all(
          ids.map((id) =>
            fetch(`/api/admin/categories/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nav: action === "show" }),
            })
          )
        );
      }

      await fetchCategories();
      setSelectedIds(new Set());
      const done = { show: "added to the nav", hide: "taken out of the nav", delete: "deleted" }[action];
      dsToast.success(`${count} ${noun} ${done}`);
    } catch {
      dsToast.error("Some categories couldn't be updated");
    } finally {
      setActionLoading(null);
    }
  }

  // Drag and drop (manual order, unfiltered list only)
  function handleDragStart(index: number) {
    if (!canReorder) return;
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (!canReorder || draggedIndex === null || draggedIndex === index) return;

    const next = [...categories];
    const [dragged] = next.splice(draggedIndex, 1);
    next.splice(index, 0, dragged);
    setCategories(next);
    setDraggedIndex(index);
  }

  async function handleDragEnd() {
    if (draggedIndex === null) return;
    setDraggedIndex(null);

    setReordering(true);
    try {
      const res = await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: categories.map((c) => c.id) }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error("Failed to save order:", error);
      dsToast.error("Failed to save the new order");
      await fetchCategories();
    } finally {
      setReordering(false);
    }
  }

  const openEdit = (category: Category) =>
    setForm({
      id: category.id,
      label: category.label,
      color: category.color,
      description: category.description ?? "",
      parentId: category.parentId ?? "",
      nav: category.nav ?? true,
      headline: category.headline ?? "",
      layout: category.layout ?? "hero",
    });

  const labelOf = new Map(categories.map((c) => [c.id, c.label]));
  // Where a category can go: top-level, or inside a top-level category that
  // isn't itself. One with categories inside it stays top-level.
  const parentOptions = (form: CategoryForm): DsSelectOption[] => [
    { value: TOP_LEVEL, label: "Nothing (its own section)" },
    ...(form.id && categories.some((c) => c.parentId === form.id)
      ? []
      : categories.filter((c) => !c.parentId && c.id !== form.id).map((c) => ({ value: c.id, label: c.label }))),
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header and filters stay pinned over the list, which fades out beneath
          the Parabola nav fade (`ds-nav-fade`); clicks pass through the gradient's
          empty space to the rows under it. The bar ends 20px under the
          filters and the list starts right below it, so nothing sits under the fade at rest. */}
      <div className="pointer-events-none sticky top-0 z-20 flex flex-col ds-nav-fade pb-5 [&>*]:pointer-events-auto">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-5">
          <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">
            Categories {!loading && `(${filteredCategories.length})`}
          </h1>
          <DsButton iconLeft={Plus} onClick={() => setForm(EMPTY_FORM)}>
            Category
          </DsButton>
          <AdminMenuButton />
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 px-5">

          <DsSearch
            aria-label="Search categories"
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="min-w-0 flex-1"
          />

          {/* Below md the filters move into a dialog */}
          <DsTooltip content="Filter and sort">
            <DsButton
              iconLeft={SlidersHorizontal}
              aria-label="Filter and sort"
              pressed={hasActiveFilters}
              onClick={() => setShowFilterModal(true)}
              className="md:hidden"
            />
          </DsTooltip>

          <DsSelect
            aria-label="Nav"
            options={visibilityOptions}
            value={visibilityFilter}
            onValueChange={(value) => setVisibilityFilter(value as VisibilityFilter)}
            className="hidden w-[170px] shrink-0 md:flex"
          />
          <DsSelect
            aria-label="Sort by"
            options={sortOptions}
            value={sortOption}
            onValueChange={(value) => setSortOption(value as SortOption)}
            className="hidden w-[170px] shrink-0 md:flex"
          />

          {hasActiveFilters && (
            <DsTooltip content="Reset filters">
              <DsButton iconLeft={RotateCcw} aria-label="Reset filters" onClick={resetFilters} className="hidden md:inline-flex" />
            </DsTooltip>
          )}

          <DsDropdown>
            <DsTooltip content={selectedIds.size ? `${selectedIds.size} selected` : "Select categories"}>
              <DsDropdownTrigger asChild>
                <DsButton iconLeft={MoreVertical} aria-label="Bulk actions" loading={actionLoading === "bulk"} />
              </DsDropdownTrigger>
            </DsTooltip>
            <DsDropdownContent>
              {!allOnPageSelected && (
                <DsDropdownItem disabled={paginatedCategories.length === 0} onSelect={selectAll}>
                  Select all
                </DsDropdownItem>
              )}
              {selectedIds.size > 0 && (
                <>
                  <DsDropdownItem onSelect={() => setSelectedIds(new Set())}>Deselect all</DsDropdownItem>
                  <DsDropdownSeparator />
                  <DsDropdownItem iconLeft={Eye} meta={selectedIds.size} onSelect={() => handleBulkAction("show")}>
                    Show on homepage
                  </DsDropdownItem>
                  <DsDropdownItem iconLeft={EyeOff} meta={selectedIds.size} onSelect={() => handleBulkAction("hide")}>
                    Hide from homepage
                  </DsDropdownItem>
                  <DsDropdownSeparator />
                  <DsDropdownItem
                    tone="danger"
                    iconLeft={Trash2}
                    meta={selectedIds.size}
                    onSelect={() => handleBulkAction("delete")}
                  >
                    Delete
                  </DsDropdownItem>
                </>
              )}
            </DsDropdownContent>
          </DsDropdown>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-5 pb-5">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 aria-label="Loading categories" className="size-6 animate-spin text-ds-fg-subtle" />
          </div>
        ) : categories.length === 0 ? (
          <DsEmptyState
            action={
              <DsButton iconLeft={Plus} onClick={() => setForm(EMPTY_FORM)}>
                New category
              </DsButton>
            }
          >
            No categories yet
          </DsEmptyState>
        ) : filteredCategories.length === 0 ? (
          <DsEmptyState
            action={
              hasActiveFilters && (
                <DsButton iconLeft={RotateCcw} onClick={resetFilters}>
                  Reset filters
                </DsButton>
              )
            }
          >
            No categories match
          </DsEmptyState>
        ) : (
          <ul className={cn("flex flex-col transition-opacity", reordering && "opacity-70")}>
            {paginatedCategories.map((category, index) => {
              const inside = category.parentId ? labelOf.get(category.parentId) : undefined;
              const hidden = !inside && category.nav === false;
              return (
                <li key={category.id}>
                  <DsListRow
                    draggable={canReorder}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(canReorder && "cursor-grab active:cursor-grabbing", draggedIndex === index && "opacity-50")}
                    leading={
                      <div className="flex items-center gap-3">
                        <DsCheckbox
                          checked={selectedIds.has(category.id)}
                          onCheckedChange={() => toggleSelect(category.id)}
                          aria-label={`Select ${category.label}`}
                        />
                        {canReorder && <GripVertical aria-hidden className="size-4 text-ds-fg-subtle" />}
                        <DsColourDot color={category.color} />
                      </div>
                    }
                    title={category.label}
                    pill={hidden && <DsPill>Not in the nav</DsPill>}
                    meta={inside ? `Inside ${inside}` : category.description || undefined}
                    onOpen={() => openEdit(category)}
                    actions={
                      <DsDropdown>
                        <DsDropdownTrigger asChild>
                          <DsButton
                            variant="text"
                            iconLeft={MoreVertical}
                            aria-label={`Actions for ${category.label}`}
                            size="small"
                            loading={actionLoading === category.id}
                          />
                        </DsDropdownTrigger>
                        <DsDropdownContent>
                          <DsDropdownItem iconLeft={Pencil} onSelect={() => openEdit(category)}>
                            Edit
                          </DsDropdownItem>
                          {!inside && (
                            <DsDropdownItem iconLeft={hidden ? Eye : EyeOff} onSelect={() => handleToggleVisibility(category)}>
                              {hidden ? "Add to the nav" : "Take out of the nav"}
                            </DsDropdownItem>
                          )}
                          <DsDropdownSeparator />
                          <DsDropdownItem tone="danger" iconLeft={Trash2} onSelect={() => handleDeleteCategory(category)}>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-5">
            <DsButton
              variant="text"
              iconLeft={ChevronLeft}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                setSelectedIds(new Set());
              }}
              disabled={currentPage === 1}
            >
              Previous
            </DsButton>
            <span className="text-small text-ds-fg-subtle">
              Page {currentPage} of {totalPages}
            </span>
            <DsButton
              variant="text"
              iconRight={ChevronRight}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                setSelectedIds(new Set());
              }}
              disabled={currentPage === totalPages}
            >
              Next
            </DsButton>
          </div>
        )}
      </div>

      {/* New / edit dialog */}
      <DsDialog
        open={form !== null}
        onOpenChange={(open) => !open && !saving && setForm(null)}
        title={form?.id ? "Edit category" : "New category"}
      >
        {form && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="flex flex-col gap-4">
              <DsField label="Name" required>
                <DsInput
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Category name"
                />
              </DsField>
              <DsField label="Colour" description="The category's tile and dot on the site.">
                <DsSelect
                  options={colourOptions(form.color)}
                  value={form.color}
                  onValueChange={(color) => setForm({ ...form, color })}
                />
              </DsField>
              <DsField label="Description">
                <DsInput
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional"
                />
              </DsField>
              <DsField
                label="Inside"
                description="A category inside another rolls up into its page (Portrait inside Photography)."
              >
                <DsSelect
                  options={parentOptions(form)}
                  value={form.parentId || TOP_LEVEL}
                  onValueChange={(value) => setForm({ ...form, parentId: value === TOP_LEVEL ? "" : value })}
                />
              </DsField>
              {!form.parentId && (
                <>
                  <div className="flex items-center gap-3">
                    <label htmlFor="category-nav" className="flex-1 text-p text-ds-fg">
                      In the site&apos;s nav
                    </label>
                    <DsSwitch id="category-nav" checked={form.nav} onCheckedChange={(nav) => setForm({ ...form, nav })} />
                  </div>
                  <DsField label="Headline" description="The big line on its page. Empty uses the name.">
                    <DsInput
                      value={form.headline}
                      onChange={(e) => setForm({ ...form, headline: e.target.value })}
                      placeholder="Optional"
                    />
                  </DsField>
                  <DsField label="Page layout">
                    <DsSelect
                      options={CATEGORY_LAYOUTS.map((value) => ({ value, label: LAYOUT_LABELS[value] }))}
                      value={form.layout}
                      onValueChange={(layout) => setForm({ ...form, layout: layout as CategoryLayout })}
                    />
                  </DsField>
                </>
              )}
            </div>
            <DsDialogActions>
              <DsButton type="submit" variant="primary" loading={saving} disabled={!form.label.trim()}>
                {form.id ? "Save" : "Create category"}
              </DsButton>
              <DsDialogCancel asChild>
                <DsButton disabled={saving}>Cancel</DsButton>
              </DsDialogCancel>
            </DsDialogActions>
          </form>
        )}
      </DsDialog>

      {/* Filter dialog (below md) */}
      <DsDialog open={showFilterModal} onOpenChange={setShowFilterModal} title="Filter and sort">
        <div className="flex flex-col gap-4">
          <DsField label="Nav">
            <DsSelect
              options={visibilityOptions}
              value={visibilityFilter}
              onValueChange={(value) => setVisibilityFilter(value as VisibilityFilter)}
            />
          </DsField>
          <DsField label="Sort by">
            <DsSelect options={sortOptions} value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)} />
          </DsField>
        </div>
        <DsDialogActions>
          <DsDialogCancel asChild>
            <DsButton variant="primary">Done</DsButton>
          </DsDialogCancel>
          {hasActiveFilters && (
            <DsButton variant="text" iconLeft={RotateCcw} onClick={resetFilters} className="h-9">
              Reset filters
            </DsButton>
          )}
        </DsDialogActions>
      </DsDialog>

      {confirmDialog}
    </div>
  );
}
