import type { Filter } from "mongodb";
import { getCollections } from "@/lib/db/mongo";
import type { PostDoc } from "@/lib/db/types";
import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_GROUPS, groupFor } from "@/components/map/categories";
import {
  ANSWER_KEYS,
  PAGE_SIZE,
  PREFERENCES,
  haversineKm,
  normalize,
  paramsToFilters,
  radiusBox,
  type PrefId,
  type SearchResponse,
  type SearchResult,
} from "@/lib/search";

const SCAN_LIMIT = 1000; // posts read per search (most recent first)

type PostRow = {
  id: string;
  lat: string | number;
  lng: string | number;
  title: string;
  description: string | null;
  place_name: string;
  rating: string | number | null;
  category: string | null;
  created_at: string;
  media: { url: string; order_index: number }[] | null;
};

// GET /api/search — places aggregated from public visits, with filters.
// Params: see filtersToParams in lib/search.ts, plus `offset`.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const f = paramsToFilters(params);
  const offset = Math.max(0, parseInt(params.get("offset") ?? "0", 10) || 0);

  const hasCenter = f.lat != null && f.lng != null;
  const box = f.bbox ?? (hasCenter ? radiusBox(f.lat!, f.lng!, f.radiusKm) : null);

  const filter: Filter<PostDoc> = { visibility: "public" };
  if (box) {
    // [south, west, north, east] → $box takes [[west, south], [east, north]]
    filter.location = { $geoWithin: { $box: [[box[1], box[0]], [box[3], box[2]]] } };
  }
  // "Outro" also covers posts without a category, so it's filtered below.
  if (f.groups.length && !f.groups.includes("outro")) {
    filter.category = { $in: f.groups.flatMap((g) => CATEGORY_GROUPS[g].categories) };
  }

  const { posts: postsCol } = await getCollections();
  const docs = await postsCol
    .find(filter, {
      projection: { lat: 1, lng: 1, title: 1, description: 1, place_name: 1, rating: 1, category: 1, created_at: 1, media: 1, answers: 1 },
    })
    .sort({ created_at: -1 })
    .limit(SCAN_LIMIT)
    .toArray();

  const posts: PostRow[] = docs.map((d) => ({
    id: d._id.toHexString(),
    lat: d.lat,
    lng: d.lng,
    title: d.title,
    description: d.description,
    place_name: d.place_name,
    rating: d.rating,
    category: d.category,
    created_at: d.created_at.toISOString(),
    media: d.media ?? [],
  }));

  // ---- Questionnaire answers (preferences, price, entry fee) ---------------
  const answersAvailable = true;
  const answersByPost = new Map<string, Record<string, string>>();
  for (const d of docs) {
    const picked: Record<string, string> = {};
    for (const k of ANSWER_KEYS) if (d.answers?.[k] !== undefined) picked[k] = d.answers[k];
    answersByPost.set(d._id.toHexString(), picked);
  }

  // ---- Aggregate visits into places ---------------------------------------
  type Acc = {
    posts: PostRow[];
    votes: Record<string, { yes: number; no: number }>;
    prices: Record<string, number>;
    text: string;
  };
  const places = new Map<string, Acc>();
  for (const post of posts) {
    const lat = Number(post.lat);
    const lng = Number(post.lng);
    const key = `${normalize(post.place_name)}|${lat.toFixed(3)},${lng.toFixed(3)}`;
    const acc = places.get(key) ?? { posts: [], votes: {}, prices: {}, text: "" };
    acc.posts.push(post);
    acc.text += ` ${post.place_name} ${post.title} ${post.description ?? ""} ${post.category ?? ""} ${
      CATEGORY_GROUPS[groupFor(post.category)].label
    }`;
    const answers = answersByPost.get(post.id) ?? {};
    for (const [k, v] of Object.entries(answers)) {
      if (k === "faixa_preco") {
        acc.prices[v] = (acc.prices[v] ?? 0) + 1;
      } else {
        const vote = (acc.votes[k] ??= { yes: 0, no: 0 });
        if (v === "sim") vote.yes++;
        else if (v === "nao") vote.no++;
      }
    }
    places.set(key, acc);
  }

  const flag = (acc: Acc, key: string, wanted: "sim" | "nao" = "sim"): boolean | null => {
    const v = acc.votes[key];
    if (!v || v.yes + v.no === 0) return null;
    return wanted === "sim" ? v.yes > v.no : v.no > v.yes;
  };

  const tokens = normalize(f.q).split(/\s+/).filter(Boolean);
  const now = Date.now();

  let results: (SearchResult & { score: number })[] = [];
  for (const [key, acc] of places) {
    const first = acc.posts[0]; // most recent (query is ordered)
    const category = first.category;
    if (f.groups.length && !f.groups.includes(groupFor(category))) continue;

    const haystack = normalize(acc.text);
    if (!tokens.every((t) => haystack.includes(t))) continue;

    const rated = acc.posts.map((p) => Number(p.rating)).filter((r) => Number.isFinite(r) && r > 0);
    const rating = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
    if (f.minRating && rating < f.minRating) continue;

    const flags = {
      ...(Object.fromEntries(PREFERENCES.map((p) => [p.id, flag(acc, p.key)])) as Record<PrefId, boolean | null>),
      noFee: flag(acc, "cobra_entrada", "nao"),
    };
    if (f.prefs.some((p) => flags[p] !== true)) continue;
    if (f.noFee && flags.noFee !== true) continue;

    const price = Object.entries(acc.prices).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    if (f.price && price !== f.price) continue;

    const lat = acc.posts.reduce((s, p) => s + Number(p.lat), 0) / acc.posts.length;
    const lng = acc.posts.reduce((s, p) => s + Number(p.lng), 0) / acc.posts.length;
    const distance_km = hasCenter ? haversineKm(f.lat!, f.lng!, lat, lng) : null;
    if (!f.bbox && distance_km != null && distance_km > f.radiusKm) continue;

    const tipPost = acc.posts.find((p) => (p.description ?? "").trim().length > 0);
    const tipText = tipPost?.description?.trim() ?? "";
    const thumbPost = acc.posts.find((p) => (p.media ?? []).length > 0);
    const thumb = thumbPost ? [...(thumbPost.media ?? [])].sort((a, b) => a.order_index - b.order_index)[0] : null;

    const ageDays = (now - new Date(first.created_at).getTime()) / 86400000;
    const nameHit = tokens.length && tokens.every((t) => normalize(first.place_name).includes(t)) ? 1.5 : 0;
    const score = rating * Math.log2(2 + acc.posts.length) + Math.max(0, 2 - ageDays / 30) + nameHit;

    results.push({
      id: key,
      post_id: first.id,
      place_name: first.place_name,
      category,
      lat,
      lng,
      rating,
      visits: acc.posts.length,
      price,
      flags,
      tip: tipText ? (tipText.length > 90 ? `${tipText.slice(0, 87).trimEnd()}…` : tipText) : null,
      thumbnail_url: thumb?.url ?? null,
      latest_at: first.created_at,
      distance_km,
      score,
    });
  }

  const sorters: Record<string, (a: (typeof results)[number], b: (typeof results)[number]) => number> = {
    relevance: (a, b) => b.score - a.score,
    rating: (a, b) => b.rating - a.rating || b.visits - a.visits,
    distance: (a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity) || b.score - a.score,
    recent: (a, b) => b.latest_at.localeCompare(a.latest_at),
  };
  results = results.sort(sorters[f.sort]);

  const page = results.slice(offset, offset + PAGE_SIZE).map(({ score: _score, ...r }) => r);
  const body: SearchResponse = {
    results: page,
    total: results.length,
    hasMore: offset + PAGE_SIZE < results.length,
    answersAvailable,
    capped: posts.length === SCAN_LIMIT,
  };
  return NextResponse.json(body);
}
