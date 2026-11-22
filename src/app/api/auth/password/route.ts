import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { passwordPolicyError } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// POST /api/auth/password { current_password, new_password }
export async function POST(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!rateLimit(`password:${viewer.toHexString()}:${clientIp(request.headers)}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }

  const { current_password, new_password } = await request.json().catch(() => ({}));
  const policy = passwordPolicyError(new_password);
  if (policy) return NextResponse.json({ error: policy }, { status: 400 });

  const { users } = await getCollections();
  const user = await users.findOne({ _id: viewer }, { projection: { password_hash: 1 } });
  if (user && !user.password_hash) {
    return NextResponse.json({ error: "Sua conta foi criada com o Google. Use “Esqueci minha senha” no login para criar uma senha." }, { status: 400 });
  }
  if (!user || typeof current_password !== "string" || !(await bcrypt.compare(current_password, user.password_hash))) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 403 });
  }
  if (await bcrypt.compare(new_password, user.password_hash)) {
    return NextResponse.json({ error: "A nova senha precisa ser diferente da atual." }, { status: 400 });
  }

  await users.updateOne({ _id: viewer }, { $set: { password_hash: await bcrypt.hash(new_password, 12), updated_at: new Date() } });
  return NextResponse.json({ success: true });
}
