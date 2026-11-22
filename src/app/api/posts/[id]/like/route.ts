import { NextRequest, NextResponse } from "next/server";
import { getCollections, isDuplicateKey, toObjectId } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { visibleAnd } from "@/lib/db/access";

// POST /api/posts/[id]/like — toggle like
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const id = toObjectId((await params).id);
  const { posts, likes } = await getCollections();
  if (!id || !(await posts.findOne(await visibleAnd(viewer, { _id: id }), { projection: { _id: 1 } }))) {
    return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
  }

  const removed = await likes.deleteOne({ user_id: viewer, post_id: id });
  if (removed.deletedCount === 1) {
    await posts.updateOne({ _id: id, likes_count: { $gt: 0 } }, { $inc: { likes_count: -1 } });
    return NextResponse.json({ liked: false });
  }

  try {
    await likes.insertOne({ user_id: viewer, post_id: id, created_at: new Date() });
  } catch (err) {
    if (isDuplicateKey(err)) return NextResponse.json({ liked: true }); // double click race
    throw err;
  }
  await posts.updateOne({ _id: id }, { $inc: { likes_count: 1 } });
  return NextResponse.json({ liked: true });
}
