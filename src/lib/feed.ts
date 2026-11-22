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
  trending: TrendingPlace[];
  suggestions: { user: FeedUser; mutual: number; posts_count: number }[];
};

export type TrendingPlace = {
  place_name: string;
  visits: number;
  post_id: string;
  lat: number;
  lng: number;
  category: string | null;
  rating: number; // average of the rated visits (0 = no rating yet)
  photo_url: string | null;
};

export type FeedTab = "friends" | "discover" | "city";

/** Radius of the "my city" tab and of "Em alta perto de você". */
export const CITY_RADIUS_KM = 30;

/** Category chips of the feed (ids are stable API values). */
export const FEED_FILTERS = [
  { id: "todos", label: "Tudo", categories: [] },
  { id: "comer", label: "Restaurantes", categories: ["restaurante"] },
  { id: "bares", label: "Bares", categories: ["bar"] },
  { id: "cafes", label: "Cafés", categories: ["cafe"] },
  { id: "museus", label: "Museus", categories: ["museu", "monumento"] },
  { id: "natureza", label: "Natureza", categories: ["parque", "trilha", "praia"] },
  { id: "hoteis", label: "Hotéis", categories: ["hotel"] },
  { id: "compras", label: "Compras", categories: ["compras"] },
] as const satisfies readonly { id: string; label: string; categories: readonly string[] }[];

export type FeedFilterId = (typeof FEED_FILTERS)[number]["id"];

export function feedFilterCategories(id: string | null): string[] | null {
  const f = FEED_FILTERS.find((x) => x.id === id);
  return f && f.categories.length ? [...f.categories] : null;
}

/** Parses "lat,lng" (e.g. the city center); null when absent or out of range. */
export function parseNear(value: string | null): { lat: number; lng: number } | null {
  if (!value) return null;
  const [lat, lng] = value.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

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
