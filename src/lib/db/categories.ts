/**
 * MongoDB Categories Storage
 * 
 * Direct MongoDB operations for categories.
 * Each category is stored as an individual document (WordPress-style).
 */

import { getDb, Collections, withoutId } from "@/lib/db/mongodb";
import { normalizeCategoryColor, toStoredCategoryColor } from "@/lib/cms/category-colors";
import { slugify } from "@/lib/slug";

export interface Category {
  id: string;
  slug: string;
  name: string;
  label: string; // For backward compatibility
  color: string;
  description?: string;
  parentId?: string; // For hierarchical categories (future)
  image?: string;
  order?: number;
  showOnHomepage?: boolean; // Whether to show in homepage category tabs
  seo?: {
    title?: string;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/** Draw a stored colour as its current swatch (see normalizeCategoryColor). */
function withColor(category: Category): Category {
  return { ...category, color: normalizeCategoryColor(category.color) };
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
    parentId: data.parentId,
    image: data.image,
    order: data.order ?? nextOrder,
    showOnHomepage: data.showOnHomepage ?? true,
    seo: data.seo,
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

  const updatedData = {
    ...updates,
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

