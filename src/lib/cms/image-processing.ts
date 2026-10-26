import sharp from "sharp";
import crypto from "crypto";
import path from "path";
import { slugify } from "@/lib/slug";

/**
 * Image renditions, made once at upload (decisions 2026-10-08): AVIF at a few
 * fixed widths, the largest at most 2560px on its long edge, plus one JPEG
 * (or PNG, for transparency) for browsers without AVIF. Pages offer the
 * renditions as a srcset and the browser picks; nothing is resized on request.
 */
export const RENDITION_WIDTHS = [640, 1280, 1920] as const;
export const MAX_EDGE = 2560;
/** A smaller width this close to the largest adds a file without saving any bytes, so it's skipped. */
const NEAR_LARGEST = 0.85;
const FALLBACK_WIDTH = 1280;
// Seen only by the few browsers without AVIF, so it's kept small.
const FALLBACK_JPEG_QUALITY = 75;
/** AVIF quality when Settings has none. Going down later is possible from the stored copy; going up needs the original. */
export const DEFAULT_IMAGE_QUALITY = 70;

/** A file's name without its extension, as a slug of at most 100 characters: "My Photo (2023).JPG" → "my-photo-2023". */
export function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename);
  return slugify(filename.slice(0, filename.length - ext.length)).slice(0, 100).replace(/-+$/, "");
}

/**
 * Generate a short unique suffix (4 chars)
 */
export function generateShortId(): string {
  return crypto.randomBytes(2).toString("hex");
}

/**
 * Generate MD5 hash of file content for deduplication
 */
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash("md5").update(buffer).digest("hex");
}

/**
 * Generate SHA256 hash for integrity verification and content-addressable identity
 * Used for export/migration to verify file integrity
 */
export function generateSHA256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
  } catch {
    // Not an image or corrupted
  }
  return null;
}

/**
 * Whether the upload is turned into renditions. GIFs are kept as they are, so
 * animation survives; anything else unknown is stored as uploaded.
 */
export function isProcessableImage(mime: string): boolean {
  return ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"].includes(mime);
}

export interface Rendition {
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Make an upload's renditions: AVIF at each width up to the largest (the
 * image itself, fitted inside 2560px, never enlarged), and the fallback. The
 * camera's orientation is applied first, so phone photos stand the right way
 * up. The source is decoded once; every rendition is cut from that copy.
 */
export async function makeRenditions(
  buffer: Buffer,
  quality: number = DEFAULT_IMAGE_QUALITY
): Promise<{ renditions: Rendition[]; fallback: Rendition & { format: "jpeg" | "png" } }> {
  const { data, info } = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = { raw: { width: info.width, height: info.height, channels: info.channels } };
  const hasAlpha = info.channels === 4 && (await sharp(data, raw).stats()).isOpaque === false;

  const at = (width: number) => sharp(data, raw).resize(width, undefined, { withoutEnlargement: true });
  const sized = async (pipeline: sharp.Sharp) => {
    const { data: out, info: o } = await pipeline.toBuffer({ resolveWithObject: true });
    return { buffer: out, width: o.width, height: o.height };
  };

  const widths = [
    ...RENDITION_WIDTHS.filter((w) => w < info.width * NEAR_LARGEST),
    info.width,
  ];
  const renditions: Rendition[] = [];
  for (const width of widths) {
    // Effort 3: as small as the default 4 on photos, about five times faster.
    renditions.push(await sized(at(width).avif({ quality, effort: 3 })));
  }

  const fallbackWidth = Math.min(FALLBACK_WIDTH, info.width);
  const fallback = hasAlpha
    ? { ...(await sized(at(fallbackWidth).png({ compressionLevel: 9 }))), format: "png" as const }
    : {
        ...(await sized(at(fallbackWidth).flatten({ background: "#ffffff" }).jpeg({ quality: FALLBACK_JPEG_QUALITY, mozjpeg: true }))),
        format: "jpeg" as const,
      };

  return { renditions, fallback };
}

/**
 * What an image looks like, as 16 hex characters: a difference hash. The
 * image is shrunk to 9×8 in greyscale and each bit says whether a pixel is
 * brighter than its right-hand neighbour. Re-exports, re-compression and
 * resizing keep it (nearly) the same; different photos differ in many bits.
 */
export async function generateFingerprint(buffer: Buffer): Promise<string | undefined> {
  try {
    const px = await sharp(buffer, { failOn: "none" })
      .rotate()
      .greyscale()
      .resize(9, 8, { fit: "fill" })
      .raw()
      .toBuffer();
    let hex = "";
    for (let i = 0; i < 64; i += 4) {
      let nibble = 0;
      for (let j = i; j < i + 4; j++) {
        const at = Math.floor(j / 8) * 9 + (j % 8);
        nibble = (nibble << 1) | (px[at] > px[at + 1] ? 1 : 0);
      }
      hex += nibble.toString(16);
    }
    return hex;
  } catch {
    return undefined;
  }
}

/** How many of the 64 bits two fingerprints differ in: 0 is the same picture, under ~10 a close version. */
export function fingerprintDistance(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < 16; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    for (; x; x &= x - 1) n++;
  }
  return n;
}

export function buildVariantFilename(
  baseName: string,
  shortId: string,
  variantName: string | null,
  extension: string
): string {
  if (variantName) {
    return `${baseName}-${shortId}-${variantName}${extension}`;
  }
  return `${baseName}-${shortId}${extension}`;
}

/**
 * Generate a tiny blur placeholder (base64 data URL)
 * 
 * Creates a ~20px wide WebP image for instant loading.
 * Stored as base64 in MongoDB (not Blob), typically 200-500 bytes.
 */
export async function generateBlurPlaceholder(buffer: Buffer): Promise<string> {
  try {
    const tiny = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize(20, undefined, { fit: "inside" }) // 20px wide, maintain aspect
      .webp({ quality: 20 })
      .toBuffer();
    
    return `data:image/webp;base64,${tiny.toString("base64")}`;
  } catch {
    // Return a minimal transparent placeholder on error
    return "data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoUAA8APpE8mkelpSKhMAgAsBIJZQC7AEFgHc9fwA6s/tv8T/bvV9AA/uzP//5j/8n/R/vb6wD/tXbkAAAAAA==";
  }
}
