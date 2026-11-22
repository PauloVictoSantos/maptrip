import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type Filter } from "mongodb";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { loadUsers, visibleAnd } from "@/lib/db/access";
import { postJson } from "@/lib/db/serialize";
import { geoPoint, type PostDoc, type Visibility } from "@/lib/db/types";
import { POST_CATEGORIES } from "@/lib/types";

const VISIBILITIES: Visibility[] = ["public", "friends", "private"];

// GET /api/posts?page=&limit=&category=&username= — posts the viewer may see
export async function GET(request: NextRequest) {
  const viewer = await getViewerId();
  const { posts, users, likes } = await getCollections();
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const limit = Math.min(Math.max(parseInt(sp.get("limit") || "20", 10) || 20, 1), 50);

  const filter: Filter<PostDoc> = {};
  const category = sp.get("category");
  if (category) filter.category = category;
  const username = sp.get("username");
  if (username) {
    const target = await users.findOne({ username: username.toLowerCase() }, { projection: { _id: 1 } });
    if (!target) return NextResponse.json({ posts: [], total: 0, page, limit });
    filter.user_id = target._id;
  }

  const query = await visibleAnd(viewer, filter);
  const [rows, total] = await Promise.all([
    posts.find(query).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    posts.countDocuments(query),
  ]);

  const userMap = await loadUsers(rows.map((p) => p.user_id));
  const liked = viewer
    ? new Set(
        (await likes.find({ user_id: viewer, post_id: { $in: rows.map((p) => p._id) } }).toArray()).map((l) =>
          l.post_id.toHexString()
        )
      )
    : new Set<string>();

  return NextResponse.json({
    posts: rows.map((p) => postJson(p, userMap, { is_liked: liked.has(p._id.toHexString()) })),
    total,
    page,
    limit,
  });
}

function isMediaUrl(u: unknown): u is string {
  return typeof u === "string" && u.length < 500 && (/^\/api\/media\/[a-f0-9]{24}$/.test(u) || /^https:\/\//.test(u));
}

// POST /api/posts — create a visit (required: place, rating, visibility)
export async function POST(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { title, description, rating, lat, lng, place_name, category, visibility, visit_date, media_urls, answers } = body;

  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum) || Math.abs(latNum) > 90 || Math.abs(lngNum) > 180) {
    return NextResponse.json({ error: "Escolha o lugar da visita." }, { status: 400 });
  }
  if (typeof place_name !== "string" || !place_name.trim() || place_name.length > 200) {
    return NextResponse.json({ error: "Escolha o lugar da visita." }, { status: 400 });
  }
  const ratingNum = Number(rating);
  if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: "Dê uma nota de 1 a 5." }, { status: 400 });
  }
  if (!VISIBILITIES.includes(visibility)) {
    return NextResponse.json({ error: "Escolha quem pode ver a visita." }, { status: 400 });
  }
  const cat = typeof category === "string" && POST_CATEGORIES.some((c) => c.value === category) ? category : null;
  const date = typeof visit_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(visit_date) ? visit_date : null;
  const desc = typeof description === "string" && description.trim() ? description.trim().slice(0, 2000) : null;
  const cleanTitle = typeof title === "string" && title.trim() ? title.trim().slice(0, 200) : place_name.trim().slice(0, 200);

  const media = (Array.isArray(media_urls) ? media_urls : [])
    .filter(isMediaUrl)
    .slice(0, 10)
    .map((url, order_index) => ({ url, order_index }));

  const cleanAnswers: Record<string, string> = {};
  if (answers && typeof answers === "object") {
    for (const [k, v] of Object.entries(answers).slice(0, 60)) {
      if (/^[a-z_]{2,40}$/.test(k) && (typeof v === "string" || typeof v === "number")) {
        cleanAnswers[k] = String(v).slice(0, 40);
      }
    }
  }

  const { posts, users } = await getCollections();
  const doc: PostDoc = {
    _id: new ObjectId(),
    user_id: viewer,
    title: cleanTitle,
    description: desc,
    rating: Math.round(ratingNum * 10) / 10,
    lat: latNum,
    lng: lngNum,
    location: geoPoint(latNum, lngNum),
    place_name: place_name.trim(),
    category: cat,
    visibility,
    visit_date: date,
    media,
    answers: cleanAnswers,
    likes_count: 0,
    comments_count: 0,
    created_at: new Date(),
  };
  await posts.insertOne(doc);

  const author = await users.findOne({ _id: viewer });
  const userMap = await loadUsers(author ? [author._id] : []);
  return NextResponse.json({ post: postJson(doc, userMap) }, { status: 201 });
}
