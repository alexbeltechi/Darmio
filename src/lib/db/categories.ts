/**
 * MongoDB Categories Storage
 * 
 * Direct MongoDB operations for categories.
 * Each category is stored as an individual document (WordPress-style).
 */

import { getDb, Collections, withoutId } from "@/lib/db/mongodb";
import { normalizeCategoryColor, toStoredCategoryColor } from "@/lib/cms/category-colors";
import { CATEGORY_LAYOUTS, type CategoryLayout } from "@/lib/cms/types";
import { slugify } from "@/lib/slug";

export interface Category {
  id: string;
  slug: string;
  name: string;
  label: string; // For backward compatibility
  color: string;
  description?: string;
  /** The top-level category this one sits inside; none means it's top-level (see category-groups.ts). */
  parentId?: string | null;
  image?: string;
  order?: number;
  /** Top-level only: in the site's nav. Defaults to true, so a new section shows up by itself. */
  nav?: boolean;
  /** Top-level only: the big line on its page; the label when empty. */
  headline?: string;
  /** Top-level only: how its page sets the intro. */
  layout?: CategoryLayout;
  seo?: {
    title?: string;
    description?: string;
  };
  /** Extensibility bucket, as on entries: `{ example: true, seed }` for an example site's categories. */
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * A stored category as the app sees it: its colour as the current swatch (see
 * normalizeCategoryColor), and `nav` read from the field it replaced.
 */
function withColor(category: Category & { showOnHomepage?: boolean }): Category {
  const { showOnHomepage, ...rest } = category;
  return { ...rest, nav: rest.nav ?? showOnHomepage ?? true, color: normalizeCategoryColor(rest.color) };
}

/** Throws unless `layout` is one of CATEGORY_LAYOUTS (or empty, for the default). */
export function parseCategoryLayout(value: unknown): CategoryLayout | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (!CATEGORY_LAYOUTS.includes(value as CategoryLayout)) {
    throw new Error(`layout must be one of: ${CATEGORY_LAYOUTS.join(", ")}`);
  }
  return value as CategoryLayout;
}

/** Throws unless `parentId` names a top-level category other than `id`, and `id` has nothing inside it. */
async function checkParent(id: string | undefined, parentId: string | null | undefined) {
  if (!parentId) return;
  if (parentId === id) throw new Error("A category can't sit inside itself");
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);
  const parent = await collection.findOne({ id: parentId });
  if (!parent) throw new Error(`No category "${parentId}" to put it inside`);
  if (parent.parentId) throw new Error(`"${parent.label}" is inside another category; categories go one level deep`);
  if (id && (await collection.findOne({ parentId: id }))) {
    throw new Error("This category has categories inside it, so it has to stay top-level");
  }
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  // Exclude old storage adapter documents
  const docs = await collection
    .find({ id: { $exists: true } })
    .sort({ order: 1, name: 1 })
    .toArray();

  return docs.map((doc) => {
    return withColor(withoutId<Category>(doc));
  });
}

export async function getCategory(id: string): Promise<Category | null> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  const doc = await collection.findOne({ id });
  if (!doc) return null;

  return withColor(withoutId<Category>(doc));
}

export async function createCategory(
  data: Omit<Category, "id" | "slug" | "createdAt" | "updatedAt"> & {
    id?: string;
    slug?: string;
  }
): Promise<Category> {
  await checkParent(data.id, data.parentId);
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  const now = new Date().toISOString();

  // Generate ID/slug from label/name if not provided
  const baseName = data.name || data.label;
  const id = data.id || crypto.randomUUID();
  const slug = data.slug || slugify(baseName);

  const existing = await collection.findOne({ 
    $or: [{ id }, { slug }] 
  });
  if (existing) {
    throw new Error(`Category with id "${id}" or slug "${slug}" already exists`);
  }

  const maxOrder = await collection
    .find({})
    .sort({ order: -1 })
    .limit(1)
    .toArray();
  const nextOrder = maxOrder.length > 0 ? (maxOrder[0].order || 0) + 1 : 0;

  const category: Category = {
    id,
    slug,
    name: data.name || data.label,
    label: data.label || data.name || baseName,
    color: toStoredCategoryColor(data.color) ?? data.color,
    description: data.description,
    parentId: data.parentId || null,
    image: data.image,
    order: data.order ?? nextOrder,
    nav: data.nav ?? true,
    headline: data.headline,
    layout: data.layout,
    seo: data.seo,
    ...(data.metadata ? { metadata: data.metadata } : {}),
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(category as unknown as Record<string, unknown>);

  return category;
}

export async function updateCategory(
  id: string,
  updates: Partial<Omit<Category, "id" | "createdAt">>
): Promise<Category> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  const existing = await collection.findOne({ id });
  if (!existing) {
    throw new Error(`Category "${id}" not found`);
  }
  if (updates.parentId !== undefined) await checkParent(id, updates.parentId);

  // Fields left out of the update stay as they are (undefined would be stored as null).
  const given = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  const updatedData = {
    ...given,
    ...(updates.color !== undefined && { color: toStoredCategoryColor(updates.color) }),
    // Keep name and label in sync
    name: updates.name || updates.label || existing.name,
    label: updates.label || updates.name || existing.label,
    updatedAt: new Date().toISOString(),
  };

  await collection.updateOne({ id }, { $set: updatedData });

  const doc = await collection.findOne({ id });
  if (!doc) {
    throw new Error(`Category "${id}" not found after update`);
  }

  return withColor(withoutId<Category>(doc));
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  const result = await collection.deleteOne({ id });
  if (result.deletedCount === 0) {
    throw new Error(`Category "${id}" not found`);
  }
}

export async function reorderCategories(ids: string[]): Promise<Category[]> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  const now = new Date().toISOString();

  const updates = ids.map((id, index) => ({
    updateOne: {
      filter: { id },
      update: { $set: { order: index, updatedAt: now } },
    },
  }));

  if (updates.length > 0) {
    await collection.bulkWrite(updates);
  }

  return listCategories();
}

