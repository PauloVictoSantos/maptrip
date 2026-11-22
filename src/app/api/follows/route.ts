import { NextRequest, NextResponse } from "next/server";
import { getCollections, isDuplicateKey, toObjectId } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";

// POST /api/follows { user_id } — follow / unfollow (toggle)
export async function POST(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { user_id } = await request.json().catch(() => ({}));
  const target = toObjectId(user_id);
  if (!target || target.equals(viewer)) return NextResponse.json({ error: "Usuário inválido" }, { status: 400 });

  const { follows, users } = await getCollections();
  if (!(await users.countDocuments({ _id: target }, { limit: 1 }))) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const removed = await follows.deleteOne({ follower_id: viewer, following_id: target });
  if (removed.deletedCount === 1) return NextResponse.json({ following: false });

  try {
    await follows.insertOne({ follower_id: viewer, following_id: target, created_at: new Date() });
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
  }
  return NextResponse.json({ following: true });
}
