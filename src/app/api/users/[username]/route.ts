import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { visibleAnd } from "@/lib/db/access";
import { publicProfile } from "@/lib/auth/account";

// GET /api/users/[username] — public profile with counters
export async function GET(_request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const viewer = await getViewerId();
  const { users, posts, follows } = await getCollections();

  const user = await users.findOne({ username: username.toLowerCase() });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const other = viewer && !viewer.equals(user._id) ? viewer : null;
  const [postsCount, followersCount, followingCount, follow, followsBack] = await Promise.all([
    posts.countDocuments(await visibleAnd(viewer, { user_id: user._id })),
    follows.countDocuments({ following_id: user._id }),
    follows.countDocuments({ follower_id: user._id }),
    other ? follows.findOne({ follower_id: other, following_id: user._id }, { projection: { _id: 1 } }) : null,
    other ? follows.findOne({ follower_id: user._id, following_id: other }, { projection: { _id: 1 } }) : null,
  ]);

  return NextResponse.json({
    ...publicProfile(user),
    posts_count: postsCount,
    followers_count: followersCount,
    following_count: followingCount,
    is_following: !!follow,
    follows_you: !!followsBack,
    is_own_profile: !!viewer && viewer.equals(user._id),
  });
}
