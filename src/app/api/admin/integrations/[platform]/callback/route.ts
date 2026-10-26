import { NextRequest, NextResponse } from "next/server";
import { saveConnection } from "@/lib/db/integrations";
import { OAUTH_COOKIE, providers } from "@/lib/integrations/providers";
import { siteOrigin } from "@/lib/integrations/syndicate";
import { callbackPath, isPlatform } from "@/lib/integrations/types";

// GET /api/admin/integrations/[platform]/callback - The platform sends the browser
// back here after sign-in. Swap the code for tokens, store them, return to Settings.
export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const { searchParams } = request.nextUrl;

  const back = (result: { error?: string }) => {
    const url = new URL("/admin/settings", request.url);
    url.searchParams.set("integration", platform);
    if (result.error) url.searchParams.set("error", result.error);
    else url.searchParams.set("connected", "1");
    url.hash = platform;
    const response = NextResponse.redirect(url);
    response.cookies.delete({ name: OAUTH_COOKIE, path: "/api/admin/integrations" });
    return response;
  };

  if (!isPlatform(platform)) return back({ error: "Unknown platform" });

  // Cancelled or refused on the platform's side.
  const denied = searchParams.get("error_description") || searchParams.get("error");
  if (denied) return back({ error: denied });

  let saved: { platform?: string; state?: string; verifier?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get(OAUTH_COOKIE)?.value || "{}");
  } catch {
    // Treated as missing below.
  }
  const code = searchParams.get("code");
  if (!code || !saved.state || saved.platform !== platform || saved.state !== searchParams.get("state")) {
    return back({ error: "Sign-in didn't match; try connecting again" });
  }

  try {
    const redirectUri = `${siteOrigin(request.url)}${callbackPath(platform)}`;
    const tokens =
      platform === "x"
        ? await providers.x.exchangeCode(code, redirectUri, saved.verifier || "")
        : await providers.linkedin.exchangeCode(code, redirectUri);
    const account = await providers[platform].account(tokens.accessToken);
    await saveConnection(platform, tokens, account);
    return back({});
  } catch (error) {
    console.error(`Connecting ${platform} failed:`, error);
    return back({ error: error instanceof Error ? error.message : "Connecting failed" });
  }
}
