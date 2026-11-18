// ============================================
// CMS Core Types
// ============================================

export type EntryStatus = "draft" | "published" | "archived";
export type EntryVisibility = "public" | "private";

export type FieldType =
  | "text"
  | "textarea"
  | "slug"
  | "date"
  | "datetime"
  | "boolean"
  | "number"
  | "select"
  | "categories"
  | "docs"
  | "media"
  | "media:list"
  | "reference"
  | "reference:list"
  | "blocks"
  | "object"
  | "tags";

export type BlockType =
  | "text"
  | "image"
  | "gallery"
  | "video"
  | "youtube"
  | "quote"
  | "divider"
  | "code"
  | "embed"
  | "callout"
  | "list";

// ============================================
// Schema Types
// ============================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldDefinition {
  key: string;
  type: FieldType;
  required: boolean;
  label: string;
  placeholder?: string;
  description?: string;
  // For select fields
  options?: SelectOption[];
  // For media fields
  accept?: string[];
  max?: number;
  // For blocks field
  blockTypes?: BlockType[];
  // For object fields (nested)
  fields?: FieldDefinition[];
  // For reference fields
  to?: string;
  // Default value
  defaultValue?: unknown;
}

export interface CollectionSchema {
  slug: string;
  name: string;
  description: string;
  fields: FieldDefinition[];
  admin: {
    titleField: string;
    subtitleField?: string;
    thumbnailField?: string;
    defaultSort: {
      field: string;
      direction: "asc" | "desc";
    };
  };
}

// ============================================
// SEO Types
// ============================================

export interface SEOData {
  title?: string;
  description?: string;
  image?: string; // OG image URL or media ID
  noIndex?: boolean;
  canonicalUrl?: string;
  keywords?: string[];
}

// ============================================
// Provenance
// ============================================

// How a piece of content got into the CMS. "web" is a person using the admin UI;
// "agent" is an AI assistant working through the API (`agent` names which one).
export type SourceOrigin = "web" | "agent" | "script" | "import";

export interface ContentSource {
  origin: SourceOrigin;
  agent?: string; // e.g. "claude", "chatgpt" - only meaningful when origin is "agent"
  path?: string; // Original filesystem folder, for ingested archive material
  batchId?: string; // Groups everything created by one ingest run
  ingestedAt?: string; // Wall-clock time of the write
  assetCount?: number;
}

// ============================================
// Entry Types
// ============================================

export interface EntryBase<T = Record<string, unknown>> {
  id: string;
  /** The shape version it was written in (see lib/cms/schema-version.ts); none means 1. */
  schemaVersion?: number;
  collection: string;
  slug: string;
  previousSlugs?: string[]; // Track slug history for redirect mapping on migration
  status: EntryStatus;
  visibility: EntryVisibility;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  scheduledAt?: string | null; // Future publish date
  authorId: string | null;
  contributors?: string[]; // Co-author IDs (future multi-author)
  data: T;
  pendingData?: T; // Unpublished changes for published entries
  seo?: SEOData;
  source?: ContentSource; // How this entry got into the CMS
  metadata?: Record<string, unknown>; // Extensibility bucket
  external?: Record<string, unknown>; // For migrations/external references
}

export interface PostData {
  title: string;
  previewImage?: string; // Media ID override for feeds/grids; defaults to first gallery item
  content?: Block[]; // Stacked blocks: text, gallery, video, youtube, quote, divider
  categories: string[]; // Array of category IDs
  tags?: string | string[];
  /** Optional: shown under the post in feeds in place of the start of its text. */
  description?: string;
  date?: string;
  [key: string]: unknown; // Allow additional fields
}

export interface PostEntry extends EntryBase<PostData> {
  collection: "posts";
}

/** Any stored entry. Posts and pages share one collection and one shape; `collection` says which. */
export type Entry = EntryBase<PostData>;

// ============================================
// Block Types
// ============================================

export interface TextBlock {
  type: "text";
  id: string;
  html: string;
}

export interface ImageBlock {
  type: "image";
  id: string;
  mediaId: string;
  caption?: string;
  alt?: string;
}

/**
 * How a top-level category's page sets its intro: `hero` (a big headline over
 * the feed, the default), `left` (a sticky text column beside it), `wall` (no
 * intro, just the grid), `list` (a title, then the posts stacked like a blog,
 * left-aligned, with or without pictures).
 */
export const CATEGORY_LAYOUTS = ["hero", "left", "wall", "list"] as const;
export type CategoryLayout = (typeof CATEGORY_LAYOUTS)[number];

export const GALLERY_LAYOUTS = ["auto", "stack", "grid", "masonry"] as const;
export const GALLERY_WIDTHS = ["auto", "normal", "large", "full"] as const;

export interface GalleryBlock {
  type: "gallery";
  id: string;
  mediaIds: string[];
  /**
   * `auto` (the default, also when unset): sized by image count. `stack`: one
   * image a row, each as large as it may be. `grid` and `masonry` use `columns`.
   */
  layout?: (typeof GALLERY_LAYOUTS)[number];
  columns?: number;
  gap?: number;
  /**
   * `auto` (the default, also when unset): inline for up to three images, the
   * page's whole width for more. `large` / `normal`: inline, the reading column (700px).
   * `full`: the page's whole width. See `galleryIsFull` in justified-rows.ts.
   */
  width?: (typeof GALLERY_WIDTHS)[number];
  /**
   * What image should go here, while the gallery is still empty. An empty
   * gallery shows as a 3:2 placeholder (in the editor and the preview, never
   * on the live site) with this as its caption.
   */
  placeholder?: string;
}

export interface VideoBlock {
  type: "video";
  id: string;
  mediaId: string;
  caption?: string;
}

export interface YouTubeBlock {
  type: "youtube";
  id: string;
  url: string;
  caption?: string;
}

export interface QuoteBlock {
  type: "quote";
  id: string;
  text: string;
  attribution?: string;
}

export const DIVIDER_STYLES = ["line", "dots", "space"] as const;

export interface DividerBlock {
  type: "divider";
  id: string;
  style?: (typeof DIVIDER_STYLES)[number];
}

export interface CodeBlock {
  type: "code";
  id: string;
  code: string;
  language?: string;
  filename?: string;
}

export interface EmbedBlock {
  type: "embed";
  id: string;
  url: string;
  html?: string; // oEmbed HTML
  provider?: string;
}

export interface CalloutBlock {
  type: "callout";
  id: string;
  text: string;
  variant?: "info" | "warning" | "success" | "error";
  icon?: string;
}

export interface ListBlock {
  type: "list";
  id: string;
  items: string[];
  style: "bullet" | "numbered" | "checklist";
}

/**
 * A newsletter sign-up (Parabola's `DsNewsletterBlock`): heading, a line of
 * copy, the button, and which list and source the sign-up carries. It posts
 * to the CMS's own `POST /api/subscribe`; the provider behind it is Settings'
 * business, never the page's.
 */
export interface NewsletterBlock {
  type: "newsletter";
  id: string;
  heading?: string;
  text?: string;
  buttonLabel?: string;
  /** List slug ("news", "studio"). */
  list?: string;
  /** Where the sign-up came from; the page's path when unset. */
  source?: string;
}

export type Block = (
  | TextBlock
  | ImageBlock
  | GalleryBlock
  | VideoBlock
  | YouTubeBlock
  | QuoteBlock
  | DividerBlock
  | CodeBlock
  | EmbedBlock
  | CalloutBlock
  | ListBlock
  | NewsletterBlock
) & {
  /** A short name a custom page asks for this block by ("intro", "photos"); see lib/cms/custom-pages.ts. */
  name?: string;
};

// ============================================
// Media Types
// ============================================

export interface ImageVariant {
  filename: string;
  path: string;
  url: string;
  width: number;
  height: number;
  size: number;
}

export interface MediaItem {
  id: string;
  /** The shape version it was written in (see lib/cms/schema-version.ts); none means 1. */
  schemaVersion?: number;

  // File identification
  filename: string; // Sanitized SEO-friendly filename (e.g., beach-sunset-x7k9.jpg)
  originalName: string; // Original upload name (e.g., "Beach Sunset (Final).JPG")
  slug: string; // URL-safe identifier

  // Primary file (optimized display version by default)
  path: string;
  url: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // For video/audio (seconds)

  // Original file info (optional - not stored to save costs)
  original?: {
    filename: string;
    path: string;
    url: string;
    width: number;
    height: number;
    size: number;
  };

  /**
   * The image at each width it's served at (AVIF, narrowest first, at most
   * 2560px on the long edge, never enlarged), made once at upload. Pages
   * offer them as one srcset and the browser picks; Vercel's image service
   * isn't involved. Older uploads don't have them and are served as before.
   */
  renditions?: ImageVariant[];
  /** One JPEG (PNG when the image has transparency) for browsers without AVIF. */
  fallback?: ImageVariant;

  /**
   * Generated variants. For uploads with `renditions` these point at the
   * matching renditions (display: the largest, medium: ~1280px, thumb:
   * ~640px), so nothing is stored twice; older uploads have their own files.
   */
  variants?: {
    display?: ImageVariant; // largest - hero/carousel/lightbox
    medium?: ImageVariant; // ~1280px - article content
    thumb?: ImageVariant; // ~640px - grid cards/thumbnails
  };

  // Video poster/thumbnail (first frame extracted as JPG)
  poster?: {
    url: string;
    width: number;
    height: number;
  };

  // Active variant being served as primary URL
  activeVariant: "original" | "display" | "medium" | "thumb";

  // WordPress-compatible metadata
  title: string; // Display title
  alt: string; // Alt text for accessibility/SEO
  caption?: string; // Optional caption
  description?: string; // Longer description
  credit?: string; // Photographer/source attribution

  // Organization
  folderId?: string; // Folder/album organization (future)
  tags?: string[]; // Media tags for filtering
  /**
   * What's in the picture, written by an agent that looked at it (/curate or
   * /post), never typed by hand. Kept apart from `tags` so either can be
   * cleared without the other. Search matches both.
   */
  keywords?: string[];
  /** Who wrote `keywords` and when, shown beside them in the media panel. */
  keywordsFrom?: { by: string; at: string };

  // Attribution
  uploadedBy?: string; // User ID who uploaded

  // Where this came from - see ContentSource
  source?: ContentSource;
  /** Extensibility bucket, as on entries: `{ example: true, seed }` for an example site's media. */
  metadata?: Record<string, unknown>;

  // Dates
  /** When the asset was made: its capture date when known (backdated for archive imports), else the upload time. */
  createdAt: string;
  /** When it was added to the library. Always the real upload time, so the library can list newest uploads first. */
  uploadedAt?: string;
  updatedAt?: string;

  // For migrations/external references
  externalIds?: {
    wordpress?: string;
    [key: string]: string | undefined;
  };

  // Hash for deduplication/integrity
  /**
   * What the image looks like, as 64 bits of hex (a difference hash of a
   * tiny greyscale copy). Unlike the byte hashes it survives re-exports,
   * re-compression and resizing, so "is this already up?" works from any
   * folder. Close images differ in a few bits.
   */
  fingerprint?: string;
  hash?: string; // MD5 (legacy, for deduplication)
  sha256?: string; // SHA256 (canonical integrity hash for export/migration)

  // Storage provider info (for export/migration - know where files live)
  storageProvider?: "vercel_blob" | "local" | "s3" | "r2";

  // Blur placeholder for instant loading (base64 data URL, ~20px wide)
  blurDataURL?: string;
}

export interface MediaIndex {
  items: MediaItem[];
}

// Optional metadata supplied at upload time (agent ingest, bulk import)
export interface UploadMetadata {
  title?: string;
  alt?: string;
  caption?: string;
  description?: string;
  credit?: string;
  tags?: string[];
  keywords?: string[];
  /** Who wrote the keywords, e.g. "/post" or "/curate". */
  keywordsBy?: string;
  capturedAt?: string; // ISO date the asset was originally made; becomes createdAt (uploadedAt stays the real upload time)
  source?: MediaItem["source"];
  metadata?: MediaItem["metadata"];
}

// ============================================
// User Types (Future Multi-Author)
// ============================================

export type UserRole = "owner" | "admin" | "editor" | "author" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  bio?: string;
  social?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

// ============================================
// Site Settings Types
// ============================================

export interface SiteSettings {
  name: string;
  tagline?: string;
  description?: string;
  logo?: string; // Media ID or URL
  favicon?: string;
  url?: string;
  social?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    github?: string;
    youtube?: string;
    tiktok?: string;
  };
  defaultSeo?: SEOData;
  features?: {
    comments?: boolean;
    search?: boolean;
    newsletter?: boolean;
    rss?: boolean;
  };
  analytics?: {
    googleAnalyticsId?: string;
    plausibleDomain?: string;
  };
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
