import { NextRequest, NextResponse } from "next/server";
import { getCollections, toObjectId } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { loadUsers } from "@/lib/db/access";
import type { FollowListResponse } from "@/lib/follows";

const MAX_LIMIT = 50;

// GET /api/users/[username]/follows?type=seguidores|seguindo&cursor=<id>&limit=30
// Lists who follows the user, or whom the user follows, with the viewer's relation to each person.
export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Entre na sua conta para ver seguidores." }, { status: 401 });

  const { username } = await params;
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") === "seguindo" ? "seguindo" : "seguidores";
  const limit = Math.min(Math.max(parseInt(sp.get("limit") ?? "30", 10) || 30, 1), MAX_LIMIT);
  const cursor = toObjectId(sp.get("cursor"));

  const { users, follows } = await getCollections();
  const target = await users.findOne({ username: username.toLowerCase() }, { projection: { _id: 1 } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // seguidores: rows where someone follows the target; seguindo: rows where the target follows someone.
  const base = type === "seguidores" ? { following_id: target._id } : { follower_id: target._id };
  const rows = await follows
    .find(cursor ? { ...base, _id: { $lt: cursor } } : base)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();
  const page = rows.slice(0, limit);
  const people = page.map((r) => (type === "seguidores" ? r.follower_id : r.following_id));

  const [userMap, iFollow, followMe, total] = await Promise.all([
    loadUsers(people),
    people.length ? follows.find({ follower_id: viewer, following_id: { $in: people } }, { projection: { following_id: 1 } }).toArray() : [],
    people.length ? follows.find({ follower_id: { $in: people }, following_id: viewer }, { projection: { follower_id: 1 } }).toArray() : [],
    cursor ? Promise.resolve(null) : follows.countDocuments(base),
  ]);
  const iFollowSet = new Set(iFollow.map((f) => f.following_id.toHexString()));
  const followMeSet = new Set(followMe.map((f) => f.follower_id.toHexString()));

  const body: FollowListResponse = {
    type,
    total,
    users: people
      .map((id) => {
        const key = id.toHexString();
        const u = userMap.get(key);
        return u ? { ...u, is_me: id.equals(viewer), is_following: iFollowSet.has(key), follows_you: followMeSet.has(key) } : null;
      })
      .filter((u): u is NonNullable<typeof u> => u !== null),
    nextCursor: rows.length > limit && page.length ? page[page.length - 1]._id!.toHexString() : null,
  };
  return NextResponse.json(body);
}
