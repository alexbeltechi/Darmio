/**
 * The X and LinkedIn APIs: OAuth, checking a token, and posting text.
 * Server only. Each call takes a plain access token; storing, refreshing and
 * marking tokens expired is `@/lib/db/integrations`' job.
 */

import { PLATFORM_META, type Platform } from "./types";

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  /** When the access token runs out. */
  expiresAt: string | null;
}

export interface Account {
  id: string;
  name: string;
  handle?: string;
  url?: string;
}

export interface PublishedPost {
  externalId: string;
  url: string;
}

/** Short-lived cookie holding the OAuth state (and PKCE verifier) from connect to callback. */
export const OAUTH_COOKIE = "integration_oauth";

/** The platform rejected the token: it expired or was revoked. */
export class AuthError extends Error {}

export function getCredentials(platform: Platform): { clientId: string; clientSecret: string } | null {
  const [idVar, secretVar] = PLATFORM_META[platform].env;
  const clientId = process.env[idVar];
  const clientSecret = process.env[secretVar];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function requireCredentials(platform: Platform) {
  const creds = getCredentials(platform);
  if (!creds) throw new Error(`${PLATFORM_META[platform].name} isn't set up: add ${PLATFORM_META[platform].env.join(" and ")} to the env`);
  return creds;
}

function expiresAt(expiresIn: unknown): string | null {
  return typeof expiresIn === "number" ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
}

/** Throws AuthError on 401, and a readable Error on anything else that isn't OK. */
async function check(res: Response, what: string): Promise<Response> {
  if (res.ok) return res;
  const body = await res.text().catch(() => "");
  let detail = body.slice(0, 300);
  try {
    const json = JSON.parse(body);
    detail = json.detail || json.message || json.error_description || json.title || json.error || detail;
  } catch {
    // Not JSON; keep the raw text.
  }
  if (res.status === 401) throw new AuthError(`${what}: token rejected (${detail || "401"})`);
  throw new Error(`${what} failed (${res.status})${detail ? `: ${detail}` : ""}`);
}

// ─── X ──────────────────────────────────────────────────────────────────────
// OAuth 2.0 with PKCE. Access tokens last 2 hours; `offline.access` adds a
// refresh token, which rotates on every refresh.

const X_SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

function xBasicAuth() {
  const { clientId, clientSecret } = requireCredentials("x");
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function xToken(params: Record<string, string>): Promise<TokenSet> {
  const res = await check(
    await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: xBasicAuth() },
      body: new URLSearchParams({ ...params, client_id: requireCredentials("x").clientId }),
    }),
    "X token"
  );
  const json = await res.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: expiresAt(json.expires_in),
  };
}

const x = {
  authorizeUrl(redirectUri: string, state: string, challenge: string): string {
    const url = new URL("https://x.com/i/oauth2/authorize");
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: requireCredentials("x").clientId,
      redirect_uri: redirectUri,
      scope: X_SCOPES.join(" "),
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString();
    return url.toString();
  },

  exchangeCode(code: string, redirectUri: string, verifier: string) {
    return xToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier });
  },

  refresh(refreshToken: string) {
    return xToken({ grant_type: "refresh_token", refresh_token: refreshToken });
  },

  async account(accessToken: string): Promise<Account> {
    const res = await check(
      await fetch("https://api.x.com/2/users/me", { headers: { Authorization: `Bearer ${accessToken}` } }),
      "X account"
    );
    const { data } = await res.json();
    return { id: data.id, name: data.name, handle: `@${data.username}`, url: `https://x.com/${data.username}` };
  },

  async publish(accessToken: string, text: string, account: Account): Promise<PublishedPost> {
    const res = await check(
      await fetch("https://api.x.com/2/tweets", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }),
      "Posting to X"
    );
    const { data } = await res.json();
    const username = account.handle?.replace(/^@/, "") || "i/web";
    return { externalId: data.id, url: `https://x.com/${username}/status/${data.id}` };
  },
};

// ─── LinkedIn ───────────────────────────────────────────────────────────────
// Needs the "Sign In with LinkedIn using OpenID Connect" and "Share on
// LinkedIn" products on the developer app. Tokens last 60 days; refresh
// tokens are only issued to approved partners, so usually you reconnect.

const LINKEDIN_SCOPES = ["openid", "profile", "w_member_social"];

/**
 * The Posts API wants a dated version (YYYYMM), and each is retired after
 * about a year. Default to three months back so it never points at a version
 * that isn't out yet; LINKEDIN_API_VERSION pins one.
 */
function linkedinVersion(): string {
  if (process.env.LINKEDIN_API_VERSION) return process.env.LINKEDIN_API_VERSION;
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 3);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** LinkedIn's "little text" format treats these as markup; unescaped, they can cut the post short. */
function escapeLittleText(text: string): string {
  return text.replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`);
}

async function linkedinToken(params: Record<string, string>): Promise<TokenSet> {
  const { clientId, clientSecret } = requireCredentials("linkedin");
  const res = await check(
    await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...params, client_id: clientId, client_secret: clientSecret }),
    }),
    "LinkedIn token"
  );
  const json = await res.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: expiresAt(json.expires_in),
  };
}

const linkedin = {
  authorizeUrl(redirectUri: string, state: string): string {
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: requireCredentials("linkedin").clientId,
      redirect_uri: redirectUri,
      scope: LINKEDIN_SCOPES.join(" "),
      state,
    }).toString();
    return url.toString();
  },

  exchangeCode(code: string, redirectUri: string) {
    return linkedinToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  },

  refresh(refreshToken: string) {
    return linkedinToken({ grant_type: "refresh_token", refresh_token: refreshToken });
  },

  async account(accessToken: string): Promise<Account> {
    const res = await check(
      await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } }),
      "LinkedIn account"
    );
    const data = await res.json();
    return { id: data.sub, name: data.name || [data.given_name, data.family_name].filter(Boolean).join(" ") };
  },

  async publish(accessToken: string, text: string, account: Account): Promise<PublishedPost> {
    const res = await check(
      await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": linkedinVersion(),
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: `urn:li:person:${account.id}`,
          commentary: escapeLittleText(text),
          visibility: "PUBLIC",
          distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
          lifecycleState: "PUBLISHED",
          isReshareDisabledByAuthor: false,
        }),
      }),
      "Posting to LinkedIn"
    );
    const urn = res.headers.get("x-restli-id") || "";
    return { externalId: urn, url: `https://www.linkedin.com/feed/update/${urn}/` };
  },
};

export const providers = { x, linkedin };
