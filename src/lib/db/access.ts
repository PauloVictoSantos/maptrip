import "server-only";
import type { Filter, ObjectId } from "mongodb";
import { getCollections } from "./mongo";
import type { PostDoc, UserDoc } from "./types";

// Visibility rules (spec §9) — applied in every post query, never only in the UI.
//   public  → everyone
//   friends → the author and mutual followers
//   private → only the author

export async function followingIds(viewer: ObjectId): Promise<ObjectId[]> {
  const { follows } = await getCollections();
  const rows = await follows.find({ follower_id: viewer }, { projection: { following_id: 1 } }).toArray();
  return rows.map((r) => r.following_id);
}

/** Users who follow the viewer and are followed back. */
export async function friendIds(viewer: ObjectId): Promise<ObjectId[]> {
  const { follows } = await getCollections();
  const following = await followingIds(viewer);
  if (following.length === 0) return [];
  const back = await follows
    .find({ follower_id: { $in: following }, following_id: viewer }, { projection: { follower_id: 1 } })
    .toArray();
  return back.map((r) => r.follower_id);
}

export async function visiblePostsFilter(viewer: ObjectId | null): Promise<Filter<PostDoc>> {
  if (!viewer) return { visibility: "public" };
  const friends = await friendIds(viewer);
  return {
    $or: [{ visibility: "public" }, { user_id: viewer }, { visibility: "friends", user_id: { $in: friends } }],
  };
}

/** Combines the visibility rule with other conditions. */
export async function visibleAnd(viewer: ObjectId | null, filter: Filter<PostDoc>): Promise<Filter<PostDoc>> {
  return { $and: [await visiblePostsFilter(viewer), filter] };
}

export type PublicUser = { id: string; username: string; display_name: string | null; avatar_url: string | null };

export function publicUser(u: Pick<UserDoc, "_id" | "username" | "display_name" | "avatar_url">): PublicUser {
  return { id: u._id.toHexString(), username: u.username, display_name: u.display_name, avatar_url: u.avatar_url };
}

/** Loads public profiles for a set of ids. */
export async function loadUsers(ids: ObjectId[]): Promise<Map<string, PublicUser>> {
  const { users } = await getCollections();
  const unique = [...new Map(ids.map((id) => [id.toHexString(), id])).values()];
  if (unique.length === 0) return new Map();
  const rows = await users
    .find({ _id: { $in: unique } }, { projection: { username: 1, display_name: 1, avatar_url: 1 } })
    .toArray();
  return new Map(rows.map((u) => [u._id.toHexString(), publicUser(u)]));
}

export function sortedMedia(post: Pick<PostDoc, "media">) {
  return [...(post.media ?? [])].sort((a, b) => a.order_index - b.order_index);
}
