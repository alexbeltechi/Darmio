import type { Block } from "./types";

/**
 * Footnotes in a post's text. A note is written where it belongs, as
 * `^[the note]` (Pandoc's inline note), in the editor or in Markdown; it can
 * hold links and emphasis. The page numbers the notes in reading order across
 * all the post's text blocks, leaves a small number in the text and lists the
 * notes at the end, each linked back to its number. Nothing is stored but the
 * text itself, so moving a paragraph renumbers everything.
 */

// Not across paragraphs: a `^[` never closed stays as typed.
const NOTE = /\^\[((?:(?!<\/p>|\^\[)[^\]])+)\]/g;

export type Footnotes = {
  /** The blocks, their text carrying the numbers in place of the notes. */
  blocks: Block[];
  /** Each note's HTML, in order: note 1 first. */
  notes: string[];
};

/** The id of a note in the list, and of its number in the text. */
export const footnoteId = (n: number) => `note-${n}`;
export const footnoteRefId = (n: number) => `note-ref-${n}`;

export function extractFootnotes(blocks: Block[]): Footnotes {
  const notes: string[] = [];
  const out = blocks.map((block) => {
    if (block.type !== "text" || !block.html?.includes("^[")) return block;
    const html = block.html.replace(NOTE, (_, note: string) => {
      notes.push(note.trim());
      const n = notes.length;
      return `<sup id="${footnoteRefId(n)}" class="scroll-mt-24"><a href="#${footnoteId(n)}" aria-label="Note ${n}" style="text-decoration:none">${n}</a></sup>`;
    });
    return { ...block, html };
  });
  return { blocks: out, notes };
}

/** Text without its notes, for a preview or a summary. */
export function stripFootnotes(html: string): string {
  return html.replace(NOTE, "");
}
