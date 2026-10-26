/**
 * Media Management
 * 
 * Handles media uploads and management.
 * - Files: Vercel Blob (production) or local filesystem (development)
 * - Metadata: Direct MongoDB storage (WordPress-style - one document per media item)
 */

import fs from "fs/promises";
import path from "path";
import type { MediaItem, ImageVariant, UploadMetadata } from "./types";
import {
  sanitizeFilename,
  generateShortId,
  generateFileHash,
  generateSHA256,
  makeRenditions,
  generateFingerprint,
  buildVariantFilename,
  isProcessableImage,
  getImageDimensions,
  generateBlurPlaceholder,
  DEFAULT_IMAGE_QUALITY,
} from "./image-processing";
import { getSiteSettings } from "@/lib/db/settings";
import { extractVideoThumbnail, getVideoMetadata } from "./video-processing";
import { listEntries, updateEntry } from "@/lib/db/entries";
import { 
  shouldUseBlob,
  assertStorageAvailable,
  uploadToBlob, 
  deleteFromBlob,
  deleteMultipleFromBlob 
} from "./blob-storage";

// Direct MongoDB media operations (WordPress-style)
import * as mediaDb from "@/lib/db/media";

// Local directories (for development)
const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
const ORIGINALS_DIR = path.join(UPLOADS_DIR, "originals");
const VARIANTS_DIR = path.join(UPLOADS_DIR, "variants");

/**
 * Ensure local directories exist (for development)
 */
async function ensureLocalDirs(): Promise<void> {
  if (!shouldUseBlob()) {
    await fs.mkdir(ORIGINALS_DIR, { recursive: true });
    await fs.mkdir(VARIANTS_DIR, { recursive: true });
  }
}

/**
 * Save file to storage (local or Blob)
 */
async function saveFile(
  buffer: Buffer,
  filename: string,
  folder: "originals" | "variants" | "",
  mime: string
): Promise<{ path: string; url: string }> {
  assertStorageAvailable();
  if (shouldUseBlob()) {
    const blobFolder = folder ? `uploads/${folder}` : "uploads";
    const result = await uploadToBlob(buffer, filename, {
      contentType: mime,
      folder: blobFolder,
    });
    return {
      path: result.pathname,
      url: result.url,
    };
  } else {
    let dir: string;
    let urlPath: string;
    
    if (folder === "originals") {
      dir = ORIGINALS_DIR;
      urlPath = `/uploads/originals/${filename}`;
    } else if (folder === "variants") {
      dir = VARIANTS_DIR;
      urlPath = `/uploads/variants/${filename}`;
    } else {
      dir = UPLOADS_DIR;
      urlPath = `/uploads/${filename}`;
    }
    
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buffer);
    
    return {
      path: filePath,
      url: urlPath,
    };
  }
}

/**
 * Delete file from storage (local or Blob)
 */
async function deleteFile(urlOrPath: string): Promise<void> {
  if (shouldUseBlob()) {
    // Delete from Vercel Blob (needs full URL)
    if (urlOrPath.startsWith("http")) {
      await deleteFromBlob(urlOrPath);
    }
  } else {
    try {
      if (urlOrPath.startsWith("/uploads/")) {
        urlOrPath = path.join(PUBLIC_DIR, urlOrPath);
      }
      await fs.unlink(urlOrPath);
    } catch {
      // File might already be deleted
    }
  }
}

/**
 * List all media items (direct MongoDB query)
 */
export async function listMedia(options: {
  limit?: number;
  offset?: number;
  mime?: string;
} = {}): Promise<{ items: MediaItem[]; total: number }> {
  return mediaDb.listMedia({
    limit: options.limit,
    offset: options.offset,
    mime: options.mime,
    // Newest uploads first, as in any media library; createdAt may be backdated.
    sortBy: "uploadedAt",
    sortDir: "desc",
  });
}

/**
 * Get a single media item by ID (direct MongoDB query)
 */
export async function getMedia(id: string): Promise<MediaItem | null> {
  return mediaDb.getMediaById(id);
}

/**
 * Get multiple media items by IDs (direct MongoDB query)
 */
export async function getMediaByIds(ids: string[]): Promise<MediaItem[]> {
  return mediaDb.getMediaByIds(ids);
}

/**
 * Get the appropriate extension for a mime type
 */
function getExtension(mime: string, originalExt: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
  };
  return mimeToExt[mime] || originalExt;
}

/**
 * Upload a new media file with image optimization
 */
export async function uploadMedia(
  file: Buffer,
  originalName: string,
  mime: string,
  meta: UploadMetadata = {}
): Promise<{ item?: MediaItem; error?: string; deduped?: boolean }> {
  await ensureLocalDirs();

  // Re-uploading identical bytes returns the existing item rather than a duplicate,
  // which is what makes an ingest run safe to repeat.
  const existing = await mediaDb.getMediaBySha256(generateSHA256(file));
  if (existing) {
    return { item: existing, deduped: true };
  }

  // Metadata common to both the processed-image and raw-file paths below
  const descriptive = {
    alt: meta.alt ?? "",
    caption: meta.caption,
    description: meta.description,
    credit: meta.credit,
    tags: meta.tags,
    ...(meta.keywords?.length
      ? { keywords: meta.keywords, keywordsFrom: { by: meta.keywordsBy || "agent", at: new Date().toISOString() } }
      : {}),
    createdAt: meta.capturedAt || new Date().toISOString(),
    uploadedAt: new Date().toISOString(),
    source: meta.source,
  };

  const id = crypto.randomUUID();
  const originalExt = path.extname(originalName);
  const ext = getExtension(mime, originalExt);

  // Check if this is an image we can process
  const canProcess = isProcessableImage(mime);

  if (canProcess) {
    try {
      const quality = await getSiteSettings()
        .then((settings) => settings.imageQuality)
        .catch(() => DEFAULT_IMAGE_QUALITY);
      const { renditions, fallback } = await makeRenditions(file, quality);

      const baseFilename = sanitizeFilename(originalName) || "image";
      const shortId = generateShortId();
      const largest = renditions[renditions.length - 1];

      // The largest rendition is the primary file; the rest sit in variants/.
      const saved: ImageVariant[] = [];
      for (const r of renditions) {
        const isLargest = r === largest;
        const filename = buildVariantFilename(baseFilename, shortId, isLargest ? null : `${r.width}w`, ".avif");
        const result = await saveFile(r.buffer, filename, isLargest ? "" : "variants", "image/avif");
        saved.push({ filename, path: result.path, url: result.url, width: r.width, height: r.height, size: r.buffer.length });
      }

      const fallbackExt = fallback.format === "png" ? ".png" : ".jpg";
      const fallbackMime = fallback.format === "png" ? "image/png" : "image/jpeg";
      const fallbackFilename = buildVariantFilename(baseFilename, shortId, "fallback", fallbackExt);
      const fallbackResult = await saveFile(fallback.buffer, fallbackFilename, "variants", fallbackMime);

      const primary = saved[saved.length - 1];
      // Nearest rendition to a width, for the older variant fields.
      const nearest = (width: number) =>
        saved.reduce((best, v) => (Math.abs(v.width - width) < Math.abs(best.width - width) ? v : best));

      const item: MediaItem = {
        id,
        filename: primary.filename,
        originalName,
        slug: `${baseFilename}-${shortId}`,
        path: primary.path,
        url: primary.url,
        mime: "image/avif",
        size: primary.size,
        width: primary.width,
        height: primary.height,
        renditions: saved,
        fallback: {
          filename: fallbackFilename,
          path: fallbackResult.path,
          url: fallbackResult.url,
          width: fallback.width,
          height: fallback.height,
          size: fallback.buffer.length,
        },
        variants: { display: primary, medium: nearest(1280), thumb: nearest(640) },
        activeVariant: "display",
        title: meta.title || sanitizeFilename(originalName).replace(/-/g, " "),
        ...descriptive,
        fingerprint: await generateFingerprint(file),
        hash: generateFileHash(file),
        sha256: generateSHA256(file), // Canonical hash for export/migration integrity
        storageProvider: shouldUseBlob() ? "vercel_blob" : "local",
        blurDataURL: await generateBlurPlaceholder(file), // Tiny placeholder for instant loading
      };

      await mediaDb.createMedia(item);

      return { item };
    } catch (error) {
      console.error("Image processing error:", error);
      // Fall through to non-processed upload
    }
  }

  // Non-image or failed processing: save without variants
  const sanitizedName = sanitizeFilename(originalName) || "file";
  const shortId = generateShortId();
  const filename = buildVariantFilename(sanitizedName, shortId, null, ext);
  
  const fileResult = await saveFile(file, filename, "", mime);

  const dimensions = await getImageDimensions(file);

  // Check if this is a video and generate thumbnail
  const isVideo = mime.startsWith("video/");
  let poster: MediaItem["poster"] = undefined;
  let videoMetadata: { width: number; height: number; duration: number } | undefined;

  if (isVideo) {
    try {
      // Get video metadata (dimensions, duration)
      videoMetadata = await getVideoMetadata(file) || undefined;
      
      const thumbnail = await extractVideoThumbnail(file, {
        timestamp: 0.5, // 0.5 seconds in to avoid black frames
        maxWidth: 768,
        quality: 5,
      });
      
      if (thumbnail) {
        const posterFilename = buildVariantFilename(sanitizedName, shortId, "poster", ".jpg");
        const posterResult = await saveFile(thumbnail.buffer, posterFilename, "variants", "image/jpeg");
        
        poster = {
          url: posterResult.url,
          width: thumbnail.width,
          height: thumbnail.height,
        };
      }
    } catch (error) {
      console.error("Video thumbnail extraction failed:", error);
      // Continue without poster - not a critical error
    }
  }

  const item: MediaItem = {
    id,
    filename,
    originalName,
    slug: `${sanitizedName}-${shortId}`,
    path: fileResult.path,
    url: fileResult.url,
    mime,
    size: file.length,
    width: isVideo ? videoMetadata?.width : dimensions?.width,
    height: isVideo ? videoMetadata?.height : dimensions?.height,
    duration: isVideo ? videoMetadata?.duration : undefined,
    original: {
      filename,
      path: fileResult.path,
      url: fileResult.url,
      width: (isVideo ? videoMetadata?.width : dimensions?.width) || 0,
      height: (isVideo ? videoMetadata?.height : dimensions?.height) || 0,
      size: file.length,
    },
    poster,
    activeVariant: "original",
    title: meta.title || sanitizedName.replace(/-/g, " "),
    ...descriptive,
    hash: generateFileHash(file),
    sha256: generateSHA256(file), // Canonical hash for export/migration integrity
    storageProvider: shouldUseBlob() ? "vercel_blob" : "local",
  };

  // Save to MongoDB (direct document insertion)
  await mediaDb.createMedia(item);

  return { item };
}

/**
 * Update media metadata (direct MongoDB update)
 */
export async function updateMedia(
  id: string,
  updates: {
    alt?: string;
    title?: string;
    caption?: string;
    description?: string;
    activeVariant?: MediaItem["activeVariant"];
    tags?: string[];
    /** Replaces them; an empty list clears them and their attribution. */
    keywords?: string[];
    keywordsBy?: string;
  }
): Promise<{ item?: MediaItem; error?: string }> {
  const item = await mediaDb.getMediaById(id);
  if (!item) {
    return { error: "Media not found" };
  }

  const mediaUpdates: Partial<MediaItem> = {};

  if (updates.alt !== undefined) mediaUpdates.alt = updates.alt;
  if (updates.title !== undefined) mediaUpdates.title = updates.title;
  if (updates.caption !== undefined) mediaUpdates.caption = updates.caption;
  if (updates.description !== undefined) mediaUpdates.description = updates.description;
  if (updates.tags !== undefined) mediaUpdates.tags = updates.tags;
  if (updates.keywords !== undefined) {
    mediaUpdates.keywords = updates.keywords;
    mediaUpdates.keywordsFrom = updates.keywords.length
      ? { by: updates.keywordsBy || "agent", at: new Date().toISOString() }
      : undefined;
  }

  if (updates.activeVariant !== undefined && updates.activeVariant !== item.activeVariant) {
    // IMPORTANT: Before changing activeVariant, preserve current display values
    // if variants.display doesn't exist yet (for old uploads)
    if (item.activeVariant === "display" && !item.variants?.display && item.width && item.height && item.size) {
      if (!item.variants) item.variants = {};
      item.variants.display = {
        filename: item.filename,
        path: item.path,
        url: item.url,
        width: item.width,
        height: item.height,
        size: item.size,
      };
      mediaUpdates.variants = item.variants;
    }

    mediaUpdates.activeVariant = updates.activeVariant;

    if (updates.activeVariant === "original" && item.original) {
      mediaUpdates.url = item.original.url;
      mediaUpdates.path = item.original.path;
      if (item.original.width !== undefined) mediaUpdates.width = item.original.width;
      if (item.original.height !== undefined) mediaUpdates.height = item.original.height;
      if (item.original.size !== undefined) mediaUpdates.size = item.original.size;
    } else if (updates.activeVariant !== "original") {
      const variantKey = updates.activeVariant as "display" | "medium" | "thumb";
      const variant = item.variants?.[variantKey];
      if (variant) {
        mediaUpdates.url = variant.url;
        mediaUpdates.path = variant.path;
        mediaUpdates.width = variant.width;
        mediaUpdates.height = variant.height;
        mediaUpdates.size = variant.size;
      }
    }
  }

  const updatedItem = await mediaDb.updateMedia(id, mediaUpdates);
  
  if (!updatedItem) {
    return { error: "Failed to update media" };
  }

  return { item: updatedItem };
}

/**
 * Delete a media item and all its variants
 */
export async function deleteMedia(
  id: string
): Promise<{ success: boolean; error?: string; updatedEntries?: number }> {
  const item = await mediaDb.getMediaById(id);

  if (!item) {
    return { success: false, error: "Media not found" };
  }

  // First, clean up all references to this media in posts
  const { updatedCount } = await removeMediaReferences(id);

  const filesToDelete: string[] = [];

  // For Blob storage, we need URLs; for local, we need paths
  const useUrl = shouldUseBlob();

  if (item.original) {
    filesToDelete.push(useUrl ? item.original.url : item.original.path);
  }

  // Renditions, the fallback and the variants (which, for newer uploads,
  // point at renditions: the Set below drops the repeats)
  for (const variant of [
    ...(item.renditions ?? []),
    item.fallback,
    ...Object.values(item.variants ?? {}),
  ]) {
    if (variant) {
      filesToDelete.push(useUrl ? variant.url : variant.path);
    }
  }

  const primaryFile = useUrl ? item.url : item.path;
  if (primaryFile) {
    filesToDelete.push(primaryFile);
  }

  if (item.poster?.url) {
    filesToDelete.push(item.poster.url);
  }

  if (shouldUseBlob()) {
    const blobUrls = [...new Set(filesToDelete)].filter((f) => f.startsWith("http"));
    if (blobUrls.length > 0) {
      await deleteMultipleFromBlob(blobUrls);
    }
  } else {
    for (const filePath of new Set(filesToDelete)) {
      await deleteFile(filePath);
    }
  }

  await mediaDb.deleteMedia(id);

  return { success: true, updatedEntries: updatedCount };
}

type PostMediaData = {
  previewImage?: string;
  content?: Array<{ type: string; mediaIds?: string[]; mediaId?: string }>;
};

/**
 * Replace media references in all posts (preview image + content blocks).
 * Used when replacing an image to keep it in place everywhere it's used.
 */
export async function replaceMediaReferences(
  oldMediaId: string,
  newMediaId: string
): Promise<{ updatedCount: number }> {
  let updatedCount = 0;

  const { entries: posts } = await listEntries("posts");
  for (const post of posts) {
    // Unpublished edits point at media too, and must follow the swap.
    const versions = [post.data, post.pendingData].filter(Boolean) as PostMediaData[];
    let needsUpdate = false;

    for (const data of versions) {
      if (data.previewImage === oldMediaId) {
        data.previewImage = newMediaId;
        needsUpdate = true;
      }

      for (const block of data.content || []) {
        const index = block.mediaIds?.indexOf(oldMediaId) ?? -1;
        if (block.mediaIds && index !== -1) {
          block.mediaIds[index] = newMediaId;
          needsUpdate = true;
        }
        if (block.mediaId === oldMediaId) {
          block.mediaId = newMediaId;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      await updateEntry("posts", post.slug, {
        data: post.data as Record<string, unknown>,
        pendingData: post.pendingData as Record<string, unknown> | undefined,
      });
      updatedCount++;
    }
  }

  return { updatedCount };
}

/**
 * Remove media references from all posts (preview image + content blocks).
 * Used when deleting media so no post points at a missing file.
 */
export async function removeMediaReferences(
  mediaId: string
): Promise<{ updatedCount: number }> {
  let updatedCount = 0;

  const { entries: posts } = await listEntries("posts");
  for (const post of posts) {
    // Unpublished edits point at media too, so they lose it as well.
    const versions = [post.data, post.pendingData].filter(Boolean) as PostMediaData[];
    let needsUpdate = false;

    for (const data of versions) {
      // Dropping the override lets the preview fall back to the first gallery item.
      if (data.previewImage === mediaId) {
        data.previewImage = undefined;
        needsUpdate = true;
      }

      for (const block of data.content || []) {
        if (block.mediaIds?.includes(mediaId)) {
          block.mediaIds = block.mediaIds.filter((id) => id !== mediaId);
          needsUpdate = true;
        }
        if (block.mediaId === mediaId) {
          block.mediaId = undefined;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      await updateEntry("posts", post.slug, {
        data: post.data as Record<string, unknown>,
        pendingData: post.pendingData as Record<string, unknown> | undefined,
      });
      updatedCount++;
    }
  }

  return { updatedCount };
}
