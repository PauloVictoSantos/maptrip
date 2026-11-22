import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db/mongo";
import { EMAIL_RE } from "@/lib/auth/account";
import { appUrl, sendEmail } from "@/lib/auth/mailer";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const RESET_TTL_MIN = 60;

// POST /api/auth/forgot { email }
// Always answers the same way, so it can't be used to find out who has an account.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  const ip = clientIp(request.headers);
  if (!rateLimit(`forgot:${ip}`, 10, 60 * 60 * 1000) || !rateLimit(`forgot:${email}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitos pedidos. Aguarde um pouco antes de pedir outro link." }, { status: 429 });
  }

  const ok = NextResponse.json({ success: true });
  const { users, passwordResets } = await getCollections();
  const user = await users.findOne({ email }, { projection: { _id: 1, display_name: 1, username: 1 } });
  if (!user) return ok;

  // One active link per account: a new request invalidates the previous ones.
  await passwordResets.deleteMany({ user_id: user._id });
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await passwordResets.insertOne({
    _id: new ObjectId(),
    user_id: user._id,
    token_hash: createHash("sha256").update(token).digest("hex"),
    expires_at: new Date(now.getTime() + RESET_TTL_MIN * 60 * 1000),
    used_at: null,
    created_at: now,
  });

  const link = `${appUrl(request.nextUrl.origin)}/redefinir-senha?token=${token}`;
  const name = user.display_name || user.username;
  await sendEmail(
    email,
    "Redefina sua senha do MapTrip",
    `Olá, ${name}!\n\nPara criar uma nova senha, abra o link abaixo (vale por ${RESET_TTL_MIN} minutos e só pode ser usado uma vez):\n${link}\n\nSe você não pediu isso, ignore este e-mail: sua senha continua a mesma.`,
    `<p>Olá, ${escapeHtml(name)}!</p><p>Para criar uma nova senha, clique no botão abaixo. O link vale por ${RESET_TTL_MIN} minutos e só pode ser usado uma vez.</p><p><a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#0E7C86;color:#fff;text-decoration:none;font-weight:700">Criar nova senha</a></p><p style="color:#59625c">Se você não pediu isso, ignore este e-mail: sua senha continua a mesma.</p>`
  );
  return ok;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]!);
}
