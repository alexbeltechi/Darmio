import { NextRequest, NextResponse } from "next/server";
import { pkceChallenge, randomToken } from "@/lib/integrations/crypto";
import { OAUTH_COOKIE, getCredentials, providers } from "@/lib/integrations/providers";
import { siteOrigin } from "@/lib/integrations/syndicate";
import { callbackPath, isPlatform } from "@/lib/integrations/types";

// GET /api/admin/integrations/[platform]/connect - Send the browser to the platform to sign in.
export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const settingsUrl = new URL("/admin/settings", request.url);

  if (!isPlatform(platform) || !getCredentials(platform)) {
    settingsUrl.searchParams.set("integration", platform);
    settingsUrl.searchParams.set("error", "Not set up: add the developer app's client id and secret to the env");
    return NextResponse.redirect(settingsUrl);
  }

  const state = randomToken(16);
  const verifier = randomToken(48);
  const redirectUri = `${siteOrigin(request.url)}${callbackPath(platform)}`;
  const authorizeUrl =
    platform === "x"
      ? providers.x.authorizeUrl(redirectUri, state, pkceChallenge(verifier))
      : providers.linkedin.authorizeUrl(redirectUri, state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_COOKIE, JSON.stringify({ platform, state, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax: the platform's redirect back is a top-level GET, which still carries it.
    sameSite: "lax",
    path: "/api/admin/integrations",
    maxAge: 600,
  });
  return response;
}
