import { NextRequest, NextResponse } from "next/server";
import type { Filter } from "mongodb";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { followingIds, loadUsers, visibleAnd } from "@/lib/db/access";
import { normalize } from "@/lib/search";
import { CITY_RADIUS_KM, feedFilterCategories, parseNear } from "@/lib/feed";
import type { PostDoc } from "@/lib/db/types";
import type { DestinationPlace, DestinationResponse } from "@/lib/destination";

const SCAN_LIMIT = 5000;
const EARTH_RADIUS_KM = 6378.1;

// GET /api/destination?near=<lat,lng>&filter=<FEED_FILTERS id> — what the community recorded around a city
export async function GET(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const near = parseNear(request.nextUrl.searchParams.get("near"));
  if (!near) return NextResponse.json({ error: "Informe o destino (near=lat,lng)." }, { status: 400 });
  const categories = feedFilterCategories(request.nextUrl.searchParams.get("filter"));

  const area = { $geoWithin: { $centerSphere: [[near.lng, near.lat], CITY_RADIUS_KM / EARTH_RADIUS_KM] } };
  const { posts } = await getCollections();
  const filter: Filter<PostDoc> = { visibility: "public", location: area };
  if (categories) filter.category = { $in: categories };

  const rows = await posts
    .find(filter, { projection: { place_name: 1, lat: 1, lng: 1, category: 1, rating: 1, media: 1, user_id: 1, created_at: 1 } })
    .sort({ created_at: -1 })
    .limit(SCAN_LIMIT)
    .toArray();

  const explorers = new Set<string>();
  const byPlace = new Map<string, DestinationPlace & { sum: number; rated: number; people: Set<string> }>();
  for (const p of rows) {
    explorers.add(p.user_id.toHexString());
    const key = `${normalize(p.place_name)}|${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
    const e =
      byPlace.get(key) ??
      ({ key, name: p.place_name, lat: p.lat, lng: p.lng, category: p.category, rating: 0, visits: 0, explorers: 0, photo_url: null, sum: 0, rated: 0, people: new Set() } as DestinationPlace & {
        sum: number;
        rated: number;
        people: Set<string>;
      });
    e.visits++;
    e.people.add(p.user_id.toHexString());
    if (p.rating > 0) {
      e.sum += p.rating;
      e.rated++;
    }
    if (!e.photo_url && p.media?.length) e.photo_url = [...p.media].sort((a, b) => a.order_index - b.order_index)[0].url;
    e.category ??= p.category;
    byPlace.set(key, e);
  }

  const places: DestinationPlace[] = [...byPlace.values()]
    .map(({ sum, rated, people, ...p }) => ({ ...p, rating: rated ? Math.round((sum / rated) * 10) / 10 : 0, explorers: people.size }))
    // Popular and well rated first; a single 5★ visit doesn't beat a place many people liked.
    .sort((a, b) => score(b) - score(a));

  // People you follow who were there (respecting each visit's visibility).
  const following = await followingIds(viewer);
  let friends: DestinationResponse["friends"] = [];
  if (following.length) {
    const theirs = await posts
      .find(await visibleAnd(viewer, { user_id: { $in: following }, location: area }), { projection: { user_id: 1, place_name: 1, created_at: 1 } })
      .sort({ created_at: -1 })
      .limit(1000)
      .toArray();
    const counts = new Map<string, { n: number; last: string }>();
    for (const p of theirs) {
      const k = p.user_id.toHexString();
      const c = counts.get(k) ?? { n: 0, last: p.place_name };
      c.n++;
      counts.set(k, c);
    }
    const users = await loadUsers([...counts.keys()].map((k) => theirs.find((p) => p.user_id.toHexString() === k)!.user_id));
    friends = [...counts.entries()]
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 6)
      .map(([k, c]) => ({ user: users.get(k)!, visits: c.n, last_place: c.last }))
      .filter((f) => f.user);
  }

  const body: DestinationResponse = {
    total_places: byPlace.size,
    total_visits: rows.length,
    explorers: explorers.size,
    places: places.slice(0, 24),
    friends,
    truncated: rows.length >= SCAN_LIMIT,
  };
  return NextResponse.json(body);
}

function score(p: DestinationPlace) {
  return Math.log2(1 + p.explorers) * 2 + Math.log2(1 + p.visits) + (p.rating || 3);
}
