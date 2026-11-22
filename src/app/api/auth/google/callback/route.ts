import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections, isDuplicateKey } from "@/lib/db/mongo";
import { setSessionCookie } from "@/lib/auth/session";
import { GOOGLE_STATE_COOKIE, exchangeCode, googleConfigured } from "@/lib/auth/google";
import { appUrl } from "@/lib/auth/mailer";
import { uniqueUsername } from "@/lib/auth/username";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { UserDoc } from "@/lib/db/types";

// GET /api/auth/google/callback?code&state — finishes Google sign-in
export async function GET(request: NextRequest) {
  const base = appUrl(request.nextUrl.origin);
  const fail = (code: string) => {
    const res = NextResponse.redirect(`${base}/login?erro=${code}`);
    res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return res;
  };
  if (!googleConfigured()) return fail("google_indisponivel");
  if (!rateLimit(`google:${clientIp(request.headers)}`, 30, 15 * 60 * 1000)) return fail("muitas_tentativas");

  const sp = request.nextUrl.searchParams;
  if (sp.get("error")) return fail("google_cancelado");
  let saved: { state?: string; verifier?: string; next?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? "{}");
  } catch {
    /* tampered cookie */
  }
  const code = sp.get("code");
  if (!code || !saved.state || !saved.verifier || sp.get("state") !== saved.state) return fail("google_falhou");

  let identity;
  try {
    identity = await exchangeCode(code, saved.verifier, base);
  } catch (err) {
    console.error("[maptrip] Google sign-in", err);
    return fail("google_falhou");
  }

  const { users } = await getCollections();
  // 1) already linked → sign in; 2) new e-mail → new account.
  // An existing password account with the same e-mail is NOT linked automatically: sign-up
  // doesn't verify e-mails, so someone could pre-register a victim's address with a password
  // they know and take over the account once the victim uses Google.
  let user = await users.findOne({ google_sub: identity.sub });
  if (!user && (await users.findOne({ email: identity.email }, { projection: { _id: 1 } }))) {
    return fail("google_conta_existente");
  }
  if (!user) {
    const now = new Date();
    const name = (identity.name ?? "").trim().slice(0, 60) || identity.email.split("@")[0];
    const doc: UserDoc = {
      _id: new ObjectId(),
      email: identity.email,
      password_hash: "",
      google_sub: identity.sub,
      username: await uniqueUsername(name, identity.email),
      display_name: name,
      bio: null,
      avatar_url: null,
      city: null,
      created_at: now,
      updated_at: now,
    };
    try {
      await users.insertOne(doc);
      user = doc;
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
      return fail("google_conta_existente");
    }
  }

  const next = saved.next && saved.next.startsWith("/") && !saved.next.startsWith("//") ? saved.next : "/feed";
  const res = NextResponse.redirect(`${base}${next}`);
  res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
  await setSessionCookie(res, user._id.toHexString(), true);
  return res;
}
