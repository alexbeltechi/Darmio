/**
 * Vercel Blob Storage
 * 
 * Handles file storage using Vercel Blob when the project is connected to a
 * Blob store: either BLOB_READ_WRITE_TOKEN (older connections), or
 * BLOB_STORE_ID with Vercel's own sign-in token (newer ones; the library
 * reads VERCEL_OIDC_TOKEN itself). Falls back to local files in development.
 */

import { put, del } from "@vercel/blob";

/**
 * Check if Vercel Blob storage should be used
 */
export function shouldUseBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

/**
 * On Vercel there is no lasting disk, so uploads without a Blob store can't
 * work: say so plainly instead of failing on a local write.
 */
export function assertStorageAvailable(): void {
  if (!shouldUseBlob() && process.env.VERCEL) {
    throw new Error("Image storage isn't connected yet. Ask your AI to connect Vercel Blob: INSTALL.md, step 3.");
  }
}

export async function uploadToBlob(
  buffer: Buffer,
  filename: string,
  options: {
    contentType: string;
    folder?: string;
  }
): Promise<{ url: string; pathname: string }> {
  const pathname = options.folder
    ? `${options.folder}/${filename}`
    : filename;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: options.contentType,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
  };
}

export async function deleteFromBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error(`Failed to delete from blob: ${url}`, error);
    // Don't throw - file might already be deleted
  }
}

export async function deleteMultipleFromBlob(urls: string[]): Promise<void> {
  try {
    await del(urls);
  } catch (error) {
    console.error(`Failed to delete multiple files from blob`, error);
    // Don't throw - files might already be deleted
  }
}
