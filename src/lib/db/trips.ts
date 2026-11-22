import "server-only";
import type { ObjectId } from "mongodb";
import { getCollections, toObjectId } from "./mongo";
import { loadUsers } from "./access";
import type { TripDoc } from "./types";
import type { TripJson, TripSummary } from "@/lib/trips";

/** The trip, only when the viewer is a participant (otherwise null → respond 404, never 403). */
export async function tripForMember(rawId: string, viewer: ObjectId): Promise<TripDoc | null> {
  const id = toObjectId(rawId);
  if (!id) return null;
  const { trips } = await getCollections();
  return trips.findOne({ _id: id, members: viewer });
}

export async function tripJson(t: TripDoc, viewer: ObjectId): Promise<TripJson> {
  const users = await loadUsers(t.members);
  return {
    id: t._id.toHexString(),
    owner_id: t.owner_id.toHexString(),
    is_owner: t.owner_id.equals(viewer),
    members: t.members.map((m) => users.get(m.toHexString())).filter((u): u is NonNullable<typeof u> => !!u),
    title: t.title,
    city: t.city,
    lat: t.lat,
    lng: t.lng,
    start_date: t.start_date,
    end_date: t.end_date,
    days: t.days,
    budget: t.budget,
    expenses: t.expenses.map((e) => ({ ...e, created_by: e.created_by.toHexString(), created_at: e.created_at.toISOString() })),
    version: t.version,
    updated_at: t.updated_at.toISOString(),
  };
}

export async function tripSummaries(rows: TripDoc[], viewer: ObjectId): Promise<TripSummary[]> {
  const users = await loadUsers(rows.flatMap((t) => t.members));
  return rows.map((t) => ({
    id: t._id.toHexString(),
    title: t.title,
    city: t.city,
    start_date: t.start_date,
    end_date: t.end_date,
    is_owner: t.owner_id.equals(viewer),
    members: t.members.map((m) => users.get(m.toHexString())).filter((u): u is NonNullable<typeof u> => !!u),
    stops: t.days.reduce((n, d) => n + d.stops.length, 0),
    planned: Object.values(t.budget).reduce((a, b) => a + b, 0),
  }));
}
