/**
 * A per-IP limit for the public sign-up endpoint, counted in memory. Good
 * enough for one instance: on a multi-instance deploy each instance counts
 * its own, so the limit is that many times looser (fine for a honeypot's
 * companion; a shared store comes when the CMS keeps its own list and the
 * endpoint matters more).
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const hits = new Map<string, number[]>();

/** The caller's address, from the proxy headers Vercel and most hosts set. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

/** Count one attempt from `ip`; false when it's over the limit. */
export function allowSubscribe(ip: string, now = Date.now()): boolean {
  const since = now - WINDOW_MS;
  const recent = (hits.get(ip) ?? []).filter((t) => t > since);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Keep the map from growing with every address that ever tried once.
  if (hits.size > 10_000) {
    for (const [key, times] of hits) if (!times.some((t) => t > since)) hits.delete(key);
  }
  return true;
}
