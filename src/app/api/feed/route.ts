import { NextRequest, NextResponse } from "next/server";
import type { Filter } from "mongodb";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { followingIds, loadUsers, visibleAnd } from "@/lib/db/access";
import { postJson } from "@/lib/db/serialize";
import { computePoints, levelFor, LEVELS } from "@/lib/points";
import type { PostDoc } from "@/lib/db/types";
import type { FeedComment, FeedPost, FeedResponse } from "@/lib/feed";

const TAG_KEYS: Record<string, { yes: string } | { no: string }> = {
  acessibilidade: { yes: "Acessível" },
  tem_opcao_vegetariana: { yes: "Vegetariano" },
  aceita_pet: { yes: "Pet-friendly" },
  cobra_entrada: { no: "Sem taxa de entrada" },
};
const COMPLETE_MIN = LEVELS.find((l) => l.label === "Completo")!.min;

// GET /api/feed?tab=friends|discover&cursor=<created_at ISO>&limit=10
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const tab = sp.get("tab") === "discover" ? "discover" : "friends";
  const cursor = sp.get("cursor");
  const limit = Math.min(Math.max(parseInt(sp.get("limit") ?? "10", 10) || 10, 1), 30);

  const viewer = await getViewerId();
  const { posts, likes, comments } = await getCollections();

  const base: Filter<PostDoc> = {};
  const cursorDate = cursor ? new Date(cursor) : null;
  if (cursorDate && !isNaN(cursorDate.getTime())) base.created_at = { $lt: cursorDate };

  let filter: Filter<PostDoc>;
  if (tab === "friends") {
    if (!viewer) {
      return NextResponse.json({ error: "Entre na sua conta para ver o feed de amigos." }, { status: 401 });
    }
    // Own + followed people; private visits never appear in feeds.
    const ids = [viewer, ...(await followingIds(viewer))];
    filter = await visibleAnd(viewer, { ...base, user_id: { $in: ids }, visibility: { $in: ["public", "friends"] } });
  } else {
    filter = { ...base, visibility: "public" };
  }

  const rows = await posts.find(filter).sort({ created_at: -1 }).limit(limit + 1).toArray();
  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1].created_at.toISOString() : null;
  const ids = page.map((p) => p._id);

  const [likeRows, latestComments] = await Promise.all([
    viewer && ids.length ? likes.find({ user_id: viewer, post_id: { $in: ids } }).toArray() : Promise.resolve([]),
    ids.length
      ? comments
          .aggregate<{ _id: unknown; doc: { _id: unknown; user_id: unknown; content: string; created_at: Date } }>([
            { $match: { post_id: { $in: ids } } },
            { $sort: { created_at: -1 } },
            { $group: { _id: "$post_id", doc: { $first: "$$ROOT" } } },
          ])
          .toArray()
      : Promise.resolve([]),
  ]);

  const liked = new Set(likeRows.map((l) => l.post_id.toHexString()));
  const commentUserIds = latestComments.map((c) => c.doc.user_id as PostDoc["user_id"]);
  const userMap = await loadUsers([...page.map((p) => p.user_id), ...commentUserIds]);
  const latest = new Map<string, FeedComment>();
  for (const c of latestComments) {
    const d = c.doc as any;
    latest.set(String(c._id), {
      id: String(d._id),
      content: d.content,
      created_at: d.created_at.toISOString(),
      user: userMap.get(String(d.user_id)) ?? null,
    });
  }

  const result: FeedPost[] = page.map((p) => {
    const base = postJson(p, userMap, { is_liked: liked.has(p._id.toHexString()) });
    const answers = p.answers ?? {};
    const tags: string[] = [];
    for (const [key, rule] of Object.entries(TAG_KEYS)) {
      if ("yes" in rule && answers[key] === "sim") tags.push(rule.yes);
      if ("no" in rule && answers[key] === "nao") tags.push(rule.no);
    }
    const pts = computePoints({
      imageCount: p.media?.length ?? 0,
      comment: p.description ?? "",
      category: p.category,
      answeredCount: Object.keys(answers).length,
    });
    return {
      ...base,
      latest_comment: latest.get(p._id.toHexString()) ?? null,
      tags,
      completeness: pts.total >= COMPLETE_MIN ? `Registro ${levelFor(pts.total).label.toLowerCase()}` : null,
    };
  });

  const body: FeedResponse = { posts: result, nextCursor };
  return NextResponse.json(body);
}
