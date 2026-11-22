import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { tripForMember, tripJson } from "@/lib/db/trips";
import { LIMITS, spanDays, validateBudget, validateDays, validateExpense } from "@/lib/trips";
import type { TripDoc, TripExpense } from "@/lib/db/types";

const NOT_FOUND = { error: "Viagem não encontrada" };

// GET /api/trips/[id] — participants only
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const trip = await tripForMember((await params).id, viewer);
  if (!trip) return NextResponse.json(NOT_FOUND, { status: 404 });
  return NextResponse.json({ trip: await tripJson(trip, viewer) });
}

// PATCH /api/trips/[id] { version, title?, start_date?, end_date?, days?, budget?, expenses? }
// Any participant may edit. `version` must match (optimistic concurrency); 409 otherwise.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const trip = await tripForMember((await params).id, viewer);
  if (!trip) return NextResponse.json(NOT_FOUND, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  if (body.version !== trip.version) {
    return NextResponse.json({ error: "A viagem foi alterada por outra pessoa. Recarregamos a versão mais nova.", trip: await tripJson(trip, viewer) }, { status: 409 });
  }

  const set: Partial<TripDoc> = {};
  if ("title" in body) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 80) return NextResponse.json({ error: "Dê um nome à viagem (até 80 caracteres)." }, { status: 400 });
    set.title = title;
  }

  const start = "start_date" in body ? body.start_date : trip.start_date;
  const end = "end_date" in body ? body.end_date : trip.end_date;
  const span = spanDays(start, end);
  if (!span) return NextResponse.json({ error: `Datas inválidas: a volta precisa ser depois da ida, em até ${LIMITS.days} dias.` }, { status: 400 });
  if (start !== trip.start_date || end !== trip.end_date) {
    set.start_date = start;
    set.end_date = end;
  }

  if ("days" in body) {
    const days = validateDays(body.days, span);
    if (typeof days === "string") return NextResponse.json({ error: days }, { status: 400 });
    set.days = days;
  } else if (span !== trip.days.length) {
    // Dates changed without a new itinerary: grow with empty days, never drop planned ones.
    if (trip.days.slice(span).some((d) => d.stops.length)) {
      return NextResponse.json({ error: "Tire as paradas dos últimos dias antes de encurtar a viagem." }, { status: 400 });
    }
    set.days = Array.from({ length: span }, (_, i) => trip.days[i] ?? { stops: [] });
  }

  if ("budget" in body) {
    const budget = validateBudget(body.budget);
    if (typeof budget === "string") return NextResponse.json({ error: budget }, { status: 400 });
    set.budget = budget;
  }

  if ("expenses" in body) {
    if (!Array.isArray(body.expenses) || body.expenses.length > LIMITS.expenses) {
      return NextResponse.json({ error: `Até ${LIMITS.expenses} gastos por viagem.` }, { status: 400 });
    }
    const existing = new Map(trip.expenses.map((e) => [e.id, e]));
    const out: TripExpense[] = [];
    const seen = new Set<string>();
    for (const raw of body.expenses) {
      const e = validateExpense(raw);
      if (typeof e === "string") return NextResponse.json({ error: e }, { status: 400 });
      if (seen.has(e.id)) return NextResponse.json({ error: "Gasto repetido." }, { status: 400 });
      seen.add(e.id);
      const prev = existing.get(e.id);
      // Authorship and time come from the server, never from the client.
      out.push({ ...e, created_by: prev?.created_by ?? viewer, created_at: prev?.created_at ?? new Date() });
    }
    set.expenses = out;
  }

  const { trips } = await getCollections();
  const updated = await trips.findOneAndUpdate(
    { _id: trip._id, members: viewer, version: trip.version },
    { $set: { ...set, updated_at: new Date() }, $inc: { version: 1 } },
    { returnDocument: "after" }
  );
  if (!updated) {
    const fresh = await tripForMember(trip._id.toHexString(), viewer);
    if (!fresh) return NextResponse.json(NOT_FOUND, { status: 404 });
    return NextResponse.json({ error: "A viagem foi alterada por outra pessoa. Recarregamos a versão mais nova.", trip: await tripJson(fresh, viewer) }, { status: 409 });
  }
  return NextResponse.json({ trip: await tripJson(updated, viewer) });
}

// DELETE /api/trips/[id] — owner only
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const trip = await tripForMember((await params).id, viewer);
  if (!trip) return NextResponse.json(NOT_FOUND, { status: 404 });
  if (!trip.owner_id.equals(viewer)) return NextResponse.json({ error: "Só quem criou a viagem pode excluí-la." }, { status: 403 });
  const { trips } = await getCollections();
  await trips.deleteOne({ _id: trip._id, owner_id: viewer });
  return NextResponse.json({ success: true });
}
