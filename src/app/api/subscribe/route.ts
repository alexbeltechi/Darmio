import { NextRequest, NextResponse } from "next/server";
import { siteOrigin } from "@/lib/integrations/syndicate";
import { normalizeEmail } from "@/lib/newsletter/email";
import { getListProvider } from "@/lib/newsletter/provider";
import { allowSubscribe, clientIp } from "@/lib/newsletter/rate-limit";

/**
 * POST /api/subscribe - { email, list?, source?, website? }. The one public
 * door to the newsletter list: the Parabola newsletter block posts here, and
 * so can another of the install's sites. Forwards to the configured provider
 * (`@/lib/newsletter/provider`); the page never learns which.
 *
 * `website` is a honeypot: people never see the field, bots fill it, and a
 * filled one gets the same `ok` as everyone else so the bot learns nothing.
 * A well-formed address always gets `{ data: { ok: true } }`, whether or not
 * it was already on the list, so the list isn't revealed. Rate-limited per
 * IP, in memory (see rate-limit.ts).
 */

/** Origins allowed to post here from the browser: this install and the sites listed in SUBSCRIBE_ORIGINS. */
function allowedOrigins(requestUrl: string): Set<string> {
  const origins = [siteOrigin(requestUrl), new URL(requestUrl).origin, process.env.NEXTAUTH_URL, ...(process.env.SUBSCRIBE_ORIGINS || "").split(",")];
  return new Set(
    origins.flatMap((o) => {
      try {
        return o?.trim() ? [new URL(o.trim()).origin] : [];
      } catch {
        return [];
      }
    })
  );
}

function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins(request.url).has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request);
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

  if (!allowSubscribe(clientIp(request))) {
    return reply({ error: "Too many sign-ups from here; try again in a few minutes" }, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return reply({ error: "Send JSON with an email" }, 400);
  }

  const email = normalizeEmail(body.email);
  if (!email) return reply({ error: "Enter a valid email address" }, 400);

  // The honeypot: a bot filled a field no person sees. Say ok and do nothing.
  if (typeof body.website === "string" && body.website.trim()) return reply({ data: { ok: true } });

  const list = typeof body.list === "string" ? body.list.trim().slice(0, 60) : undefined;
  const source = typeof body.source === "string" ? body.source.trim().slice(0, 200) : undefined;

  try {
    const provider = await getListProvider();
    if (!provider) return reply({ error: "Sign-ups aren't set up yet" }, 503);
    await provider.subscribe(email, { list, source });
    return reply({ data: { ok: true } });
  } catch (error) {
    // The reason is logged here; the visitor gets a line with nothing about the list in it.
    console.error("Sign-up failed:", error);
    return reply({ error: "The list didn't accept the sign-up; try again later" }, 502);
  }
}
