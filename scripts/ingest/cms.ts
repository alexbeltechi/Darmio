/** The admin API as the ingest scripts call it: CMS_URL (default localhost:3000) with CMS_AGENT_TOKEN. */

export const BASE_URL = process.env.CMS_URL || "http://localhost:3000";
export const TOKEN = process.env.CMS_AGENT_TOKEN;
// Identifies which assistant did the work, so the admin can show it.
// Another agent (chatgpt, etc.) sets CMS_AGENT_NAME to its own name.
export const AGENT = process.env.CMS_AGENT_NAME || "claude";

export async function api(endpoint: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${endpoint}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers || {}) },
  });
}

export interface CmsPost {
  slug: string;
  title: string;
  status: string;
  hasChanges: boolean;
  mediaIds: string[];
}

/** Every post with its media ids, keyed by slug; null when the CMS can't be reached. */
export async function loadPosts(): Promise<Map<string, CmsPost> | null> {
  try {
    const response = await api("/api/admin/collections/posts/entries?fields=slug,title,status,hasChanges,mediaIds&limit=10000");
    if (!response.ok) return null;
    const { data } = (await response.json()) as { data: CmsPost[] };
    return new Map(data.map((p) => [p.slug, p]));
  } catch {
    return null;
  }
}
