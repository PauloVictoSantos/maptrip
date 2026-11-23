import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getCollections, isDuplicateKey } from "@/lib/db/mongo";
import { setSessionCookie } from "@/lib/auth/session";
import { EMAIL_RE, RESERVED_USERNAMES, USERNAME_RE, ownProfile } from "@/lib/auth/account";
import { uniqueUsername } from "@/lib/auth/username";
import { passwordPolicyError } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { UserDoc } from "@/lib/db/types";

// POST /api/auth/register { name, email, password, username?, city? }
// The @username is generated from the name when not given.
async function handlePOST(request: NextRequest) {
  if (!rateLimit(`register:${clientIp(request.headers)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um pouco e tente novamente." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const requested = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const city = typeof body.city === "string" ? body.city.trim().slice(0, 80) : "";

  if (name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: "Informe seu nome completo (2 a 60 caracteres).", field: "name" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Informe um e-mail válido.", field: "email" }, { status: 400 });
  }
  if (requested && RESERVED_USERNAMES.has(requested)) {
    return NextResponse.json({ error: "Este usuário não está disponível. Escolha outro.", field: "username" }, { status: 400 });
  }
  if (requested && !USERNAME_RE.test(requested)) {
    return NextResponse.json({ error: "Usuário: 3 a 30 caracteres, só letras minúsculas, números e _.", field: "username" }, { status: 400 });
  }
  const policy = passwordPolicyError(password);
  if (policy) return NextResponse.json({ error: policy, field: "password" }, { status: 400 });

  const { users } = await getCollections();
  const now = new Date();
  const doc: UserDoc = {
    _id: new ObjectId(),
    email,
    password_hash: await bcrypt.hash(password, 12),
    username: requested || (await uniqueUsername(name, email)),
    display_name: name,
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
        field.email
          ? { error: "Este e-mail já está cadastrado. Tente entrar.", field: "email" }
          : { error: "Este usuário já está em uso. Tente de novo.", field: "username" },
        { status: 409 }
      );
    }
    throw err;
  }

  const res = NextResponse.json({ user: { id: doc._id.toHexString(), email }, profile: ownProfile(doc) }, { status: 201 });
  await setSessionCookie(res, doc._id.toHexString(), true);
  return res;
}

export const POST = withErrors(handlePOST);
