import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo";
import { describeServerError } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/health — deploy diagnostics. Reports only what is set/working, never values.
export async function GET() {
  const secret = process.env.AUTH_SECRET ?? "";
  const checks = {
    mongodb_uri: process.env.MONGODB_URI ? "ok" : "ausente",
    auth_secret: !secret ? "ausente" : secret.length < 32 ? "curta (mínimo 32)" : "ok",
    app_url: process.env.NEXT_PUBLIC_APP_URL ? "ok" : "ausente (usando o endereço da requisição)",
    google_login: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "ok" : "desativado",
    email: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "ok" : "desativado",
    database: "não testado",
  };

  if (checks.mongodb_uri === "ok") {
    try {
      const db = await Promise.race([
        getDb(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("ServerSelection timed out (8s)")), 8000)),
      ]);
      await db.command({ ping: 1 });
      checks.database = "ok";
    } catch (err) {
      console.error("[maptrip] health: banco", err);
      checks.database = describeServerError(err).message;
    }
  }

  const ok = checks.mongodb_uri === "ok" && checks.auth_secret === "ok" && checks.database === "ok";
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
