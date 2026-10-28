import type { Block, Entry } from "./types";

/** Words a minute, for a read time. */
const WORDS_PER_MINUTE = 230;

/** Minutes to read a post's text, at least 1. Pure, so the site and the admin share it. */
export function readMinutes(entry: Entry): number {
  const blocks = (entry.data.content as Block[] | undefined) || [];
  const words = blocks
    .flatMap((block) => (block.type === "text" ? [block.html] : block.type === "quote" ? [block.text] : []))
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** A post's date: its own `date`, else when it was made. */
export function entryDate(entry: Entry): Date {
  return new Date((entry.data.date as string) || entry.publishedAt || entry.createdAt);
}
