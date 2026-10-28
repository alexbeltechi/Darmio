import { marked } from "marked";
import TurndownService from "turndown";
import { tables } from "turndown-plugin-gfm";
import { DIVIDER_STYLES, GALLERY_LAYOUTS, GALLERY_WIDTHS, type Block, type Entry } from "@/lib/cms/types";
import {
  linesToLinks,
  linksToLines,
  pageSettings,
  type HomeNewsletter,
  type PageLink,
} from "@/lib/cms/page-formats";

/**
 * Posts as Markdown, for agents: shorter to read and write than the JSON
 * blocks the editor stores, and converted to and from them here.
 *
 *   ---
 *   title: The UI is the fallback
 *   categories: design, journal
 *   tags: agentic, CMS
 *   date: 2026-10-03
 *   ---
 *
 *   <!-- block:3f2a91c0 -->
 *   Plain Markdown is a text block: paragraphs, ## headings, lists, links.
 *
 *   <!-- block:7be04d12 -->
 *   :::gallery layout=auto width=auto
 *   ![label](media:MEDIA_ID)
 *   ![what image should go here](placeholder)
 *   :::
 *
 *   :::quote attribution="Me, on LinkedIn"
 *   The quoted text.
 *   :::
 *
 *   ::divider
 *   ::video media=MEDIA_ID caption="…"
 *   ::youtube url="https://…" caption="…"
 *
 * A page's front matter also carries its format and place:
 *
 *   format: text            (blocks, text, home or links)
 *   parent: about           (the page it sits under)
 *   nav: yes                (top-level pages: in the site's nav)
 *   posts: writing          (home: the category it lists)
 *   newsletter: Letters | A few times a year.   (home: heading | line)
 *   links:                  (links pages: one a line, Label | URL | note)
 *     - YouTube | https://youtube.com/@me | @me
 *
 * `<!-- block:ID -->` marks where each block starts and keeps its identity
 * (the first 8 characters of its id are enough). Writing a post back, a
 * marked block keeps its id; unmarked ones are new. In a gallery the image
 * text is only a label (the file's own caption is edited on the media item);
 * a `placeholder` line is the empty gallery's note.
 */

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
});

// GitHub-style tables (| a | b |) in both directions.
turndown.use(tables);

marked.setOptions({ gfm: true, breaks: false });

export type PostMeta = {
  title?: string;
  categories?: string[];
  tags?: string;
  date?: string;
  /** Pages only: the URL (/<slug>) and the description. */
  slug?: string;
  description?: string;
  /** Attached doc ids (posts and pages). */
  docs?: string[];
  /** Pages only: the format and its settings (lib/cms/page-formats.ts). */
  format?: string;
  parent?: string;
  nav?: boolean;
  links?: PageLink[];
  postsCategory?: string;
  newsletter?: HomeNewsletter;
};

/** A block parsed from Markdown, with the id prefix it was marked with, if any. */
export type ParsedBlock = { ref?: string; block: Block };

// ---------------------------------------------------------------------------
// Blocks → Markdown

const shortId = (id: string) => id.replace(/-/g, "").slice(0, 8);

function attr(key: string, value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  const text = String(value);
  return /^[\w.:/-]+$/.test(text) ? ` ${key}=${text}` : ` ${key}="${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** One block as Markdown (without its marker). `mediaLabel` names a media id for the reader. */
export function blockToMarkdown(block: Block, mediaLabel: (id: string) => string = () => ""): string {
  switch (block.type) {
    case "text":
      return turndown.turndown(block.html || "").trim();
    case "quote":
      return `:::quote${attr("attribution", block.attribution)}\n${block.text.trim()}\n:::`;
    case "gallery": {
      const lines = block.mediaIds.map((id) => `![${mediaLabel(id).replace(/[\[\]]/g, "")}](media:${id})`);
      if (block.placeholder !== undefined && block.placeholder !== "") {
        lines.push(`![${block.placeholder.replace(/[\[\]]/g, "")}](placeholder)`);
      }
      const attrs = attr("layout", block.layout) + attr("columns", block.columns) + attr("width", block.width) + attr("gap", block.gap);
      return `:::gallery${attrs}\n${lines.join("\n")}\n:::`;
    }
    case "divider":
      return `::divider${attr("style", block.style)}`;
    case "video":
      return `::video${attr("media", block.mediaId)}${attr("caption", block.caption)}`;
    case "youtube":
      return `::youtube${attr("url", block.url)}${attr("caption", block.caption)}`;
    case "newsletter":
      return `::newsletter${attr("heading", block.heading)}${attr("text", block.text)}${attr("button", block.buttonLabel)}${attr("list", block.list)}${attr("source", block.source)}`;
    default: {
      // Anything else round-trips untouched as JSON.
      const rest: Record<string, unknown> = { ...block };
      delete rest.id;
      return `:::json\n${JSON.stringify(rest)}\n:::`;
    }
  }
}

/** A whole post as Markdown: front matter, then each block after its marker. */
export function postToMarkdown(entry: Entry, mediaLabel?: (id: string) => string): string {
  const data = { ...entry.data, ...entry.pendingData } as Record<string, unknown>;
  const tags = Array.isArray(data.tags) ? data.tags.join(", ") : String(data.tags || "");
  const date = String(data.date || entry.createdAt || "").slice(0, 10);
  const status = `status: ${entry.status}${entry.status === "published" && entry.pendingData ? " (with unpublished changes)" : ""}`;
  const fields =
    (entry.collection as string) === "pages"
      ? [
          `description: ${String(data.description || "").replace(/\s+/g, " ")}`,
          `docs: ${((data.docs as string[]) || []).join(", ")}`,
          ...pageFrontMatter(data),
        ]
      : [
          `categories: ${((data.categories as string[]) || []).join(", ")}`,
          `tags: ${tags}`,
          `date: ${date}`,
          `docs: ${((data.docs as string[]) || []).join(", ")}`,
          // Only when set: most posts leave it blank.
          ...(data.description ? [`description: ${String(data.description).replace(/\s+/g, " ")}`] : []),
        ];
  const front = ["---", `title: ${String(data.title || "")}`, `slug: ${entry.slug}`, status, ...fields, "---"].join("\n");
  const blocks = ((data.content as Block[]) || []).map((b) => `<!-- block:${shortId(b.id)} -->\n${blockToMarkdown(b, mediaLabel)}`);
  return `${front}\n\n${blocks.join("\n\n")}\n`;
}

/** A page's format lines, only those that say something. */
function pageFrontMatter(data: Record<string, unknown>): string[] {
  const settings = pageSettings(data);
  return [
    `format: ${settings.format}`,
    ...(settings.parent ? [`parent: ${settings.parent}`] : []),
    ...(settings.nav ? ["nav: yes"] : []),
    ...(settings.postsCategory ? [`posts: ${settings.postsCategory}`] : []),
    ...(settings.newsletter
      ? [`newsletter: ${[settings.newsletter.heading ?? "", settings.newsletter.text ?? ""].join(" | ")}`]
      : []),
    ...(settings.links.length > 0 ? ["links:", ...linksToLines(settings.links).map((line) => `  - ${line}`)] : []),
  ];
}

// ---------------------------------------------------------------------------
// Markdown → blocks

function parseAttrs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of text.matchAll(/(\w+)=(?:"((?:[^"\\]|\\.)*)"|(\S+))/g)) {
    out[m[1]] = m[2] !== undefined ? m[2].replace(/\\(.)/g, "$1") : m[3];
  }
  return out;
}

/** An attribute that must be one of a fixed set; anything else is the agent's mistake, so say what's allowed. */
function oneOf<T extends string>(directive: string, attr: string, value: string, allowed: readonly T[]): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`${directive} ${attr}="${value}" isn't one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function directiveBlock(name: string, attrs: Record<string, string>, body: string): Block {
  const id = crypto.randomUUID();
  switch (name) {
    case "quote":
      return { type: "quote", id, text: body.trim(), ...(attrs.attribution ? { attribution: attrs.attribution } : {}) };
    case "gallery": {
      const mediaIds: string[] = [];
      let placeholder: string | undefined;
      for (const m of body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)) {
        if (m[2] === "placeholder") placeholder = m[1].trim();
        else if (m[2].startsWith("media:")) mediaIds.push(m[2].slice(6));
      }
      return {
        type: "gallery",
        id,
        mediaIds,
        // No layout given: Auto, like a gallery made in the editor.
        layout: attrs.layout ? oneOf(":::gallery", "layout", attrs.layout, GALLERY_LAYOUTS) : "auto",
        ...(attrs.columns ? { columns: Number(attrs.columns) } : {}),
        width: attrs.width ? oneOf(":::gallery", "width", attrs.width, GALLERY_WIDTHS) : "auto",
        gap: attrs.gap ? Number(attrs.gap) : 16,
        ...(placeholder !== undefined ? { placeholder } : {}),
      };
    }
    case "divider":
      return { type: "divider", id, ...(attrs.style ? { style: oneOf("::divider", "style", attrs.style, DIVIDER_STYLES) } : {}) };
    case "video":
      if (!attrs.media) throw new Error("::video needs media=MEDIA_ID");
      return { type: "video", id, mediaId: attrs.media, ...(attrs.caption ? { caption: attrs.caption } : {}) };
    case "youtube":
      if (!attrs.url) throw new Error("::youtube needs url=…");
      return { type: "youtube", id, url: attrs.url, ...(attrs.caption ? { caption: attrs.caption } : {}) };
    case "newsletter":
      return {
        type: "newsletter",
        id,
        ...(attrs.heading ? { heading: attrs.heading } : {}),
        ...(attrs.text ? { text: attrs.text } : {}),
        ...(attrs.button ? { buttonLabel: attrs.button } : {}),
        ...(attrs.list ? { list: attrs.list } : {}),
        ...(attrs.source ? { source: attrs.source } : {}),
      };
    case "json":
      return { ...(JSON.parse(body) as Block), id };
    default:
      throw new Error(`Unknown block "${name}". Use plain Markdown, :::quote, :::gallery, ::divider, ::video, ::youtube, ::newsletter or :::json.`);
  }
}

/** Front matter (simple `key: value` lines) and the rest. */
function splitFrontMatter(md: string): { meta: PostMeta; body: string } {
  const match = md.match(/^\s*---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: md };
  const meta: PostMeta = {};
  // `links:` is followed by its links, one an indented `- ` line.
  let linkLines: string[] | null = null;
  for (const line of match[1].split("\n")) {
    if (linkLines && /^\s+-\s/.test(line)) {
      linkLines.push(line.replace(/^\s+-\s+/, ""));
      continue;
    }
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (key === "links") {
      linkLines = [];
      meta.links = [];
      continue;
    }
    if (key === "format") meta.format = value;
    if (key === "parent") meta.parent = value;
    if (key === "nav") meta.nav = /^(yes|true)$/i.test(value);
    if (key === "posts") meta.postsCategory = value;
    if (key === "newsletter") {
      const [heading, ...rest] = value.split("|").map((part) => part.trim());
      meta.newsletter = { heading, text: rest.join(" | ") };
    }
    if (key === "title") meta.title = value;
    if (key === "categories") meta.categories = value ? value.split(",").map((c) => c.trim()).filter(Boolean) : [];
    if (key === "tags") meta.tags = value;
    if (key === "date" && value) meta.date = value;
    if (key === "slug" && value) meta.slug = value;
    if (key === "description") meta.description = value;
    if (key === "docs") meta.docs = value ? value.split(",").map((d) => d.trim()).filter(Boolean) : [];
  }
  if (linkLines) meta.links = linesToLinks(linkLines);
  return { meta, body: md.slice(match[0].length) };
}

/** Markdown → front matter and blocks. Throws with a readable message on malformed directives. */
export function parsePostMarkdown(md: string): { meta: PostMeta; blocks: ParsedBlock[] } {
  const { meta, body } = splitFrontMatter(md.replace(/\r\n/g, "\n"));
  return { meta, blocks: parseBlocks(body) };
}

/** Markdown (no front matter) → blocks. */
export function parseBlocks(body: string): ParsedBlock[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const out: ParsedBlock[] = [];
  let ref: string | undefined;
  let text: string[] = [];
  let inFence = false;

  const push = (block: Block) => {
    out.push({ ref, block });
    ref = undefined;
  };
  const flushText = () => {
    const md = text.join("\n").trim();
    text = [];
    if (!md) return;
    push({ type: "text", id: crypto.randomUUID(), html: (marked.parse(md) as string).trim() });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) {
      text.push(line);
      continue;
    }

    const marker = line.match(/^\s*<!--\s*block:([\w-]+)\s*-->\s*$/);
    if (marker) {
      flushText();
      ref = marker[1].replace(/-/g, "");
      continue;
    }

    const container = line.match(/^:::(\w+)(.*)$/);
    if (container) {
      flushText();
      const bodyLines: string[] = [];
      let closed = false;
      for (i++; i < lines.length; i++) {
        if (/^:::\s*$/.test(lines[i])) {
          closed = true;
          break;
        }
        bodyLines.push(lines[i]);
      }
      if (!closed) throw new Error(`:::${container[1]} is missing its closing :::`);
      push(directiveBlock(container[1], parseAttrs(container[2]), bodyLines.join("\n")));
      continue;
    }

    const leaf = line.match(/^::(\w+)(.*)$/);
    if (leaf) {
      flushText();
      push(directiveBlock(leaf[1], parseAttrs(leaf[2]), ""));
      continue;
    }

    text.push(line);
  }
  flushText();
  return out;
}

/**
 * Give parsed blocks their ids: a block marked with (a prefix of) an existing
 * block's id keeps it, everything else keeps its new id. Throws if a marker
 * matches no block or more than one.
 */
export function resolveRefs(parsed: ParsedBlock[], existing: Block[]): Block[] {
  return parsed.map(({ ref, block }) => {
    if (!ref) return block;
    const matches = existing.filter((b) => b.id.replace(/-/g, "").startsWith(ref));
    if (matches.length === 0) return block; // an unknown marker just starts a new block
    if (matches.length > 1) throw new Error(`block:${ref} matches more than one block; use more characters`);
    return { ...block, id: matches[0].id } as Block;
  });
}

/** Find a block by (a prefix of) its id. */
export function findBlockIndex(blocks: Block[], ref: string): number {
  const clean = ref.replace(/-/g, "");
  const matches = blocks.map((b, i) => [b, i] as const).filter(([b]) => b.id.replace(/-/g, "").startsWith(clean));
  if (matches.length === 0) throw new Error(`No block ${ref}`);
  if (matches.length > 1) throw new Error(`block ${ref} is ambiguous; use more characters`);
  return matches[0][1];
}

/** A one-line outline of each block, for responses: `3f2a91c0 text "For years my…"`. */
export function outline(blocks: Block[], mediaLabel?: (id: string) => string): string[] {
  return blocks.map((b) => {
    const md = blockToMarkdown(b, mediaLabel).replace(/\s+/g, " ");
    return `${shortId(b.id)} ${b.type} ${JSON.stringify(md.length > 60 ? `${md.slice(0, 60)}…` : md)}`;
  });
}
