// Shared destination types (API ⇄ client).
import type { FeedUser } from "@/lib/feed";

export type DestinationPlace = {
  key: string;
  name: string;
  lat: number;
  lng: number;
  category: string | null;
  rating: number; // average of rated visits, 0 = none
  visits: number;
  explorers: number; // distinct people
  photo_url: string | null;
};

export type DestinationResponse = {
  total_places: number;
  total_visits: number;
  explorers: number;
  places: DestinationPlace[];
  friends: { user: FeedUser; visits: number; last_place: string }[];
  truncated: boolean;
};
