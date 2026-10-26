/**
 * The newsletter list: types shared by the admin UI and the server. Nothing
 * here touches the provider's key; that lives in `@/lib/db/integrations` and
 * never reaches the browser. The site's block only ever talks to
 * `POST /api/subscribe`, so pages never know which provider is behind it.
 */

/** Something a person can sign up to: a form (what they join) or a tag (which site they came from). */
export interface KitOption {
  id: number;
  name: string;
}

/**
 * - `unconfigured`: no API key stored yet.
 * - `connected`: the key works; `formId` and `tagId` say whether sign-ups can flow.
 * - `rejected`: Kit refused the key (revoked, or the secret it was sealed with changed); paste it again.
 */
export type KitState = "unconfigured" | "connected" | "rejected";

/** Kit as the admin UI sees it: no key. */
export interface KitStatus {
  state: KitState;
  account?: { name: string; email?: string };
  form?: KitOption | null;
  tag?: KitOption | null;
  connectedAt?: string;
  checkedAt?: string;
  /** Why the key is rejected, when known. */
  error?: string;
}

/** The Kit account the key belongs to; the Kit title in Settings links here. */
export const KIT_URL = "https://app.kit.com";

/** Where in Kit the v4 API key lives. */
export const KIT_DEVELOPER_URL = "https://app.kit.com/account_settings/developer_settings";
