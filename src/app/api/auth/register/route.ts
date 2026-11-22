import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getCollections, isDuplicateKey } from "@/lib/db/mongo";
import { setSessionCookie } from "@/lib/auth/session";
import { EMAIL_RE, MIN_PASSWORD, USERNAME_RE, ownProfile } from "@/lib/auth/account";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { UserDoc } from "@/lib/db/types";

// POST /api/auth/register { email, password, username, city? }
export async function POST(request: NextRequest) {
  if (!rateLimit(`register:${clientIp(request.headers)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um pouco e tente novamente." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const city = typeof body.city === "string" ? body.city.trim().slice(0, 80) : "";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Informe um email válido." }, { status: 400 });
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Username: 3 a 30 caracteres, só letras minúsculas, números e _." },
      { status: 400 }
    );
  }
  if (password.length < MIN_PASSWORD || password.length > 200) {
    return NextResponse.json({ error: `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.` }, { status: 400 });
  }

  const { users } = await getCollections();
  const now = new Date();
  const doc: UserDoc = {
    _id: new ObjectId(),
    email,
    password_hash: await bcrypt.hash(password, 12),
    username,
    display_name: username,
    bio: null,
    avatar_url: null,
    city: city || null,
    created_at: now,
    updated_at: now,
  };

  try {
    await users.insertOne(doc);
  } catch (err) {
    if (isDuplicateKey(err)) {
      const field = (err as { keyPattern?: Record<string, number> }).keyPattern ?? {};
      return NextResponse.json(
        {
          error: field.email
            ? "Este email já está cadastrado. Tente fazer login."
            : "Este username já está em uso. Tente outro.",
        },
        { status: 409 }
      );
    }
    throw err;
  }

  const res = NextResponse.json({ user: { id: doc._id.toHexString(), email }, profile: ownProfile(doc) }, { status: 201 });
  await setSessionCookie(res, doc._id.toHexString());
  return res;
}
