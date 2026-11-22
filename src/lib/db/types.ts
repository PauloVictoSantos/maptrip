import type { ObjectId } from "mongodb";

export type Visibility = "public" | "friends" | "private";
export type GeoPoint = { type: "Point"; coordinates: [lng: number, lat: number] };

export type UserDoc = {
  _id: ObjectId;
  email: string; // lowercase
  password_hash: string;
  username: string; // lowercase
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: Date;
  updated_at: Date;
};

export type PostDoc = {
  _id: ObjectId;
  user_id: ObjectId;
  title: string;
  description: string | null;
  rating: number;
  lat: number;
  lng: number;
  location: GeoPoint;
  place_name: string;
  category: string | null;
  visibility: Visibility;
  visit_date: string | null; // YYYY-MM-DD
  media: { url: string; order_index: number }[];
  answers: Record<string, string>; // questionnaire (lib/questions.ts)
  likes_count: number;
  comments_count: number;
  created_at: Date;
};

export type CommentDoc = {
  _id: ObjectId;
  post_id: ObjectId;
  user_id: ObjectId;
  content: string;
  created_at: Date;
};

export type LikeDoc = { _id?: ObjectId; user_id: ObjectId; post_id: ObjectId; created_at: Date };

export type FollowDoc = { _id?: ObjectId; follower_id: ObjectId; following_id: ObjectId; created_at: Date };

export type PlaceDoc = {
  _id: ObjectId;
  name: string;
  place_name: string | null;
  category: string | null;
  lat: number;
  lng: number;
  location: GeoPoint;
  created_by: ObjectId;
  created_at: Date;
};

export type PlaceStatusDoc = {
  _id: ObjectId;
  user_id: ObjectId;
  place_id: ObjectId;
  status: "quero_visitar" | "visitado";
  rating: number | null;
  notes: string | null;
  visited_at: string | null;
  created_at: Date;
  updated_at: Date;
};

export function geoPoint(lat: number, lng: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}
