/**
 * Kit's v4 API (kit.com): the account behind a key, its forms and tags, and
 * adding a person to a form, then tagging them with the site's tag. One Kit
 * account serves several sites; the form is what people join, the tag says
 * which site they came from. Server only. Each call takes a plain key;
 * storing it is `@/lib/db/integrations`' job.
 */

import type { KitOption } from "./types";

const API = "https://api.kit.com/v4";

/** Kit refused the key: revoked, or never valid. */
export class KitAuthError extends Error {}

/** Throws KitAuthError on 401, and a readable Error on anything else that isn't OK. */
async function check(res: Response, what: string): Promise<Response> {
  if (res.ok) return res;
  const body = await res.text().catch(() => "");
  let detail = body.slice(0, 300);
  try {
    const json = JSON.parse(body);
    detail = Array.isArray(json.errors) ? json.errors.join("; ") : json.error || json.message || detail;
  } catch {
    // Not JSON; keep the raw text.
  }
  if (res.status === 401) throw new KitAuthError(`${what}: Kit rejected the API key`);
  if (res.status === 429) throw new Error(`${what}: Kit's rate limit was hit; try again in a minute`);
  throw new Error(`${what} failed (${res.status})${detail ? `: ${detail}` : ""}`);
}

async function kitFetch(apiKey: string, path: string, what: string, init: RequestInit = {}): Promise<Response> {
  return check(
    await fetch(`${API}${path}`, {
      ...init,
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-Kit-Api-Key": apiKey, ...init.headers },
    }),
    what
  );
}

/** Whose key this is. The way a pasted key is checked before it's stored. */
export async function kitAccount(apiKey: string): Promise<{ name: string; email?: string }> {
  const { account } = await (await kitFetch(apiKey, "/account", "Checking the key")).json();
  return { name: account?.name || account?.primary_email_address || "Kit account", email: account?.primary_email_address };
}

/** Every page of a list endpoint (`forms`, `tags`); Kit pages by cursor. */
async function listAll(apiKey: string, path: string, key: string, what: string): Promise<KitOption[]> {
  const out: KitOption[] = [];
  let after: string | null = null;
  for (let page = 0; page < 20; page++) {
    const query = new URLSearchParams({ per_page: "500", ...(after ? { after } : {}) });
    const json: { pagination?: { has_next_page?: boolean; end_cursor?: string }; [list: string]: unknown } = await (
      await kitFetch(apiKey, `${path}?${query}`, what)
    ).json();
    for (const item of (json[key] as { id: number; name: string }[] | undefined) ?? []) out.push({ id: item.id, name: item.name });
    if (!json.pagination?.has_next_page || !json.pagination.end_cursor) break;
    after = json.pagination.end_cursor;
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function kitForms(apiKey: string): Promise<KitOption[]> {
  return listAll(apiKey, "/forms", "forms", "Reading Kit forms");
}

export function kitTags(apiKey: string): Promise<KitOption[]> {
  return listAll(apiKey, "/tags", "tags", "Reading Kit tags");
}

/**
 * Sign an address up: create the subscriber (an upsert; Kit's add-to-form
 * call only takes people who already exist), add them to the form, then tag
 * them with the site's tag. A new address is created `inactive`, so it stays
 * unconfirmed until the person clicks the form's own double opt-in email; an
 * existing one keeps its state (Kit never changes it here). Every step
 * succeeds the same way whether or not the address was already there, so
 * nothing reveals membership. `source` becomes Kit's referrer when it's a URL.
 */
export async function kitSubscribe(
  apiKey: string,
  { formId, tagId, email, source }: { formId: number; tagId: number | null; email: string; source?: string }
): Promise<void> {
  const referrer = source && /^https?:\/\//.test(source) ? source : undefined;
  await kitFetch(apiKey, "/subscribers", "Adding to Kit", {
    method: "POST",
    body: JSON.stringify({ email_address: email, state: "inactive" }),
  });
  await kitFetch(apiKey, `/forms/${formId}/subscribers`, "Adding to the Kit form", {
    method: "POST",
    body: JSON.stringify({ email_address: email, ...(referrer ? { referrer } : {}) }),
  });
  if (tagId !== null) {
    await kitFetch(apiKey, `/tags/${tagId}/subscribers`, "Tagging in Kit", {
      method: "POST",
      body: JSON.stringify({ email_address: email }),
    });
  }
}
