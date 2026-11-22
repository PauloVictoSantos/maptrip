import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { GOOGLE_STATE_COOKIE, googleConfigured, redirectUri } from "@/lib/auth/google";
import { appUrl } from "@/lib/auth/mailer";

// GET /api/auth/google?next=/feed — starts Google sign-in / sign-up
export async function GET(request: NextRequest) {
  const base = appUrl(request.nextUrl.origin);
  if (!googleConfigured()) return NextResponse.redirect(`${base}/login?erro=google_indisponivel`);

  const rawNext = request.nextUrl.searchParams.get("next") || "/feed";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\") ? rawNext.slice(0, 300) : "/feed";
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(base),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const res = NextResponse.redirect(url);
  // State + PKCE verifier live in a short httpOnly cookie, checked on the callback (CSRF protection).
  res.cookies.set(GOOGLE_STATE_COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  return res;
}
