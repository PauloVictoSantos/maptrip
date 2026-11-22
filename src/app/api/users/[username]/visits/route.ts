import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { sortedMedia, visibleAnd } from "@/lib/db/access";
import { computePoints } from "@/lib/points";

export type ProfileVisit = {
  id: string;
  title: string;
  place_name: string;
  category: string | null;
  rating: number;
  lat: number;
  lng: number;
  visibility: "public" | "friends" | "private";
  created_at: string;
  visit_date: string | null;
  photos: string[];
  points: number;
  answered: string[]; // questionnaire keys answered
};

// GET /api/users/[username]/visits — every visit of this user the viewer may see
export async function GET(_request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const viewer = await getViewerId();
  const { users, posts } = await getCollections();

  const target = await users.findOne({ username: username.toLowerCase() }, { projection: { _id: 1 } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const rows = await posts
    .find(await visibleAnd(viewer, { user_id: target._id }))
    .sort({ created_at: -1 })
    .limit(500)
    .toArray();

  const visits: ProfileVisit[] = rows.map((p) => {
    const photos = sortedMedia(p).map((m) => m.url);
    const answered = Object.keys(p.answers ?? {});
    return {
      id: p._id.toHexString(),
      title: p.title,
      place_name: p.place_name,
      category: p.category,
      rating: p.rating || 0,
      lat: p.lat,
      lng: p.lng,
      visibility: p.visibility,
      created_at: p.created_at.toISOString(),
      visit_date: p.visit_date,
      photos,
      answered,
      points: computePoints({
        imageCount: photos.length,
        comment: p.description ?? "",
        category: p.category,
        answeredCount: answered.length,
      }).total,
    };
  });

  return NextResponse.json({ visits });
}
