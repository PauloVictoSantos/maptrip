import { NextRequest, NextResponse } from "next/server";
import { getCollections, toObjectId } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { tripForMember, tripJson } from "@/lib/db/trips";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { LIMITS } from "@/lib/trips";

const NOT_FOUND = { error: "Viagem não encontrada" };

// POST /api/trips/[id]/members { username } — owner invites a mutual friend
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!rateLimit(`trip-invite:${viewer.toHexString()}:${clientIp(request.headers)}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitos convites seguidos. Aguarde um pouco." }, { status: 429 });
  }
  const trip = await tripForMember((await params).id, viewer);
  if (!trip) return NextResponse.json(NOT_FOUND, { status: 404 });
  if (!trip.owner_id.equals(viewer)) return NextResponse.json({ error: "Só quem criou a viagem pode convidar." }, { status: 403 });
  if (trip.members.length >= LIMITS.members) return NextResponse.json({ error: `Até ${LIMITS.members} pessoas por viagem.` }, { status: 400 });

  const { username } = await request.json().catch(() => ({}));
  const handle = typeof username === "string" ? username.trim().replace(/^@/, "").toLowerCase() : "";
  if (!/^[a-z0-9_]{3,30}$/.test(handle)) return NextResponse.json({ error: "Informe um @usuário válido." }, { status: 400 });

  const { users, follows, trips } = await getCollections();
  const invitee = await users.findOne({ username: handle }, { projection: { _id: 1 } });
  // Only mutual friends can be added, so nobody gets pulled into a stranger's trip.
  const [a, b] = invitee
    ? await Promise.all([
        follows.findOne({ follower_id: viewer, following_id: invitee._id }, { projection: { _id: 1 } }),
        follows.findOne({ follower_id: invitee._id, following_id: viewer }, { projection: { _id: 1 } }),
      ])
    : [null, null];
  if (!invitee || !a || !b) {
    return NextResponse.json({ error: "Só dá para convidar amigos: pessoas que você segue e que seguem você." }, { status: 400 });
  }
  if (trip.members.some((m) => m.equals(invitee._id))) return NextResponse.json({ error: "Essa pessoa já está na viagem." }, { status: 400 });

  const updated = await trips.findOneAndUpdate(
    { _id: trip._id, owner_id: viewer, [`members.${LIMITS.members - 1}`]: { $exists: false } },
    { $addToSet: { members: invitee._id }, $set: { updated_at: new Date() }, $inc: { version: 1 } },
    { returnDocument: "after" }
  );
  if (!updated) return NextResponse.json({ error: `Até ${LIMITS.members} pessoas por viagem.` }, { status: 400 });
  return NextResponse.json({ trip: await tripJson(updated, viewer) });
}

// DELETE /api/trips/[id]/members?user_id= — owner removes someone, or a participant leaves
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const trip = await tripForMember((await params).id, viewer);
  if (!trip) return NextResponse.json(NOT_FOUND, { status: 404 });

  const target = toObjectId(request.nextUrl.searchParams.get("user_id"));
  if (!target || !trip.members.some((m) => m.equals(target))) return NextResponse.json({ error: "Pessoa não está na viagem." }, { status: 400 });
  if (target.equals(trip.owner_id)) return NextResponse.json({ error: "Quem criou a viagem não sai dela; exclua a viagem." }, { status: 400 });
  if (!target.equals(viewer) && !trip.owner_id.equals(viewer)) {
    return NextResponse.json({ error: "Só quem criou a viagem pode remover pessoas." }, { status: 403 });
  }

  const { trips } = await getCollections();
  const updated = await trips.findOneAndUpdate(
    { _id: trip._id },
    { $pull: { members: target }, $set: { updated_at: new Date() }, $inc: { version: 1 } },
    { returnDocument: "after" }
  );
  if (target.equals(viewer)) return NextResponse.json({ success: true, left: true });
  return NextResponse.json({ trip: updated ? await tripJson(updated, viewer) : null });
}
