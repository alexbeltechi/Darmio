/**
 * MongoDB storage for the `integrations` collection: one document per
 * cross-posting platform (tokens encrypted) and one for the newsletter list
 * provider (its API key encrypted). Server only; the admin UI only ever sees
 * `ConnectionStatus` and `KitStatus`.
 */

import { getDb, Collections } from "@/lib/db/mongodb";
import { decrypt, encrypt } from "@/lib/integrations/crypto";
import { AuthError, getCredentials, providers, type Account, type TokenSet } from "@/lib/integrations/providers";
import { PLATFORMS, type ConnectionStatus, type Platform } from "@/lib/integrations/types";
import type { KitOption, KitStatus } from "@/lib/newsletter/types";

interface ConnectionDoc {
  platform: Platform;
  accessToken: string; // encrypted
  refreshToken: string | null; // encrypted
  expiresAt: string | null;
  account: Account;
  connectedAt: string;
  checkedAt?: string;
  /** Set when the platform rejected the token or a refresh failed. */
  invalidAt?: string | null;
  error?: string | null;
}

// Refresh a little early, so a token doesn't run out mid-request.
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

async function collection() {
  const db = await getDb();
  return db.collection<ConnectionDoc>(Collections.INTEGRATIONS);
}

async function getDoc(platform: Platform): Promise<ConnectionDoc | null> {
  return (await collection()).findOne({ platform }, { projection: { _id: 0 } });
}

function isPastExpiry(doc: ConnectionDoc): boolean {
  return !!doc.expiresAt && new Date(doc.expiresAt).getTime() - EXPIRY_MARGIN_MS < Date.now();
}

function toStatus(platform: Platform, doc: ConnectionDoc | null): ConnectionStatus {
  if (!getCredentials(platform)) return { platform, state: "unconfigured" };
  if (!doc) return { platform, state: "disconnected" };

  const expired = !!doc.invalidAt || (isPastExpiry(doc) && !doc.refreshToken);
  return {
    platform,
    state: expired ? "expired" : "connected",
    account: { name: doc.account.name, handle: doc.account.handle, url: doc.account.url },
    connectedAt: doc.connectedAt,
    // A token with a refresh token renews itself; only show a date when it won't.
    expiresAt: doc.refreshToken ? null : doc.expiresAt,
    checkedAt: doc.checkedAt,
    error: expired ? doc.error || (doc.invalidAt ? "The platform rejected the token" : "The token expired") : undefined,
  };
}

export async function markExpired(platform: Platform, error: string): Promise<void> {
  const now = new Date().toISOString();
  await (await collection()).updateOne({ platform }, { $set: { invalidAt: now, checkedAt: now, error } });
}

export async function saveConnection(platform: Platform, tokens: TokenSet, account: Account): Promise<void> {
  const now = new Date().toISOString();
  const doc: ConnectionDoc = {
    platform,
    accessToken: encrypt(tokens.accessToken),
    refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
    expiresAt: tokens.expiresAt,
    account,
    connectedAt: now,
    checkedAt: now,
    invalidAt: null,
    error: null,
  };
  await (await collection()).replaceOne({ platform }, doc, { upsert: true });
}

export async function deleteConnection(platform: Platform): Promise<void> {
  await (await collection()).deleteOne({ platform });
}

/**
 * A usable access token and the account it belongs to, refreshing it first
 * if it's about to run out. Null (and the connection marked expired) when
 * there's no way to get one without reconnecting.
 */
export async function getAccessToken(platform: Platform): Promise<{ accessToken: string; account: Account } | null> {
  const doc = await getDoc(platform);
  if (!doc || doc.invalidAt || !getCredentials(platform)) return null;

  let accessToken: string;
  let refreshToken: string | null;
  try {
    accessToken = decrypt(doc.accessToken);
    refreshToken = doc.refreshToken ? decrypt(doc.refreshToken) : null;
  } catch {
    // The secret the tokens were sealed with changed.
    await markExpired(platform, "Stored token can't be read; reconnect");
    return null;
  }

  if (!isPastExpiry(doc)) return { accessToken, account: doc.account };

  if (!refreshToken) {
    await markExpired(platform, "The token expired");
    return null;
  }

  try {
    const fresh = await providers[platform].refresh(refreshToken);
    await (await collection()).updateOne(
      { platform },
      {
        $set: {
          accessToken: encrypt(fresh.accessToken),
          // X rotates the refresh token; keep the old one if none came back.
          refreshToken: encrypt(fresh.refreshToken ?? refreshToken),
          expiresAt: fresh.expiresAt,
          checkedAt: new Date().toISOString(),
        },
      }
    );
    return { accessToken: fresh.accessToken, account: doc.account };
  } catch (error) {
    await markExpired(platform, error instanceof Error ? error.message : "Refreshing the token failed");
    return null;
  }
}

/** Every platform's status, from what's stored (no calls out). */
export async function getConnectionStatuses(): Promise<ConnectionStatus[]> {
  const docs = await (await collection()).find({}, { projection: { _id: 0 } }).toArray();
  return PLATFORMS.map((p) => toStatus(p, docs.find((d) => d.platform === p) ?? null));
}

/**
 * Check each connected token against its platform, so one revoked on the
 * platform's side shows as expired. Network trouble leaves it as it was.
 */
export async function verifyConnections(): Promise<ConnectionStatus[]> {
  await Promise.all(
    PLATFORMS.map(async (platform) => {
      const token = await getAccessToken(platform);
      if (!token) return;
      try {
        const account = await providers[platform].account(token.accessToken);
        await (await collection()).updateOne(
          { platform },
          { $set: { account: { ...token.account, ...account }, checkedAt: new Date().toISOString() } }
        );
      } catch (error) {
        if (error instanceof AuthError) await markExpired(platform, error.message);
      }
    })
  );
  return getConnectionStatuses();
}

// ─── Newsletter list provider (Kit) ─────────────────────────────────────────
// One document, keyed by `provider` rather than `platform`, so the platform
// queries above never see it.

interface KitDoc {
  provider: "kit";
  apiKey: string; // encrypted
  account: { name: string; email?: string };
  form: KitOption | null;
  tag: KitOption | null;
  connectedAt: string;
  checkedAt?: string;
  /** Set when Kit rejected the key. */
  invalidAt?: string | null;
  error?: string | null;
}

async function kitCollection() {
  const db = await getDb();
  return db.collection<KitDoc>(Collections.INTEGRATIONS);
}

async function getKitDoc(): Promise<KitDoc | null> {
  return (await kitCollection()).findOne({ provider: "kit" }, { projection: { _id: 0 } });
}

function toKitStatus(doc: KitDoc | null): KitStatus {
  if (!doc) return { state: "unconfigured" };
  return {
    state: doc.invalidAt ? "rejected" : "connected",
    account: doc.account,
    form: doc.form,
    tag: doc.tag,
    connectedAt: doc.connectedAt,
    checkedAt: doc.checkedAt,
    error: doc.invalidAt ? doc.error || "Kit rejected the API key" : undefined,
  };
}

export async function getKitStatus(): Promise<KitStatus> {
  return toKitStatus(await getKitDoc());
}

/** Store a key that `kitAccount` has just checked. A form and tag chosen before are kept. */
export async function saveKitKey(apiKey: string, account: KitDoc["account"]): Promise<KitStatus> {
  const now = new Date().toISOString();
  const previous = await getKitDoc();
  const doc: KitDoc = {
    provider: "kit",
    apiKey: encrypt(apiKey),
    account,
    form: previous?.form ?? null,
    tag: previous?.tag ?? null,
    connectedAt: now,
    checkedAt: now,
    invalidAt: null,
    error: null,
  };
  await (await kitCollection()).replaceOne({ provider: "kit" }, doc, { upsert: true });
  return toKitStatus(doc);
}

/** Which form sign-ups join and which tag they get. `null` clears one. */
export async function saveKitChoice(choice: { form?: KitOption | null; tag?: KitOption | null }): Promise<KitStatus> {
  const $set: Partial<KitDoc> = {};
  if (choice.form !== undefined) $set.form = choice.form;
  if (choice.tag !== undefined) $set.tag = choice.tag;
  const result = await (await kitCollection()).findOneAndUpdate(
    { provider: "kit" },
    { $set },
    { returnDocument: "after", projection: { _id: 0 } }
  );
  if (!result) throw new Error("Paste a Kit API key first");
  return toKitStatus(result);
}

export async function markKitRejected(error: string): Promise<void> {
  const now = new Date().toISOString();
  await (await kitCollection()).updateOne({ provider: "kit" }, { $set: { invalidAt: now, checkedAt: now, error } });
}

export async function deleteKit(): Promise<void> {
  await (await kitCollection()).deleteOne({ provider: "kit" });
}

/**
 * The stored key, decrypted, with the chosen form and tag. Null when there's
 * no usable key (none stored, rejected, or sealed with a secret that changed,
 * which marks it rejected).
 */
export async function getKitConfig(): Promise<{ apiKey: string; form: KitOption | null; tag: KitOption | null } | null> {
  const doc = await getKitDoc();
  if (!doc || doc.invalidAt) return null;
  try {
    return { apiKey: decrypt(doc.apiKey), form: doc.form, tag: doc.tag };
  } catch {
    await markKitRejected("Stored key can't be read; paste it again");
    return null;
  }
}
