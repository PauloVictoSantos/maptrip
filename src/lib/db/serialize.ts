import "server-only";
import type { PublicUser } from "./access";
import { sortedMedia } from "./access";
import type { PostDoc } from "./types";

/** Post in the JSON shape the client already uses (ids as strings, dates as ISO). */
export function postJson(p: PostDoc, users: Map<string, PublicUser>, extra: { is_liked?: boolean } = {}) {
  const id = p._id.toHexString();
  return {
    id,
    user_id: p.user_id.toHexString(),
    title: p.title,
    description: p.description,
    rating: p.rating,
    lat: p.lat,
    lng: p.lng,
    place_name: p.place_name,
    category: p.category,
    visibility: p.visibility,
    visit_date: p.visit_date,
    likes_count: p.likes_count ?? 0,
    comments_count: p.comments_count ?? 0,
    created_at: p.created_at.toISOString(),
    user: users.get(p.user_id.toHexString()) ?? null,
    media: sortedMedia(p).map((m, i) => ({ id: `${id}-${i}`, post_id: id, url: m.url, order_index: m.order_index })),
    is_liked: extra.is_liked ?? false,
  };
}
