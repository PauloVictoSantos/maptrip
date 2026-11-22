import { NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { followingIds, loadUsers, visibleAnd } from "@/lib/db/access";
import { normalize } from "@/lib/search";
import type { SidebarResponse } from "@/lib/feed";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// GET /api/feed/sidebar — data for the feed side columns
export async function GET() {
  const viewer = await getViewerId();
  const { posts, follows } = await getCollections();
  const since = new Date(Date.now() - WEEK_MS);

  // ---- Trending: public visits this week, grouped by place ---------------
  const recent = await posts
    .find({ visibility: "public", created_at: { $gte: since } }, { projection: { place_name: 1, lat: 1, lng: 1 } })
    .sort({ created_at: -1 })
    .limit(1000)
    .toArray();
  const byPlace = new Map<string, SidebarResponse["trending"][number]>();
  for (const p of recent) {
    const key = `${normalize(p.place_name)}|${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
    const entry = byPlace.get(key) ?? { place_name: p.place_name, visits: 0, post_id: p._id.toHexString(), lat: p.lat, lng: p.lng };
    entry.visits++;
    byPlace.set(key, entry);
  }
  const trending = [...byPlace.values()].sort((a, b) => b.visits - a.visits).slice(0, 3);

  if (!viewer) {
    const body: SidebarResponse = { me: null, friendsOnMap: [], trending, suggestions: [] };
    return NextResponse.json(body);
  }

  const following = await followingIds(viewer);
  const [postsCount, followersCount] = await Promise.all([
    posts.countDocuments({ user_id: viewer }),
    follows.countDocuments({ following_id: viewer }),
  ]);

  // ---- Friends on the map: latest visible visit this week per followed person
  const friendsOnMap: SidebarResponse["friendsOnMap"] = [];
  if (following.length) {
    const friendPosts = await posts
      .find(
        await visibleAnd(viewer, {
          user_id: { $in: following },
          visibility: { $in: ["public", "friends"] },
          created_at: { $gte: since },
        }),
        { projection: { user_id: 1, lat: 1, lng: 1, place_name: 1 } }
      )
      .sort({ created_at: -1 })
      .limit(200)
      .toArray();
    const userMap = await loadUsers(friendPosts.map((p) => p.user_id));
    const seen = new Set<string>();
    for (const p of friendPosts) {
      const key = p.user_id.toHexString();
      const user = userMap.get(key);
      if (seen.has(key) || !user) continue;
      seen.add(key);
      friendsOnMap.push({ user, lat: p.lat, lng: p.lng, place_name: p.place_name });
    }
  }

  // ---- Suggestions: people followed by people you follow, then active posters
  const exclude = new Set([viewer.toHexString(), ...following.map((f) => f.toHexString())]);
  const mutual = new Map<string, { id: ObjectId; n: number }>();
  if (following.length) {
    const fof = await follows.find({ follower_id: { $in: following.slice(0, 200) } }).limit(2000).toArray();
    for (const f of fof) {
      const key = f.following_id.toHexString();
      if (exclude.has(key)) continue;
      const e = mutual.get(key) ?? { id: f.following_id, n: 0 };
      e.n++;
      mutual.set(key, e);
    }
  }
  const candidates = [...mutual.values()].sort((a, b) => b.n - a.n).slice(0, 3).map((m) => m.id);
  if (candidates.length < 3) {
    const active = await posts
      .find({ visibility: "public" }, { projection: { user_id: 1 } })
      .sort({ created_at: -1 })
      .limit(200)
      .toArray();
    for (const p of active) {
      const key = p.user_id.toHexString();
      if (!exclude.has(key) && !candidates.some((c) => c.toHexString() === key)) candidates.push(p.user_id);
      if (candidates.length >= 3) break;
    }
  }

  const userMap = await loadUsers(candidates);
  const counts = await Promise.all(candidates.map((id) => posts.countDocuments({ user_id: id, visibility: "public" })));
  const suggestions: SidebarResponse["suggestions"] = [];
  candidates.forEach((id, i) => {
    const user = userMap.get(id.toHexString());
    if (user) suggestions.push({ user, mutual: mutual.get(id.toHexString())?.n ?? 0, posts_count: counts[i] });
  });

  const body: SidebarResponse = {
    me: { posts_count: postsCount, followers_count: followersCount, following_count: following.length },
    friendsOnMap,
    trending,
    suggestions,
  };
  return NextResponse.json(body);
}
