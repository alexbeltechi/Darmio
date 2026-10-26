/** Who made an admin API request: an agent (bearer token) or Alex (signed in). Set by the middleware. */
export type Actor = "agent" | "user";

export function getActor(request: Request): Actor {
  return request.headers.get("x-cms-actor") === "agent" ? "agent" : "user";
}

/** The signed-in person's user id, or null for an agent. Set by the middleware. */
export function getUserId(request: Request): string | null {
  return request.headers.get("x-cms-user-id") || null;
}
