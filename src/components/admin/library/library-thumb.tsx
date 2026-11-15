import { File, FileText, Film, Image as ImageIcon } from "lucide-react";
import { cn } from "@beltechi/parabola";
import { entryKind, entryName, fileExtension, type LibraryEntry } from "@/lib/cms/library";
import { thumbnailUrl } from "@/lib/cms/media-url";

/**
 * What a Library tile shows in its square, for any kind of file: the picture,
 * a video's poster, or an icon with the file's type ("MD", "PDF") for a
 * document or another file. The Library's grid and its pop-up both use it, so
 * a file looks the same wherever it's listed. Fills its parent.
 */
export function LibraryThumb({ entry, className }: { entry: LibraryEntry; className?: string }) {
  const kind = entryKind(entry);

  if (entry.kind === "media" && (kind === "image" || entry.item.poster?.url)) {
    const { item } = entry;
    const Icon = kind === "image" ? ImageIcon : Film;
    return (
      <span data-slot="library-thumb" data-kind={kind} className={cn("relative block size-full", className)}>
        <img src={kind === "image" ? thumbnailUrl(item) : item.poster!.url} alt={item.alt || ""} className="size-full object-cover" />
        <Icon aria-hidden className="absolute top-2 left-2 size-4 text-white drop-shadow-md" />
      </span>
    );
  }

  const Icon = kind === "video" ? Film : kind === "document" ? FileText : File;
  return (
    <span
      data-slot="library-thumb"
      data-kind={kind}
      className={cn("flex size-full flex-col items-center justify-center gap-ds-8 text-ds-fg-subtle", className)}
    >
      <Icon aria-hidden className="size-8" />
      {kind !== "video" && <span className="text-small">{fileExtension(entryName(entry))}</span>}
    </span>
  );
}
