import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections, toObjectId } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { placeStatusJson } from "@/lib/db/places";
import { geoPoint, type PlaceDoc } from "@/lib/db/types";

const EARTH_RADIUS_M = 6378100;

// POST /api/places/status
// body: { place: {lat, lng, name, place_name, category}, place_id?, status, rating?, notes?, visited_at? }
export async function POST(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { place, place_id, status, rating, notes, visited_at } = body;

  if (status !== "quero_visitar" && status !== "visitado") {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }
  const ratingNum = rating == null || rating === "" ? null : Number(rating);
  if (ratingNum !== null && (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5)) {
    return NextResponse.json({ error: "Nota deve ser entre 1 e 5" }, { status: 400 });
  }

  const { places, placeStatus } = await getCollections();
  let placeDoc: PlaceDoc | null = null;

  const existingId = toObjectId(place_id);
  if (existingId) {
    placeDoc = await places.findOne({ _id: existingId });
  }
  if (!placeDoc) {
    const lat = Number(place?.lat);
    const lng = Number(place?.lng);
    const name = typeof place?.name === "string" ? place.name.trim().slice(0, 200) : "";
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !name) {
      return NextResponse.json({ error: "Dados do lugar incompletos" }, { status: 400 });
    }
    // Simple dedupe: same name within ~50 m
    placeDoc = await places.findOne({
      name,
      location: { $geoWithin: { $centerSphere: [[lng, lat], 50 / EARTH_RADIUS_M] } },
    });
    if (!placeDoc) {
      placeDoc = {
        _id: new ObjectId(),
        name,
        place_name: typeof place.place_name === "string" ? place.place_name.slice(0, 200) || null : null,
        category: typeof place.category === "string" ? place.category : null,
        lat,
        lng,
        location: geoPoint(lat, lng),
        created_by: viewer,
        created_at: new Date(),
      };
      await places.insertOne(placeDoc);
    }
  }

  const now = new Date();
  const saved = await placeStatus.findOneAndUpdate(
    { user_id: viewer, place_id: placeDoc._id },
    {
      $set: {
        status,
        rating: ratingNum,
        notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 1000) : null,
        visited_at: typeof visited_at === "string" && visited_at ? visited_at.slice(0, 10) : null,
        updated_at: now,
      },
      $setOnInsert: { _id: new ObjectId(), created_at: now },
    },
    { upsert: true, returnDocument: "after" }
  );

  return NextResponse.json({ place_status: saved ? placeStatusJson(saved, placeDoc) : null }, { status: 201 });
}

// DELETE /api/places/status?id=xxx
export async function DELETE(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const id = toObjectId(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  const { placeStatus } = await getCollections();
  await placeStatus.deleteOne({ _id: id, user_id: viewer });
  return NextResponse.json({ success: true });
}
