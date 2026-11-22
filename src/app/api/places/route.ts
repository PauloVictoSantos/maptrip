import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { placeStatusJson } from "@/lib/db/places";

// GET /api/places?status=quero_visitar|visitado — the viewer's saved places
export async function GET(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const status = request.nextUrl.searchParams.get("status");
  if (status !== "quero_visitar" && status !== "visitado") {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const { placeStatus, places } = await getCollections();
  const rows = await placeStatus.find({ user_id: viewer, status }).sort({ updated_at: -1 }).limit(500).toArray();
  const placeDocs = await places.find({ _id: { $in: rows.map((r) => r.place_id) } }).toArray();
  const byId = new Map(placeDocs.map((p) => [p._id.toHexString(), p]));

  return NextResponse.json({
    items: rows
      .map((r) => placeStatusJson(r, byId.get(r.place_id.toHexString()) ?? null))
      .filter((i) => i.place !== null),
  });
}
