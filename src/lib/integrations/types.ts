/**
 * Cross-posting integrations: types and constants shared by the admin UI and
 * the server. Nothing here touches tokens; those live in
 * `@/lib/db/integrations` and never reach the browser.
 */

export type Platform = "x" | "linkedin";

export const PLATFORMS: Platform[] = ["x", "linkedin"];

export const PLATFORM_META: Record<
  Platform,
  {
    name: string;
    /** Longest post the platform accepts, in characters. */
    maxLength: number;
    /** Env vars the developer app needs. */
    env: [string, string];
    /** Where to create the developer app. */
    developerUrl: string;
    /** The platform itself, linked from its name when no account is connected. */
    siteUrl: string;
  }
> = {
  x: {
    name: "X",
    maxLength: 280,
    env: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
    developerUrl: "https://developer.x.com/en/portal/dashboard",
    siteUrl: "https://x.com",
  },
  linkedin: {
    name: "LinkedIn",
    maxLength: 3000,
    env: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    developerUrl: "https://www.linkedin.com/developers/apps",
    siteUrl: "https://www.linkedin.com",
  },
};

export function isPlatform(value: unknown): value is Platform {
  return value === "x" || value === "linkedin";
}

/** The OAuth callback path the developer app must allow as a redirect URL. */
export function callbackPath(platform: Platform): string {
  return `/api/admin/integrations/${platform}/callback`;
}

/**
 * - `unconfigured`: the developer app's client id/secret aren't in the env.
 * - `disconnected`: configured, but no account is linked.
 * - `connected`: linked and usable.
 * - `expired`: linked, but the token ran out or was rejected; reconnect.
 */
export type ConnectionState = "unconfigured" | "disconnected" | "connected" | "expired";

/** A connection as the admin UI sees it: no tokens. */
export interface ConnectionStatus {
  platform: Platform;
  state: ConnectionState;
  account?: { name: string; handle?: string; url?: string };
  connectedAt?: string;
  /** When the access token runs out, if it can't renew itself. Null when it renews automatically. */
  expiresAt?: string | null;
  /** Last time the token was checked against the platform. */
  checkedAt?: string;
  /** Why the connection is expired, when known. */
  error?: string;
}

/** The result of cross-posting one post to one platform, kept on the post. */
export interface SyndicationRecord {
  status: "posted" | "failed";
  /** The post on the platform. */
  url?: string;
  externalId?: string;
  error?: string;
  at: string;
}

export type Syndication = Partial<Record<Platform, SyndicationRecord>>;

/** Which platforms a post should go to when it's published. */
export type Crosspost = Partial<Record<Platform, boolean>>;

/** A preset for a post's "Source:" line, edited in Settings. */
export interface SourceLabel {
  id: string;
  name: string;
  /** Set when posting to this platform should fill the source line with this label. */
  platform?: Platform | null;
}

export interface SourceLineSettings {
  enabled: boolean;
  /** Text before the link, e.g. "Source:" or "Originally posted on". */
  prefix: string;
}

export const DEFAULT_SOURCE_LABELS: SourceLabel[] = [
  { id: "x", name: "X", platform: "x" },
  { id: "linkedin", name: "LinkedIn", platform: "linkedin" },
];

export const DEFAULT_SOURCE_LINE: SourceLineSettings = {
  enabled: true,
  prefix: "Source:",
};

/** Only http(s) links are rendered, so a pasted `javascript:` URL never becomes a link. */
export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
