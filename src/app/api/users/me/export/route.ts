import { NextResponse } from "next/server";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { ownProfile } from "@/lib/auth/account";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

// GET /api/users/me/export — LGPD data portability: everything this account created, as JSON.
export async function GET() {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!rateLimit(`export:${viewer.toHexString()}:${clientIp(await headers())}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Exportação já solicitada várias vezes. Tente mais tarde." }, { status: 429 });
  }

  const { users, posts, comments, likes, follows, placeStatus, places, trips } = await getCollections();
  const user = await users.findOne({ _id: viewer });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const [myPosts, myComments, myLikes, following, followers, statuses, myTrips] = await Promise.all([
    posts.find({ user_id: viewer }).sort({ created_at: -1 }).toArray(),
    comments.find({ user_id: viewer }).sort({ created_at: -1 }).toArray(),
    likes.find({ user_id: viewer }).toArray(),
    follows.find({ follower_id: viewer }).toArray(),
    follows.find({ following_id: viewer }).toArray(),
    placeStatus.find({ user_id: viewer }).toArray(),
    trips.find({ members: viewer }).toArray(),
  ]);
  const placeDocs = await places.find({ _id: { $in: statuses.map((s) => s.place_id) } }).toArray();
  const others = await users
    .find(
      { _id: { $in: [...following.map((f) => f.following_id), ...followers.map((f) => f.follower_id)] } },
      { projection: { username: 1 } }
    )
    .toArray();
  const username = new Map(others.map((u) => [u._id.toHexString(), u.username]));

  const data = {
    exported_at: new Date().toISOString(),
    profile: ownProfile(user),
    visits: myPosts.map(({ _id, user_id: _u, location: _l, ...p }) => ({ id: _id.toHexString(), ...p })),
    comments: myComments.map((c) => ({ id: c._id.toHexString(), post_id: c.post_id.toHexString(), content: c.content, created_at: c.created_at })),
    likes: myLikes.map((l) => ({ post_id: l.post_id.toHexString(), created_at: l.created_at })),
    following: following.map((f) => username.get(f.following_id.toHexString()) ?? null).filter(Boolean),
    followers: followers.map((f) => username.get(f.follower_id.toHexString()) ?? null).filter(Boolean),
    saved_places: statuses.map((s) => {
      const p = placeDocs.find((x) => x._id.equals(s.place_id));
      return { place: p?.name ?? null, lat: p?.lat ?? null, lng: p?.lng ?? null, status: s.status, rating: s.rating, notes: s.notes, visited_at: s.visited_at };
    }),
    trips: myTrips.map((t) => ({
      title: t.title,
      city: t.city,
      start_date: t.start_date,
      end_date: t.end_date,
      days: t.days,
      budget: t.budget,
      expenses: t.expenses.map(({ created_by: _c, ...e }) => e),
      owner: t.owner_id.equals(viewer),
    })),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="maptrip-${user.username}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
