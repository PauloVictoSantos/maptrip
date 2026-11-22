import "server-only";
import type { PlaceDoc, PlaceStatusDoc } from "./types";

export function placeJson(p: PlaceDoc) {
  return {
    id: p._id.toHexString(),
    lat: p.lat,
    lng: p.lng,
    name: p.name,
    place_name: p.place_name,
    category: p.category,
  };
}

export function placeStatusJson(s: PlaceStatusDoc, place: PlaceDoc | null) {
  return {
    id: s._id.toHexString(),
    status: s.status,
    rating: s.rating,
    notes: s.notes,
    visited_at: s.visited_at,
    created_at: s.created_at.toISOString(),
    updated_at: s.updated_at.toISOString(),
    place: place ? placeJson(place) : null,
  };
}
