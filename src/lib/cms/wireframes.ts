/** Wireframe types, shared by the server (lib/db/wireframes.ts) and the admin. */
import type { Actor } from "@/lib/agent/actor";

/**
 * A wireframe: a single, self-contained HTML file sketching a page before it's
 * built from blocks. It belongs to one page (by the page entry's id) and goes
 * when the page does. Several per page are fine (variants).
 */
export type Wireframe = {
  id: string;
  pageId: string;
  title: string;
  html: string;
  /** The uploaded file's name, when it came from a file. */
  filename?: string;
  createdBy: Actor;
  createdAt: string;
  updatedAt: string;
};

/** A wireframe in a list: everything but the HTML, plus its size. */
export type WireframeSummary = Omit<Wireframe, "html"> & { bytes: number };

/** Where a wireframe opens (and, with `?download=1`, downloads). */
export const wireframeUrl = (id: string) => `/api/admin/wireframes/${id}`;

/** Wireframes are small HTML files; anything bigger is probably the wrong file. */
export const WIREFRAME_MAX_BYTES = 1024 * 1024;
