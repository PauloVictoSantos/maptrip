import { NextRequest, NextResponse } from "next/server";
import { getCollections, toObjectId } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { loadUsers, visibleAnd } from "@/lib/db/access";
import { postJson } from "@/lib/db/serialize";

// GET /api/posts/[id] — full visit with author and comments
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = toObjectId((await params).id);
  if (!id) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

  const viewer = await getViewerId();
  const { posts, comments, likes, users } = await getCollections();
  const post = await posts.findOne(await visibleAnd(viewer, { _id: id }));
  if (!post) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

  const commentRows = await comments.find({ post_id: id }).sort({ created_at: 1 }).limit(500).toArray();
  const userMap = await loadUsers([post.user_id, ...commentRows.map((c) => c.user_id)]);
  const author = await users.findOne({ _id: post.user_id }, { projection: { bio: 1, city: 1 } });
  const is_liked = viewer ? !!(await likes.findOne({ user_id: viewer, post_id: id })) : false;

  const json = postJson(post, userMap, { is_liked });
  return NextResponse.json({
    ...json,
    user: json.user ? { ...json.user, bio: author?.bio ?? null, city: author?.city ?? null } : null,
    comments: commentRows.map((c) => ({
      id: c._id.toHexString(),
      content: c.content,
      created_at: c.created_at.toISOString(),
      user: userMap.get(c.user_id.toHexString()) ?? null,
    })),
  });
}

// DELETE /api/posts/[id] — author only; removes comments, likes and uploaded photos
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const id = toObjectId((await params).id);
  if (!id) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { posts, comments, likes, media } = await getCollections();
  const post = await posts.findOne({ _id: id, user_id: viewer });
  if (!post) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  await posts.deleteOne({ _id: id });
  await Promise.all([comments.deleteMany({ post_id: id }), likes.deleteMany({ post_id: id })]);
  for (const m of post.media ?? []) {
    const fileId = toObjectId(m.url.match(/^\/api\/media\/([a-f0-9]{24})$/)?.[1]);
    if (fileId) await media.delete(fileId).catch(() => undefined);
  }
  return NextResponse.json({ success: true });
}
