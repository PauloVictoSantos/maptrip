import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/db/mongo";
import { loadUsers, sortedMedia } from "@/lib/db/access";
import { normalize } from "@/lib/search";
import { PLACE_RADIUS_KM, PREFERENCE_KEYS, ANSWER_LABELS, summarizeAnswers, type PlaceDetail } from "@/lib/place";

const EARTH_RADIUS_KM = 6378.1;

// GET /api/places/detail?n=<name>&lat=&lng= — a place aggregated from its public visits
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const name = (sp.get("n") ?? "").trim();
  const lat = parseFloat(sp.get("lat") ?? "");
  const lng = parseFloat(sp.get("lng") ?? "");
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Lugar inválido" }, { status: 400 });
  }

  const { posts: postsCol } = await getCollections();
  const nearby = await postsCol
    .find({
      visibility: "public", // place pages only aggregate public visits
      location: { $geoWithin: { $centerSphere: [[lng, lat], PLACE_RADIUS_KM / EARTH_RADIUS_KM] } },
    })
    .sort({ created_at: -1 })
    .limit(500)
    .toArray();

  const target = normalize(name);
  const posts = nearby.filter((p) => normalize(p.place_name) === target);
  if (posts.length === 0) {
    return NextResponse.json({ error: "Ainda não há visitas públicas neste lugar." }, { status: 404 });
  }

  const userMap = await loadUsers(posts.map((p) => p.user_id));
  const categoryCounts: Record<string, number> = {};
  for (const p of posts) if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
  const category = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const ratings = posts.map((p) => p.rating).filter((r) => r > 0);

  const answerRows = posts.flatMap((p) =>
    Object.entries(p.answers ?? {}).map(([question_key, answer_value]) => ({ question_key, answer_value }))
  );

  const body: PlaceDetail = {
    name: posts[0].place_name,
    category,
    lat: posts.reduce((s, p) => s + p.lat, 0) / posts.length,
    lng: posts.reduce((s, p) => s + p.lng, 0) / posts.length,
    rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
    visits_count: posts.length,
    photos: posts.flatMap((p) => sortedMedia(p).map((m) => ({ url: m.url, post_id: p._id.toHexString() }))),
    summary: summarizeAnswers(answerRows),
    visits: posts.map((p) => {
      const a = p.answers ?? {};
      const tags = PREFERENCE_KEYS.filter((k) => a[k] === "sim").map((k) => ANSWER_LABELS[k]);
      if (a.cobra_entrada === "nao") tags.push("Sem taxa de entrada");
      return {
        id: p._id.toHexString(),
        title: p.title,
        description: p.description,
        rating: p.rating || 0,
        created_at: p.created_at.toISOString(),
        media_count: p.media?.length ?? 0,
        tags,
        user: userMap.get(p.user_id.toHexString()) ?? null,
      };
    }),
  };
  return NextResponse.json(body);
}
