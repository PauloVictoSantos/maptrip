import { NextRequest, NextResponse } from "next/server";
import type { Filter, ObjectId } from "mongodb";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { loadUsers } from "@/lib/db/access";
import { computePoints } from "@/lib/points";
import { normalize } from "@/lib/search";
import { groupFor } from "@/components/map/categories";
import type { CommentDoc, PostDoc } from "@/lib/db/types";
import type { RankingResponse, RankingRow } from "@/lib/ranking";

const SCAN_LIMIT = 20000; // safety cap per window; see docs/perf (move to a materialized view in Fase 1)
const TOP = 20;

type Scope = "city" | "all";
type Period = "week" | "month" | "all";
type Kind = "exploracao" | "contribuicao";
type Window = { from: Date | null; to: Date | null };

function windows(period: Period, now = new Date()): { current: Window; previous: Window | null } {
  if (period === "all") return { current: { from: null, to: null }, previous: null };
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { current: { from, to: null }, previous: { from: prev, to: from } };
  }
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - ((from.getDay() + 6) % 7)); // Monday
  const prev = new Date(from);
  prev.setDate(prev.getDate() - 7);
  return { current: { from, to: null }, previous: { from: prev, to: from } };
}

function dateFilter(w: Window) {
  if (!w.from && !w.to) return {};
  return { created_at: { ...(w.from ? { $gte: w.from } : {}), ...(w.to ? { $lt: w.to } : {}) } };
}

type Score = { id: ObjectId; value: number; visits: number; places: Set<string>; comments: number; answers: number };

async function score(kind: Kind, w: Window, userIds: ObjectId[] | null): Promise<Map<string, Score>> {
  const { posts, comments } = await getCollections();
  const byUser: Filter<PostDoc> = userIds ? { user_id: { $in: userIds } } : {};
  const scores = new Map<string, Score>();
  const get = (id: ObjectId) => {
    const key = id.toHexString();
    let s = scores.get(key);
    if (!s) scores.set(key, (s = { id, value: 0, visits: 0, places: new Set(), comments: 0, answers: 0 }));
    return s;
  };

  // Only public visits count: rankings are visible to everyone.
  const rows = await posts
    .find(
      { ...byUser, visibility: "public", ...dateFilter(w) },
      { projection: { user_id: 1, media: 1, description: 1, category: 1, answers: 1, place_name: 1, lat: 1, lng: 1 } }
    )
    .limit(SCAN_LIMIT)
    .toArray();
  for (const p of rows) {
    const s = get(p.user_id);
    const answered = Object.keys(p.answers ?? {}).length;
    s.visits++;
    s.places.add(`${normalize(p.place_name)}|${p.lat.toFixed(3)},${p.lng.toFixed(3)}`);
    s.answers += answered;
    if (kind === "exploracao") {
      s.value += computePoints({ imageCount: p.media?.length ?? 0, comment: p.description ?? "", category: p.category, answeredCount: answered }).total;
    } else {
      s.value += answered * 2;
    }
  }

  if (kind === "contribuicao") {
    const byAuthor: Filter<CommentDoc> = userIds ? { user_id: { $in: userIds } } : {};
    const cs = await comments
      .find({ ...byAuthor, ...dateFilter(w) }, { projection: { user_id: 1 } })
      .limit(SCAN_LIMIT)
      .toArray();
    for (const c of cs) {
      const s = get(c.user_id);
      s.comments++;
      s.value += 5;
    }
  }
  for (const [key, s] of scores) if (s.value <= 0) scores.delete(key);
  return scores;
}

function ranked(scores: Map<string, Score>): Map<string, number> {
  const order = [...scores.values()].sort((a, b) => b.value - a.value || a.id.toHexString().localeCompare(b.id.toHexString()));
  const ranks = new Map<string, number>();
  let rank = 0;
  let last = Number.NaN;
  order.forEach((s, i) => {
    if (s.value !== last) rank = i + 1; // ties share a position
    last = s.value;
    ranks.set(s.id.toHexString(), rank);
  });
  return ranks;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/ranking?scope=city|all&period=week|month|all&kind=exploracao|contribuicao
export async function GET(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const scope: Scope = sp.get("scope") === "all" ? "all" : "city";
  const period: Period = sp.get("period") === "week" ? "week" : sp.get("period") === "all" ? "all" : "month";
  const kind: Kind = sp.get("kind") === "contribuicao" ? "contribuicao" : "exploracao";

  const { users, posts } = await getCollections();
  const me = await users.findOne({ _id: viewer }, { projection: { city: 1 } });
  const city = me?.city?.trim() || null;

  let userIds: ObjectId[] | null = null;
  if (scope === "city") {
    if (!city) return NextResponse.json({ error: "Defina sua cidade no perfil para ver o ranking dela." }, { status: 400 });
    const name = city.split(",")[0].trim();
    userIds = (
      await users
        .find({ city: { $regex: `^${escapeRegex(name)}(,|$)`, $options: "i" } }, { projection: { _id: 1 } })
        .limit(SCAN_LIMIT)
        .toArray()
    ).map((u) => u._id);
  }

  const { current, previous } = windows(period);
  const [now, before] = await Promise.all([score(kind, current, userIds), previous ? score(kind, previous, userIds) : null]);
  const ranks = ranked(now);
  const prevRanks = before ? ranked(before) : null;

  const order = [...now.values()].sort((a, b) => (ranks.get(a.id.toHexString())! - ranks.get(b.id.toHexString())!) || b.value - a.value);
  const top = order.slice(0, TOP);
  const mine = now.get(viewer.toHexString()) ?? null;
  const ids = [...top.map((s) => s.id), viewer];
  const userMap = await loadUsers(ids);

  const toRow = (s: Score | null, id: ObjectId): RankingRow | null => {
    const user = userMap.get(id.toHexString());
    if (!user) return null;
    const key = id.toHexString();
    const rank = s ? ranks.get(key)! : null;
    const prev = prevRanks?.get(key) ?? null;
    return {
      rank,
      user,
      value: s?.value ?? 0,
      visits: s?.visits ?? 0,
      places: s?.places.size ?? 0,
      comments: s?.comments ?? 0,
      answers: s?.answers ?? 0,
      delta: rank != null && prev != null ? prev - rank : null,
      is_new: rank != null && prevRanks != null && prev == null,
      me: id.equals(viewer),
    };
  };

  const rows = top.map((s) => toRow(s, s.id)).filter((r): r is RankingRow => r !== null);
  const meRow = toRow(mine, viewer);
  // Points needed to pass the person right above you.
  const myIndex = mine ? order.indexOf(mine) : -1;
  const above = myIndex > 0 ? order.slice(0, myIndex).reverse().find((s) => s.value > mine!.value) ?? null : myIndex === -1 ? order[order.length - 1] ?? null : null;

  // Personal challenges (own visits of any visibility).
  const monthStart = windows("month").current.from!;
  const weekStart = windows("week").current.from!;
  const own = await posts
    .find({ user_id: viewer, created_at: { $gte: monthStart < weekStart ? monthStart : weekStart } }, { projection: { created_at: 1, category: 1, media: 1 } })
    .limit(1000)
    .toArray();
  const monthVisits = own.filter((p) => p.created_at >= monthStart);
  const weekGroups = new Set(own.filter((p) => p.created_at >= weekStart).map((p) => groupFor(p.category)));
  const endOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const endOfWeek = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const body: RankingResponse = {
    scope,
    period,
    kind,
    city: city?.split(",")[0].trim() ?? null,
    window_start: current.from?.toISOString() ?? null,
    total: now.size,
    rows,
    me: meRow,
    next: meRow && above ? { rank: ranks.get(above.id.toHexString())!, missing: above.value - meRow.value + 1 } : null,
    challenges: [
      {
        id: "mes",
        title: "Cinco visitas no mês",
        description: "Registre 5 visitas até o fim do mês.",
        progress: Math.min(monthVisits.length, 5),
        goal: 5,
        ends_at: endOfMonth.toISOString(),
      },
      {
        id: "variedade",
        title: "Variedade da semana",
        description: "Visite 3 tipos de lugar diferentes nesta semana (comer, cultura, natureza…).",
        progress: Math.min(weekGroups.size, 3),
        goal: 3,
        ends_at: endOfWeek.toISOString(),
      },
    ],
  };
  return NextResponse.json(body);
}
