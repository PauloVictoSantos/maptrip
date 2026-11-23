// Shared people-search types (API ⇄ client).
import type { FeedUser } from "@/lib/feed";

export type PersonResult = FeedUser & { city: string | null; is_me: boolean; is_following: boolean; follows_you: boolean };

export type UserSearchResponse = { users: PersonResult[] };
