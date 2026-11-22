import type { ObjectId } from "mongodb";
import type { BudgetKey } from "@/lib/trips";

export type Visibility = "public" | "friends" | "private";
export type GeoPoint = { type: "Point"; coordinates: [lng: number, lat: number] };

export type UserDoc = {
  _id: ObjectId;
  email: string; // lowercase
  password_hash: string; // "" for accounts created with Google that never set a password
  google_sub?: string; // Google account id, when linked
  username: string; // lowercase
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  default_visibility?: Visibility; // privacy setting for new visits (absent = "public")
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

export type PasswordResetDoc = {
  _id: ObjectId;
  user_id: ObjectId;
  token_hash: string; // sha256 of the token sent by email (the token itself is never stored)
  expires_at: Date; // TTL index removes it
  used_at: Date | null;
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


export type TripStop = {
  id: string; // client-generated, stable within the trip
  name: string;
  lat: number;
  lng: number;
  category: string | null;
  time: string | null; // HH:MM
  duration_min: number | null;
  note: string | null;
  done: boolean;
};

export type TripExpense = { id: string; key: BudgetKey; label: string; amount: number; created_by: ObjectId; created_at: Date };

/** A planned trip. Bounded arrays: days ≤ 30, stops/day ≤ 20, members ≤ 10, expenses ≤ 200. */
export type TripDoc = {
  _id: ObjectId;
  owner_id: ObjectId;
  members: ObjectId[]; // includes the owner
  title: string;
  city: string;
  lat: number;
  lng: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  days: { stops: TripStop[] }[];
  budget: Record<BudgetKey, number>; // planned, BRL
  expenses: TripExpense[];
  version: number; // optimistic concurrency between members
  created_at: Date;
  updated_at: Date;
};

export function geoPoint(lat: number, lng: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}
