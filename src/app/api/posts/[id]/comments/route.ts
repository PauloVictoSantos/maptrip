import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections, toObjectId } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { loadUsers, visibleAnd } from "@/lib/db/access";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// GET /api/posts/[id]/comments
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = toObjectId((await params).id);
  const viewer = await getViewerId();
  const { posts, comments } = await getCollections();
  if (!id || !(await posts.findOne(await visibleAnd(viewer, { _id: id }), { projection: { _id: 1 } }))) {
    return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
  }

  const rows = await comments.find({ post_id: id }).sort({ created_at: 1 }).limit(500).toArray();
  const userMap = await loadUsers(rows.map((c) => c.user_id));
  return NextResponse.json({
    comments: rows.map((c) => ({
      id: c._id.toHexString(),
      content: c.content,
      created_at: c.created_at.toISOString(),
      user: userMap.get(c.user_id.toHexString()) ?? null,
    })),
  });
}

// POST /api/posts/[id]/comments { content }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!rateLimit(`comment:${viewer.toHexString()}:${clientIp(request.headers)}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: "Muitos comentários seguidos. Aguarde um pouco." }, { status: 429 });
  }

  const id = toObjectId((await params).id);
  const { posts, comments } = await getCollections();
  if (!id || !(await posts.findOne(await visibleAnd(viewer, { _id: id }), { projection: { _id: 1 } }))) {
    return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
  }

  const { content } = await request.json().catch(() => ({}));
  const text = typeof content === "string" ? content.trim() : "";
  if (!text) return NextResponse.json({ error: "Comentário não pode ser vazio" }, { status: 400 });
  if (text.length > 500) return NextResponse.json({ error: "Comentário muito longo (máx. 500 caracteres)" }, { status: 400 });

  const doc = { _id: new ObjectId(), post_id: id, user_id: viewer, content: text, created_at: new Date() };
  await comments.insertOne(doc);
  await posts.updateOne({ _id: id }, { $inc: { comments_count: 1 } });

  const userMap = await loadUsers([viewer]);
  return NextResponse.json(
    {
      comment: {
        id: doc._id.toHexString(),
        content: doc.content,
        created_at: doc.created_at.toISOString(),
        user: userMap.get(viewer.toHexString()) ?? null,
      },
    },
    { status: 201 }
  );
}
