/**
 * The Library holds every file a site has: pictures, video, documents (text
 * the admin can edit: Markdown, HTML, CSV…) and any other file (a PDF, a
 * deck, a zip), kept as it is. One place decides which of those a file is, so
 * the Library, its pop-up and every upload agree.
 */
import { DOC_ACCEPT, DOC_MAX_BYTES, isDocFilename, mdBytes, mdName, type DocWithUsage } from "@/lib/cms/docs";
import { mediaMatches } from "@/lib/cms/media-search";
import type { MediaItem } from "@/lib/cms/types";

export const LIBRARY_KINDS = ["image", "video", "document", "file"] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];

/** One thing in the Library: an uploaded file, or a document. */
export type LibraryEntry = { kind: "media"; item: MediaItem } | { kind: "doc"; doc: DocWithUsage };

/** What a file about to be uploaded will be. A text file too big to be a document is kept as a plain file. */
export function fileLibraryKind(file: Pick<File, "name" | "type" | "size">): LibraryKind {
  if (isDocFilename(file.name) && file.size <= DOC_MAX_BYTES) return "document";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

/** What an uploaded file is. */
export function mediaLibraryKind(item: Pick<MediaItem, "mime">): Exclude<LibraryKind, "document"> {
  if (item.mime.startsWith("image/")) return "image";
  if (item.mime.startsWith("video/")) return "video";
  return "file";
}

export const entryKind = (entry: LibraryEntry): LibraryKind => (entry.kind === "doc" ? "document" : mediaLibraryKind(entry.item));
export const entryId = (entry: LibraryEntry) => (entry.kind === "doc" ? entry.doc.id : entry.item.id);
/** The name a tile shows: a picture or video by its title, a document or other file by its file name ("press-kit.pdf"). */
export function entryName(entry: LibraryEntry): string {
  if (entry.kind === "doc") return mdName(entry.doc);
  const { item } = entry;
  if (mediaLibraryKind(item) === "file") return item.originalName || item.filename;
  return item.title || item.originalName || item.filename;
}
export const entrySize = (entry: LibraryEntry) => (entry.kind === "doc" ? mdBytes(entry.doc) : entry.item.size || 0);

/** When it came into the Library (a document: when it was last saved). */
export const entryAddedAt = (entry: LibraryEntry) =>
  new Date(
    entry.kind === "doc" ? entry.doc.updatedAt : entry.item.uploadedAt || entry.item.source?.ingestedAt || entry.item.createdAt
  ).getTime();
export const entryCreatedAt = (entry: LibraryEntry) =>
  new Date(entry.kind === "doc" ? entry.doc.createdAt : entry.item.createdAt).getTime();

/** "PDF", "MD": the short label a file's tile wears, from its name. */
export function fileExtension(name: string): string {
  const ext = name.match(/\.([a-z0-9]{1,8})$/i)?.[1];
  return ext ? ext.toUpperCase() : "FILE";
}

/** The Library's search over any entry: media as `mediaMatches`, a document by its names, kind and where it's used. */
export function entryMatches(entry: LibraryEntry, query: string): boolean {
  if (entry.kind === "media") return mediaMatches(entry.item, query);
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { doc } = entry;
  return [doc.title, doc.filename || "", doc.kind, ...doc.usedBy.map((u) => u.title)].some((t) => t.toLowerCase().includes(q));
}

const KIND_WORDS: Record<LibraryKind, string> = { image: "images", video: "video", document: "documents", file: "other files" };

/** "images and video", "documents": the kinds a spot takes, in words. */
export function kindsInWords(kinds: readonly LibraryKind[]): string {
  const words = kinds.map((k) => KIND_WORDS[k]);
  return words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** The `accept` of a file input that takes these kinds; none when it takes any file. */
export function kindsAccept(kinds: readonly LibraryKind[]): string | undefined {
  if (kinds.includes("file")) return undefined;
  const parts: string[] = [];
  if (kinds.includes("image")) parts.push("image/*");
  if (kinds.includes("video")) parts.push("video/*");
  if (kinds.includes("document")) parts.push(DOC_ACCEPT);
  return parts.join(",");
}
