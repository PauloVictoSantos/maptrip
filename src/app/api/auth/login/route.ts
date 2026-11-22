import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCollections } from "@/lib/db/mongo";
import { setSessionCookie } from "@/lib/auth/session";
import { ownProfile } from "@/lib/auth/account";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// A real bcrypt hash used when the email doesn't exist, so both paths take the same time.
const DUMMY_HASH = bcrypt.hashSync("maptrip-dummy-password", 12);

// POST /api/auth/login { email, password, remember? }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember !== false;

  const ip = clientIp(request.headers);
  if (!rateLimit(`login:${ip}`, 20, 15 * 60 * 1000) || !rateLimit(`login:${email}`, 8, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }
  if (!email || !password) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  const { users } = await getCollections();
  const user = await users.findOne({ email });
  // Google-only accounts have no password: compare against the dummy hash so timing stays the same.
  const ok = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
  if (!user || !user.password_hash || !ok) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const res = NextResponse.json({ user: { id: user._id.toHexString(), email: user.email }, profile: ownProfile(user) });
  await setSessionCookie(res, user._id.toHexString(), remember);
  return res;
}
