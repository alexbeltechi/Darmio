/**
 * The one way to turn text into a URL or file name part: "Brașov, Café!" →
 * "brasov-cafe". Accents fold to plain letters rather than being dropped.
 * No dependencies, so scripts can import it too.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
