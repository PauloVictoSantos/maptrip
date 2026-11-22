import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Google sign-in (OAuth 2.0 authorization code + PKCE, OpenID Connect).
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; the redirect URI registered in
// Google Cloud must be <NEXT_PUBLIC_APP_URL>/api/auth/google/callback.

export const GOOGLE_STATE_COOKIE = "mt_google";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export function googleConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function redirectUri(base: string) {
  return `${base}/api/auth/google/callback`;
}

export type GoogleIdentity = { sub: string; email: string; name: string | null };

/** Exchanges the code and verifies the ID token signature, issuer, audience and expiry. */
export async function exchangeCode(code: string, verifier: string, base: string): Promise<GoogleIdentity> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(base),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("sem id_token");

  const { payload } = await jwtVerify(id_token, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  if (typeof payload.sub !== "string" || typeof payload.email !== "string" || payload.email_verified !== true) {
    throw new Error("e-mail não verificado");
  }
  return { sub: payload.sub, email: payload.email.toLowerCase(), name: typeof payload.name === "string" ? payload.name : null };
}
