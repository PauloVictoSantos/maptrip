export type PlaceStatusType = "quero_visitar" | "visitado";

export type Place = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  place_name: string | null;
  category: string | null;
};

export type PlaceStatus = {
  id: string;
  status: PlaceStatusType;
  rating: number | null;
  notes: string | null;
  visited_at: string | null;
  created_at: string;
  place: Place;
};

export type User = {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  default_visibility?: "public" | "friends" | "private";
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  rating: number;
  lat: number;
  lng: number;
  place_name: string;
  category: string | null;
  visibility: "public" | "friends" | "private";
  visit_date: string | null;
  likes_count: number;
  created_at: string;
  user?: User;
  media?: Media[];
  comments_count?: number;
  is_liked?: boolean;
};

export type Media = {
  id: string;
  post_id: string;
  url: string;
  order_index: number;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
};

export type Like = {
  user_id: string;
  post_id: string;
};

export type Follow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type PostCategory =
  | "restaurante"
  | "bar"
  | "cafe"
  | "praia"
  | "trilha"
  | "hotel"
  | "parque"
  | "museu"
  | "monumento"
  | "compras"
  | "outro";

export const POST_CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: "restaurante", label: "Restaurante" },
  { value: "bar", label: "Bar" },
  { value: "cafe", label: "Café" },
  { value: "praia", label: "Praia" },
  { value: "trilha", label: "Trilha" },
  { value: "hotel", label: "Hotel" },
  { value: "parque", label: "Parque" },
  { value: "museu", label: "Museu" },
  { value: "monumento", label: "Monumento" },
  { value: "compras", label: "Compras" },
  { value: "outro", label: "Outro" },
];

export type MapPin = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  title: string;
  excerpt: string;
  place_name: string;
  rating: number;
  category: string | null;
  created_at: string;
  thumbnail_url: string | null;
  media_count: number;
  username: string;
  display_name?: string;
  avatar_url: string | null;
  following: boolean; // author is someone the viewer follows → shown with their photo
};

export type MapLayer = "mine" | "friends" | "community";
