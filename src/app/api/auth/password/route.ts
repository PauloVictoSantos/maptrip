import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { MIN_PASSWORD } from "@/lib/auth/account";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// POST /api/auth/password { current_password, new_password }
export async function POST(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!rateLimit(`password:${viewer.toHexString()}:${clientIp(request.headers)}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }

  const { current_password, new_password } = await request.json().catch(() => ({}));
  if (typeof new_password !== "string" || new_password.length < MIN_PASSWORD || new_password.length > 200) {
    return NextResponse.json({ error: `A nova senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.` }, { status: 400 });
  }

  const { users } = await getCollections();
  const user = await users.findOne({ _id: viewer }, { projection: { password_hash: 1 } });
  if (!user || typeof current_password !== "string" || !(await bcrypt.compare(current_password, user.password_hash))) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 403 });
  }
  if (await bcrypt.compare(new_password, user.password_hash)) {
    return NextResponse.json({ error: "A nova senha precisa ser diferente da atual." }, { status: 400 });
  }

  await users.updateOne({ _id: viewer }, { $set: { password_hash: await bcrypt.hash(new_password, 12), updated_at: new Date() } });
  return NextResponse.json({ success: true });
}
