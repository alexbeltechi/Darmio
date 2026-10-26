import crypto from "crypto";

/**
 * Encrypts OAuth tokens at rest (AES-256-GCM). The key is derived from
 * INTEGRATIONS_SECRET, or NEXTAUTH_SECRET when that isn't set. Rotating the
 * secret makes stored tokens unreadable, which shows as "Reconnect needed".
 */
function key(): Buffer {
  const secret = process.env.INTEGRATIONS_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Set INTEGRATIONS_SECRET or NEXTAUTH_SECRET to store integration tokens");
  }
  return crypto.createHash("sha256").update(`integrations:${secret}`).digest();
}

/** `iv.tag.ciphertext`, each base64url. */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(sealed: string): string {
  const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** PKCE S256 challenge for a verifier. */
export function pkceChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}
