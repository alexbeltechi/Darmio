/**
 * Limits on wrong passwords, kept in the hub so they hold across server
 * instances. Per email: 5 misses in 15 minutes locks that email for 15
 * minutes. Per address (IP): 20 misses in 15 minutes, against trying one
 * password on many emails. A correct sign-in clears its email's count.
 */
import { getHubDb } from "@/lib/db/mongodb";

const COLLECTION = "login_attempts";
const WINDOW_MS = 15 * 60_000;
const LIMITS = { email: 5, ip: 20 } as const;

type Kind = keyof typeof LIMITS;

let indexed = false;
async function attempts() {
  const db = await getHubDb();
  const collection = db.collection(COLLECTION);
  if (!indexed) {
    // Rows remove themselves once their window has passed.
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    indexed = true;
  }
  return collection;
}

const keyOf = (kind: Kind, value: string) => `${kind}:${value.toLowerCase()}`;

/** Minutes until signing in is allowed again for this email or address, or 0. */
export async function lockedForMinutes(email: string, ip: string | null): Promise<number> {
  const collection = await attempts();
  const keys = [keyOf("email", email), ...(ip ? [keyOf("ip", ip)] : [])];
  const rows = await collection.find({ key: { $in: keys } }).toArray();
  const now = Date.now();
  const locked = rows
    .filter((row) => row.count >= LIMITS[(row.key as string).split(":")[0] as Kind])
    .map((row) => (row.expiresAt as Date).getTime() - now);
  return locked.length ? Math.max(1, Math.ceil(Math.max(...locked) / 60_000)) : 0;
}

/** Count a wrong password against the email and the address. */
export async function recordMiss(email: string, ip: string | null): Promise<void> {
  const collection = await attempts();
  const expiresAt = new Date(Date.now() + WINDOW_MS);
  for (const key of [keyOf("email", email), ...(ip ? [keyOf("ip", ip)] : [])]) {
    await collection.updateOne(
      { key },
      [{ $set: { key, count: { $add: [{ $ifNull: ["$count", 0] }, 1] }, expiresAt } }],
      { upsert: true }
    );
  }
}

/** A correct sign-in: forget the email's misses. */
export async function clearMisses(email: string): Promise<void> {
  const collection = await attempts();
  await collection.deleteOne({ key: keyOf("email", email) });
}
