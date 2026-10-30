/**
 * Projects: one install, many projects (a portfolio, a club…),
 * each with its own database. Pure: the names
 * and rules the middleware, the admin and the server share.
 */
import { slugify } from "@/lib/slug";

/** The admin's current project, remembered per browser. */
export const PROJECT_COOKIE = "darmio-project";
/** The project a request is for: set by the middleware from the cookie, or sent by an agent. */
export const PROJECT_HEADER = "x-darmio-project";

export const PROJECT_NAME_MAX = 60;
export const PROJECTS_MAX = 20;

/** A project as the admin sees it. */
export type ProjectSummary = {
  slug: string;
  name: string;
  /** A folder or link with what an agent should know first: who it's for, its voice, what's decided. */
  brain?: string;
  /** When anything in it last changed (ISO), for Home's cards. Only in the project list. */
  lastChange?: string;
};

/** A clean project name, or a thrown reason. */
export function parseProjectName(value: unknown): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > PROJECT_NAME_MAX) throw new Error(`A project name needs 1–${PROJECT_NAME_MAX} characters`);
  if (!slugify(name)) throw new Error(`"${name}" needs at least one letter or number`);
  return name;
}

/** A clean brain location (folder or link), empty for none. */
export function parseBrain(value: unknown): string | undefined {
  const brain = typeof value === "string" ? value.trim() : "";
  if (brain.length > 500) throw new Error("A brain's location can be at most 500 characters");
  return brain || undefined;
}
