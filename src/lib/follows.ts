// Shared follower-list types (API ⇄ client).
import type { FeedUser } from "@/lib/feed";

export type FollowListUser = FeedUser & { is_me: boolean; is_following: boolean; follows_you: boolean };

export type FollowListResponse = {
  type: "seguidores" | "seguindo";
  total: number | null; // only on the first page
  users: FollowListUser[];
  nextCursor: string | null;
};
