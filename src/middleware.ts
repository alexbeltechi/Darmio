/**
 * Next.js Middleware
 *
 * Protects admin routes with NextAuth session check.
 * Unauthenticated users are redirected to login.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Bearer-token auth for non-browser clients (ingest scripts, agents).
 * Only valid on the JSON API — never on the /admin UI.
 */
function hasValidAgentToken(request: NextRequest): boolean {
  const expected = process.env.CMS_AGENT_TOKEN;
  if (!expected || expected.length < 32) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  return constantTimeEquals(header.slice(7), expected);
}

/**
 * Pass the request on, saying who made it: `x-cms-actor` is "agent" or "user"
 * and `x-cms-user-id` the signed-in person's id (neither taken from the client).
 */
function forward(request: NextRequest, actor: "agent" | "user", userId?: string) {
  const headers = new Headers(request.headers);
  headers.set("x-cms-actor", actor);
  headers.delete("x-cms-user-id");
  if (userId) headers.set("x-cms-user-id", userId);
  return NextResponse.next({ request: { headers } });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow these routes without authentication
  if (
    pathname === "/admin/login" ||
    pathname === "/admin/setup" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin/") && hasValidAgentToken(request)) {
    return forward(request, "agent");
  }

  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  if (!token) {
    if (pathname.startsWith("/api/admin/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return forward(request, "user", typeof token.id === "string" ? token.id : token.sub);
}

// Apply middleware to admin routes and admin API routes
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
