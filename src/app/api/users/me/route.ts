import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { ObjectId } from "mongodb";
import { getCollections, toObjectId } from "@/lib/db/mongo";
import { clearSessionCookie, getViewerId } from "@/lib/auth/session";
import { ownProfile } from "@/lib/auth/account";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { Visibility } from "@/lib/db/types";

const MEDIA_URL = /^\/api\/media\/([a-f0-9]{24})$/;
const VISIBILITIES: Visibility[] = ["public", "friends", "private"];

// PATCH /api/users/me { display_name?, bio?, city?, avatar_url?, default_visibility? }
export async function PATCH(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update: Record<string, string | null> = {};
  const limits = { display_name: 60, bio: 200, city: 80 } as const;
  for (const [key, max] of Object.entries(limits)) {
    if (key in body) {
      const value = typeof body[key] === "string" ? body[key].trim() : "";
      if (value.length > max) {
        return NextResponse.json({ error: `Máximo de ${max} caracteres.` }, { status: 400 });
      }
      update[key] = value || null;
    }
  }
  if ("default_visibility" in body) {
    if (!VISIBILITIES.includes(body.default_visibility)) {
      return NextResponse.json({ error: "Visibilidade inválida." }, { status: 400 });
    }
    update.default_visibility = body.default_visibility;
  }
  const { users, media } = await getCollections();

  // avatar_url: null removes it; otherwise it must be a photo this user uploaded.
  if ("avatar_url" in body) {
    if (body.avatar_url === null || body.avatar_url === "") {
      update.avatar_url = null;
    } else {
      const fileId = toObjectId(typeof body.avatar_url === "string" ? body.avatar_url.match(MEDIA_URL)?.[1] : null);
      const file = fileId ? await media.find({ _id: fileId }).next() : null;
      if (!file || !(file.metadata?.owner as ObjectId | undefined)?.equals(viewer)) {
        return NextResponse.json({ error: "Foto inválida. Envie a imagem novamente." }, { status: 400 });
      }
      update.avatar_url = body.avatar_url;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const before = await users.findOneAndUpdate(
    { _id: viewer },
    { $set: { ...update, updated_at: new Date() } },
    { returnDocument: "before" }
  );
  if (!before) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // Clean up the previous uploaded avatar when it was replaced or removed.
  if ("avatar_url" in update && before.avatar_url && before.avatar_url !== update.avatar_url) {
    const oldId = toObjectId(before.avatar_url.match(MEDIA_URL)?.[1]);
    if (oldId) await media.delete(oldId).catch(() => undefined);
  }

  const user = { ...before, ...update, updated_at: new Date() } as typeof before;
  return NextResponse.json({ profile: ownProfile(user) });
}

// DELETE /api/users/me { password } — permanently deletes the account and everything it created.
export async function DELETE(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!rateLimit(`delete-account:${viewer.toHexString()}:${clientIp(request.headers)}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }
  const { password, confirm } = await request.json().catch(() => ({}));
  const { users, posts, comments, likes, follows, placeStatus, trips, media, db } = await getCollections();
  const user = await users.findOne({ _id: viewer });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  // Accounts created with Google have no password: they confirm by typing the @username.
  const confirmed = user.password_hash
    ? typeof password === "string" && (await bcrypt.compare(password, user.password_hash))
    : typeof confirm === "string" && confirm.trim().toLowerCase() === user.username;
  if (!confirmed) {
    return NextResponse.json({ error: user.password_hash ? "Senha incorreta." : "Confirmação incorreta." }, { status: 403 });
  }

  // Interactions on other people's visits: keep their counters right.
  const myComments = await comments.find({ user_id: viewer }, { projection: { post_id: 1 } }).toArray();
  const myLikes = await likes.find({ user_id: viewer }, { projection: { post_id: 1 } }).toArray();
  const commentCounts = new Map<string, { id: ObjectId; n: number }>();
  for (const c of myComments) {
    const e = commentCounts.get(c.post_id.toHexString()) ?? { id: c.post_id, n: 0 };
    e.n++;
    commentCounts.set(c.post_id.toHexString(), e);
  }
  const ops = [
    ...[...commentCounts.values()].map((e) => ({ updateOne: { filter: { _id: e.id }, update: { $inc: { comments_count: -e.n } } } })),
    ...myLikes.map((l) => ({ updateOne: { filter: { _id: l.post_id }, update: { $inc: { likes_count: -1 } } } })),
  ];
  if (ops.length) await posts.bulkWrite(ops, { ordered: false });

  // Own visits and what hangs off them.
  const myPostIds = (await posts.find({ user_id: viewer }, { projection: { _id: 1 } }).toArray()).map((p) => p._id);
  await Promise.all([
    comments.deleteMany({ $or: [{ user_id: viewer }, { post_id: { $in: myPostIds } }] }),
    likes.deleteMany({ $or: [{ user_id: viewer }, { post_id: { $in: myPostIds } }] }),
    posts.deleteMany({ user_id: viewer }),
    follows.deleteMany({ $or: [{ follower_id: viewer }, { following_id: viewer }] }),
    placeStatus.deleteMany({ user_id: viewer }),
    trips.deleteMany({ owner_id: viewer }),
    trips.updateMany({ members: viewer }, { $pull: { members: viewer } }),
  ]);

  // Every uploaded file (visit photos and avatars).
  const files = await db.collection("media.files").find({ "metadata.owner": viewer }, { projection: { _id: 1 } }).toArray();
  for (const file of files) await media.delete(file._id as ObjectId).catch(() => undefined);

  await users.deleteOne({ _id: viewer });
  const res = NextResponse.json({ success: true });
  clearSessionCookie(res);
  return res;
}
