/**
 * Every item of a paged admin list (`{ data, total }`), page by page. The
 * admin's lists filter and sort on the client, so they need all of it; a
 * single request stops at the API's default page and silently drops the rest.
 */
export async function fetchAll<T>(url: string, pageSize = 500): Promise<T[]> {
  const items: T[] = [];
  const join = url.includes("?") ? "&" : "?";
  for (;;) {
    const res = await fetch(`${url}${join}limit=${pageSize}&offset=${items.length}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const { data = [], total = 0 } = (await res.json()) as { data?: T[]; total?: number };
    items.push(...data);
    if (data.length === 0 || items.length >= total) return items;
  }
}
