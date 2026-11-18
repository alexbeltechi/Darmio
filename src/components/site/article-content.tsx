"use client";

import { DS_PROSE_CLASS, DsPlaceholder } from "@beltechi/parabola";
import { DsNewsletterBlock } from "@beltechi/parabola/blocks";
import { extractFootnotes, footnoteId, footnoteRefId } from "@/lib/cms/footnotes";
import { galleryIsFull, READING_WIDTH } from "@/lib/cms/justified-rows";
import { Gallery } from "@/components/shared/gallery";
import { FadeInOnScroll } from "@/components/shared/fade-in-on-scroll";
import type { Block, GalleryBlock, MediaItem } from "@/lib/cms/types";

interface ArticleContentProps {
  blocks: Block[];
  mediaItems: MediaItem[];
  /** The admin preview: empty galleries show as placeholders instead of nothing. */
  preview?: boolean;
}

// READING_WIDTH (lib/cms/justified-rows.ts), written out for Tailwind.
const READING_COLUMN = "mx-auto w-full max-w-[700px]";

/**
 * Renders a post's blocks, each fading in as it scrolls into view. Text-like
 * blocks sit in the 700px reading column (READING_WIDTH); galleries span the full container.
 *
 * Spacing comes from Parabola: 40px (`space-y-ds-40`) between blocks (a text block,
 * a gallery, a quote), so a gallery and the text around it read as separate
 * beats; inside them, 8px between media and its caption, the prose's own
 * paragraph spacing, and the gutter between a gallery's images.
 *
 * Notes written in the text (`^[…]`, lib/cms/footnotes.ts) become small
 * numbers there and a numbered list under a rule at the end, in small text,
 * each note with a way back to its number.
 */
export function ArticleContent({ blocks: written, mediaItems, preview = false }: ArticleContentProps) {
  const { blocks, notes } = extractFootnotes(written);
  const mediaMap = new Map<string, MediaItem>();
  mediaItems.forEach((item) => mediaMap.set(item.id, item));
  return (
    <div className="w-full space-y-ds-40">
      {blocks.map((block) => {
        switch (block.type) {
          case "text":
            return (
              <FadeInOnScroll key={block.id} className={READING_COLUMN}>
                <div
                  className={DS_PROSE_CLASS}
                  dangerouslySetInnerHTML={{ __html: block.html }}
                />
              </FadeInOnScroll>
            );

          case "gallery":
            const galleryBlock = block as GalleryBlock;
            const galleryMediaItems = galleryBlock.mediaIds
              .map((id) => mediaMap.get(id))
              .filter(Boolean) as MediaItem[];

            // An empty gallery is a placeholder for an image still to come:
            // a 3:2 stone block and its note in the preview, nothing live.
            if (galleryMediaItems.length === 0) {
              if (!preview) return null;
              return (
                <figure
                  key={block.id}
                  className="mx-auto flex w-full flex-col gap-ds-8 px-0"
                  style={galleryIsFull(galleryBlock.width, 0) ? undefined : { maxWidth: READING_WIDTH }}
                >
                  <DsPlaceholder ratio="3/2" />
                  {galleryBlock.placeholder && (
                    <figcaption className={`${READING_COLUMN} text-small text-ds-fg-muted`}>
                      {galleryBlock.placeholder}
                    </figcaption>
                  )}
                </figure>
              );
            }

            // Gallery already has FadeInOnScroll on each row internally
            return (
              <Gallery
                key={block.id}
                mediaItems={galleryMediaItems}
                layout={galleryBlock.layout || "auto"}
                columns={galleryBlock.columns}
                width={galleryBlock.width}
              />
            );

          case "video": {
            const video = mediaMap.get(block.mediaId);
            if (!video) return null;
            return (
              <FadeInOnScroll key={block.id} className={READING_COLUMN}>
                <div className="space-y-ds-8">
                  <video
                    src={video.url}
                    poster={video.poster?.url}
                    controls
                    playsInline
                    className="w-full rounded-lg"
                  />
                  {block.caption && (
                    <p className="text-center text-p text-ds-fg-muted">{block.caption}</p>
                  )}
                </div>
              </FadeInOnScroll>
            );
          }

          case "youtube":
            const videoId = extractYouTubeId(block.url);
            return (
              <FadeInOnScroll key={block.id} className={READING_COLUMN}>
                <div className="space-y-ds-8">
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                    {videoId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-ds-surface flex items-center justify-center text-ds-fg-subtle">
                        Invalid YouTube URL
                      </div>
                    )}
                  </div>
                  {block.caption && (
                    <p className="text-center text-p text-ds-fg-muted">
                      {block.caption}
                    </p>
                  )}
                </div>
              </FadeInOnScroll>
            );

          case "quote":
            return (
              <FadeInOnScroll key={block.id} className={READING_COLUMN}>
                {/* A soft box: the quote in body text, its source small and muted beneath. */}
                <blockquote className="flex flex-col gap-ds-16 rounded-[24px] bg-ds-surface-subtle p-ds-20 sm:p-ds-40">
                  <p className="text-prose text-ds-fg">{block.text}</p>
                  {block.attribution && (
                    <footer className="text-small text-ds-fg-muted">— {block.attribution}</footer>
                  )}
                </blockquote>
              </FadeInOnScroll>
            );

          case "divider":
            return (
              <FadeInOnScroll key={block.id} className={READING_COLUMN}>
                <hr className="border-ds-border" />
              </FadeInOnScroll>
            );

          case "newsletter":
            return (
              <FadeInOnScroll key={block.id} className={READING_COLUMN}>
                <DsNewsletterBlock
                  heading={block.heading}
                  text={block.text}
                  buttonLabel={block.buttonLabel || undefined}
                  list={block.list}
                  source={block.source}
                />
              </FadeInOnScroll>
            );

          default:
            return null;
        }
      })}
      {notes.length > 0 && (
        <FadeInOnScroll className={READING_COLUMN}>
          <ol aria-label="Notes" className="flex flex-col gap-ds-8 border-t border-ds-border pt-ds-20 text-small text-ds-fg-muted">
            {notes.map((note, i) => (
              <li key={i} id={footnoteId(i + 1)} className="flex scroll-mt-24 gap-ds-8">
                <span className="shrink-0 tabular-nums text-ds-fg-subtle">{i + 1}</span>
                <span className="[&_a]:text-ds-fg [&_a]:underline">
                  <span dangerouslySetInnerHTML={{ __html: note }} />{" "}
                  <a href={`#${footnoteRefId(i + 1)}`} aria-label={`Back to the text, note ${i + 1}`} className="!no-underline">
                    ↩
                  </a>
                </span>
              </li>
            ))}
          </ol>
        </FadeInOnScroll>
      )}
    </div>
  );
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

