/**
 * One-time password reset links. Darmio can't send
 * email yet, so the owner's AI makes the link from a computer with the site's
 * settings (`npm run reset-link`) and hands it over; the owner chooses the
 * new password on the site itself, never in the chat. Kept in the hub, as
 * the accounts are. Only a hash of the token is stored; a link works once,
 * for an hour, and a new one replaces any earlier one for that account.
 */
import { createHash, randomBytes } from "node:crypto";
import { getHubDb } from "@/lib/db/mongodb";

const COLLECTION = "password_resets";
const LIFETIME_MS = 60 * 60_000;

const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");

let indexed = false;
async function resets() {
  const db = await getHubDb();
  const collection = db.collection(COLLECTION);
  if (!indexed) {
    // Rows remove themselves once they've expired.
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    indexed = true;
  }
  return collection;
}

/** A fresh reset token for this account; earlier ones stop working. */
export async function createResetToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const collection = await resets();
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + LIFETIME_MS);
  await collection.deleteMany({ userId });
  await collection.insertOne({ tokenHash: hashOf(token), userId, expiresAt });
  return { token, expiresAt };
}

/** The account a token resets, while it's still good; null otherwise. */
export async function resetTokenUser(token: string): Promise<string | null> {
  if (!token) return null;
  const row = await (await resets()).findOne({ tokenHash: hashOf(token), expiresAt: { $gt: new Date() } });
  return row ? (row.userId as string) : null;
}

/** Use a token up: the account it resets, or null if it's wrong, spent or expired. */
export async function spendResetToken(token: string): Promise<string | null> {
  if (!token) return null;
  const row = await (await resets()).findOneAndDelete({ tokenHash: hashOf(token), expiresAt: { $gt: new Date() } });
  return row ? (row.userId as string) : null;
}
