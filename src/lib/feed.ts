// Shared feed types (API ⇄ client).

export type FeedUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type FeedComment = {
  id: string;
  content: string;
  created_at: string;
  user: FeedUser | null;
};

export type FeedPost = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  rating: number;
  place_name: string;
  category: string | null;
  visibility: "public" | "friends" | "private";
  created_at: string;
  lat: number;
  lng: number;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  user: FeedUser | null;
  media: { id: string; url: string; order_index: number }[];
  latest_comment: FeedComment | null;
  tags: string[];
  completeness: string | null; // level label when the record is "Completo" or better
};

export type FeedResponse = { posts: FeedPost[]; nextCursor: string | null };

export type SidebarResponse = {
  me: { posts_count: number; followers_count: number; following_count: number } | null;
  friendsOnMap: { user: FeedUser; lat: number; lng: number; place_name: string }[];
  trending: { place_name: string; visits: number; post_id: string; lat: number; lng: number }[];
  suggestions: { user: FeedUser; mutual: number; posts_count: number }[];
};

export const VISIBILITY_LABEL: Record<FeedPost["visibility"], string> = {
  public: "Pública",
  friends: "Amigos",
  private: "Privada",
};

export function relativeTime(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} dias`;
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}
