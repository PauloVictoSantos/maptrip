import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { tripJson, tripSummaries } from "@/lib/db/trips";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { LIMITS, spanDays } from "@/lib/trips";
import type { TripDoc } from "@/lib/db/types";

// GET /api/trips — trips the viewer takes part in
export async function GET() {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { trips } = await getCollections();
  const rows = await trips.find({ members: viewer }).sort({ start_date: -1 }).limit(100).toArray();
  return NextResponse.json({ trips: await tripSummaries(rows, viewer) });
}

// POST /api/trips { title, city, lat, lng, start_date, end_date }
export async function POST(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!rateLimit(`trip-create:${viewer.toHexString()}:${clientIp(request.headers)}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas viagens criadas seguidas. Aguarde um pouco." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!title || title.length > 80) return NextResponse.json({ error: "Dê um nome à viagem (até 80 caracteres)." }, { status: 400 });
  if (!city || city.length > 80) return NextResponse.json({ error: "Informe o destino." }, { status: 400 });
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Não encontramos esse destino no mapa." }, { status: 400 });
  }
  const span = spanDays(body.start_date, body.end_date);
  if (!span) {
    return NextResponse.json({ error: `Datas inválidas: a volta precisa ser depois da ida, em até ${LIMITS.days} dias.` }, { status: 400 });
  }

  const { trips } = await getCollections();
  if ((await trips.countDocuments({ owner_id: viewer })) >= 100) {
    return NextResponse.json({ error: "Limite de 100 viagens. Exclua viagens antigas." }, { status: 400 });
  }
  const now = new Date();
  const doc: TripDoc = {
    _id: new ObjectId(),
    owner_id: viewer,
    members: [viewer],
    title,
    city,
    lat,
    lng,
    start_date: body.start_date,
    end_date: body.end_date,
    days: Array.from({ length: span }, () => ({ stops: [] })),
    budget: { hospedagem: 0, transporte: 0, alimentacao: 0, passeios: 0 },
    expenses: [],
    version: 1,
    created_at: now,
    updated_at: now,
  };
  await trips.insertOne(doc);
  return NextResponse.json({ trip: await tripJson(doc, viewer) }, { status: 201 });
}
