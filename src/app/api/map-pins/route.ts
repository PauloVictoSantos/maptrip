import { NextRequest, NextResponse } from "next/server";
import type { Filter } from "mongodb";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { followingIds, loadUsers, sortedMedia, visibleAnd } from "@/lib/db/access";
import type { PostDoc } from "@/lib/db/types";

type Layer = "mine" | "friends" | "community";
const LAYERS: Layer[] = ["mine", "friends", "community"];

// GET /api/map-pins?layer=mine|friends|community&categories=a,b&minRating=4
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const layerParam = sp.get("layer") as Layer | null;
  const layer: Layer = layerParam && LAYERS.includes(layerParam) ? layerParam : "community";
  const categories = sp.get("categories")?.split(",").map((c) => c.trim()).filter(Boolean);
  const minRating = parseFloat(sp.get("minRating") ?? "");

  const viewer = await getViewerId();
  const { posts } = await getCollections();

  const filter: Filter<PostDoc> = {};
  if (categories?.length) filter.category = { $in: categories };
  if (Number.isFinite(minRating)) filter.rating = { $gte: minRating };

  // People the viewer follows get their profile photo on the map.
  const following = viewer ? await followingIds(viewer) : [];
  const followingSet = new Set(following.map((id) => id.toHexString()));

  let query: Filter<PostDoc>;
  if (layer === "community") {
    query = { ...filter, visibility: "public" };
  } else {
    if (!viewer) return NextResponse.json({ error: "Entre na sua conta para ver esta camada." }, { status: 401 });
    if (layer === "mine") {
      query = { ...filter, user_id: viewer }; // own visits, any visibility
    } else {
      if (following.length === 0) return NextResponse.json({ pins: [], total: 0 });
      // "friends" posts only pass the visibility rule for mutual followers.
      query = await visibleAnd(viewer, { ...filter, user_id: { $in: following }, visibility: { $in: ["public", "friends"] } });
    }
  }

  const rows = await posts.find(query).sort({ created_at: -1 }).limit(500).toArray();
  const userMap = await loadUsers(rows.map((p) => p.user_id));

  const pins = rows.map((p) => {
    const user = userMap.get(p.user_id.toHexString());
    const description = p.description ?? "";
    const media = sortedMedia(p);
    return {
      id: p._id.toHexString(),
      user_id: p.user_id.toHexString(),
      lat: p.lat,
      lng: p.lng,
      title: p.title,
      excerpt: description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description,
      place_name: p.place_name,
      rating: p.rating || 0,
      category: p.category,
      created_at: p.created_at.toISOString(),
      thumbnail_url: media[0]?.url ?? null,
      media_count: media.length,
      username: user?.username ?? "",
      display_name: user?.display_name || user?.username || "",
      avatar_url: user?.avatar_url ?? null,
      following: followingSet.has(p.user_id.toHexString()),
    };
  });

  return NextResponse.json({ pins, total: pins.length });
}
