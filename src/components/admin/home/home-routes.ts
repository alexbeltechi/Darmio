/** Home: the projects, a new one, and the install's settings (decisions, 2026-10-26). */
export const HOME_PATH = "/admin";
export const HOME_SETTINGS_PATH = "/admin/home/settings";
export const NEW_PROJECT_PATH = "/admin/projects/new";

/** Pages that belong to Home rather than to one project: they get Home's sidebar, not the rail. */
export function isHomePath(pathname: string): boolean {
  return pathname === HOME_PATH || pathname === HOME_SETTINGS_PATH || pathname === NEW_PROJECT_PATH;
}
