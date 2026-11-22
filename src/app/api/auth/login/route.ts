import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCollections } from "@/lib/db/mongo";
import { setSessionCookie } from "@/lib/auth/session";
import { ownProfile } from "@/lib/auth/account";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// A real bcrypt hash used when the email doesn't exist, so both paths take the same time.
const DUMMY_HASH = bcrypt.hashSync("maptrip-dummy-password", 12);

// POST /api/auth/login { email, password }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const ip = clientIp(request.headers);
  if (!rateLimit(`login:${ip}`, 20, 15 * 60 * 1000) || !rateLimit(`login:${email}`, 8, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }
  if (!email || !password) {
    return NextResponse.json({ error: "Informe email e senha." }, { status: 400 });
  }

  const { users } = await getCollections();
  const user = await users.findOne({ email });
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    return NextResponse.json({ error: "Email ou senha incorretos." }, { status: 401 });
  }

  const res = NextResponse.json({ user: { id: user._id.toHexString(), email: user.email }, profile: ownProfile(user) });
  await setSessionCookie(res, user._id.toHexString());
  return res;
}
