import type { DocKind, DocWithUsage } from "@/lib/cms/docs";

/**
 * Sends a text file to the Library as a document. The one way the admin
 * uploads one: the Library, its pop-up, Library › Documents and a post's or
 * page's Documents field. Without a kind the server's default applies.
 */
export async function uploadDocument(file: File, kind?: DocKind): Promise<{ doc?: DocWithUsage; error?: string }> {
  const form = new FormData();
  form.append("file", file);
  if (kind) form.append("kind", kind);
  try {
    const res = await fetch("/api/admin/docs", { method: "POST", body: form });
    const json = await res.json();
    return res.ok ? { doc: json.data } : { error: json.error || "The document couldn't be saved." };
  } catch {
    return { error: "Network error. Please check your connection." };
  }
}
