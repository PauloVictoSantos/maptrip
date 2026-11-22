import { NextRequest, NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { getCollections, toObjectId } from "@/lib/db/mongo";

const MEDIA_URL = /^\/api\/media\/([a-f0-9]{24})$/;
import { getViewerId } from "@/lib/auth/session";
import { ownProfile } from "@/lib/auth/account";

// PATCH /api/users/me { display_name?, bio?, city?, avatar_url? }
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
