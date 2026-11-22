import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { getCollections } from "@/lib/db/mongo";
import { passwordPolicyError } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const INVALID = { error: "Este link é inválido ou expirou. Peça um novo em “Esqueci minha senha”." };

// POST /api/auth/reset { token, password } — sets a new password with a one-time link
export async function POST(request: NextRequest) {
  if (!rateLimit(`reset:${clientIp(request.headers)}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um pouco." }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json(INVALID, { status: 400 });
  const policy = passwordPolicyError(body.password);
  if (policy) return NextResponse.json({ error: policy }, { status: 400 });

  const { users, passwordResets } = await getCollections();
  // Claim the token atomically so it can't be used twice.
  const reset = await passwordResets.findOneAndUpdate(
    { token_hash: createHash("sha256").update(token).digest("hex"), used_at: null, expires_at: { $gt: new Date() } },
    { $set: { used_at: new Date() } }
  );
  if (!reset) return NextResponse.json(INVALID, { status: 400 });

  const result = await users.updateOne(
    { _id: reset.user_id },
    { $set: { password_hash: await bcrypt.hash(body.password, 12), updated_at: new Date() } }
  );
  await passwordResets.deleteMany({ user_id: reset.user_id });
  if (!result.matchedCount) return NextResponse.json(INVALID, { status: 400 });
  return NextResponse.json({ success: true });
}
