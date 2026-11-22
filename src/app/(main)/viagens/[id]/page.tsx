"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bookmark,
  Check,
  ChevronLeft,
  Loader2,
  Plus,
  Search,
  Share2,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { POST_CATEGORIES } from "@/lib/types";
import { geocodeSearch, type GeoResult } from "@/lib/geocode";
import {
  BUDGET_KEYS,
  BUDGET_LABELS,
  LIMITS,
  formatDay,
  formatDuration,
  formatKm,
  formatRange,
  legBetween,
  money,
  newId,
  scheduleConflicts,
  spanDays,
  type BudgetKey,
  type TripJson,
  type TripStopJson,
} from "@/lib/trips";

const TripMap = dynamic(() => import("@/components/trip/TripMap"), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-[20px] bg-mt-land motion-reduce:animate-none" />,
});

type Tab = "roteiro" | "orcamento" | "pessoas" | "ajustes";
type Editable = "days" | "budget" | "expenses" | "title" | "start_date" | "end_date";
type SavedPlace = { id: string; place: { id: string; name: string; category: string | null; lat: number; lng: number } };

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(POST_CATEGORIES.map((c) => [c.value, c.label]));
const field = "h-11 w-full rounded-[12px] border-[1.5px] border-mt-line-strong bg-white px-3.5 text-[15px] focus:border-mt-teal focus:outline-none";
const card = "rounded-[20px] border border-mt-line bg-white";

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthContext();
  const [trip, setTrip] = useState<TripJson | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("roteiro");
  const [day, setDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const tripRef = useRef<TripJson | null>(null);
  const versionRef = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const inviteRef = useRef<HTMLInputElement>(null);

  const replace = useCallback((t: TripJson) => {
    tripRef.current = t;
    versionRef.current = t.version;
    setTrip(t);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/trips/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Viagem não encontrada.");
    replace(data.trip);
    document.title = `${data.trip.title} · MapTrip`;
  }, [id, replace]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(t);
  }, [notice]);

  /** Applies a local change now and saves it in order (one PATCH at a time, latest version). */
  function commit(next: TripJson, fields: Editable[]) {
    tripRef.current = next;
    setTrip(next);
    queue.current = queue.current.then(async () => {
      setSaving(true);
      try {
        const current = tripRef.current!;
        const body: Record<string, unknown> = { version: versionRef.current };
        for (const f of fields) body[f] = current[f];
        const res = await fetch(`/api/trips/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json();
        if (res.ok) {
          versionRef.current = data.trip.version;
          // Keep newer local edits; take server-owned fields (expense authors, members).
          const merged = { ...tripRef.current!, version: data.trip.version, members: data.trip.members, expenses: fields.includes("expenses") ? data.trip.expenses : tripRef.current!.expenses };
          tripRef.current = merged;
          setTrip(merged);
        } else if (res.status === 409 && data.trip) {
          replace(data.trip);
          setNotice(data.error);
        } else {
          setNotice(data.error || "Não foi possível salvar. Recarregamos a viagem.");
          await load().catch(() => undefined);
        }
      } catch {
        setNotice("Sem conexão. A última alteração não foi salva.");
        await load().catch(() => undefined);
      } finally {
        setSaving(false);
      }
    });
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-lg font-extrabold text-mt-ink">{error}</p>
        <Link href="/viagens" className="mt-4 inline-flex h-11 items-center rounded-full bg-mt-teal px-5 text-sm font-bold text-white">
          Ver minhas viagens
        </Link>
      </div>
    );
  }
  if (!trip) {
    return (
      <div className="flex justify-center py-20 text-mt-muted">
        <Loader2 className="animate-spin" aria-label="Carregando viagem" />
      </div>
    );
  }

  const days = trip.days.length;
  const stopsTotal = trip.days.reduce((n, d) => n + d.stops.length, 0);
  const planned = BUDGET_KEYS.reduce((s, k) => s + trip.budget[k], 0);
  const dayIndex = Math.min(day, days - 1);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Link copiado. Só quem participa da viagem consegue abrir.");
    } catch {
      setNotice("Não foi possível copiar o link.");
    }
  }

  return (
    <div className="bg-mt-bg text-mt-ink">
      <div className="mx-auto max-w-[1360px] px-4 pb-12 pt-6 md:px-6">
        <Link href="/viagens" className="mb-3 inline-flex h-9 items-center gap-1 rounded-full pr-3 text-sm font-bold text-mt-ink-2 hover:text-mt-ink">
          <ChevronLeft size={18} aria-hidden="true" />
          Viagens
        </Link>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-mt-muted">Viagem · {trip.city}</p>
            <h1 className="text-[30px] font-extrabold leading-10 tracking-[-0.5px] md:text-[34px]">{trip.title}</h1>
            <p className="text-sm text-mt-muted">
              {formatRange(trip.start_date, trip.end_date)} · {days} {days === 1 ? "dia" : "dias"} · {stopsTotal} {stopsTotal === 1 ? "lugar" : "lugares"}
              {planned > 0 && ` · ${money(planned)} estimados`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex -space-x-2" aria-label={`${trip.members.length} participantes`}>
              {trip.members.slice(0, 5).map((m) => (
                <PersonAvatar key={m.id} name={m.display_name || m.username} src={m.avatar_url} size={34} className="ring-2 ring-mt-bg" />
              ))}
            </span>
            {trip.is_owner && (
              <button
                type="button"
                onClick={() => {
                  setTab("pessoas");
                  window.setTimeout(() => inviteRef.current?.focus(), 50);
                }}
                className="flex h-10 items-center gap-2 rounded-full border-[1.5px] border-mt-line-strong bg-white px-4 text-sm font-bold hover:bg-mt-chip"
              >
                <UserPlus size={16} aria-hidden="true" />
                Convidar
              </button>
            )}
            <button type="button" onClick={share} className="flex h-10 items-center gap-2 rounded-full border-[1.5px] border-mt-line-strong bg-white px-4 text-sm font-bold hover:bg-mt-chip">
              <Share2 size={16} aria-hidden="true" />
              Compartilhar
            </button>
          </div>
        </header>

        <div className="mt-5 flex items-center justify-between gap-3 border-b border-mt-line">
          <div role="tablist" aria-label="Partes da viagem" className="flex flex-wrap gap-1">
            {(
              [
                ["roteiro", "Roteiro"],
                ["orcamento", "Orçamento"],
                ["pessoas", `Pessoas (${trip.members.length})`],
                ["ajustes", "Ajustes"],
              ] as [Tab, string][]
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={tab === v}
                onClick={() => setTab(v)}
                className={`h-12 border-b-[3px] px-4 text-sm ${tab === v ? "border-mt-teal font-extrabold text-mt-teal-dark" : "border-transparent font-semibold text-mt-ink-2 hover:text-mt-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <span aria-live="polite" className="text-xs font-semibold text-mt-muted">
            {saving ? "Salvando…" : "Tudo salvo"}
          </span>
        </div>
        {notice && (
          <p role="status" className="mt-3 rounded-xl bg-[#EAF1FB] px-4 py-2.5 text-sm font-semibold text-[#1D4E89]">
            {notice}
          </p>
        )}

        <div className="mt-5">
          {tab === "roteiro" && <Itinerary trip={trip} day={dayIndex} setDay={setDay} commit={commit} />}
          {tab === "orcamento" && <Budget trip={trip} commit={commit} viewerId={profile?.id ?? ""} />}
          {tab === "pessoas" && <People trip={trip} viewerId={profile?.id ?? ""} inviteRef={inviteRef} onTrip={replace} onLeft={() => router.push("/viagens")} />}
          {tab === "ajustes" && <Settings trip={trip} commit={commit} onDeleted={() => router.push("/viagens")} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roteiro

function Itinerary({
  trip,
  day,
  setDay,
  commit,
}: {
  trip: TripJson;
  day: number;
  setDay: (d: number) => void;
  commit: (t: TripJson, f: Editable[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const stops = trip.days[day].stops;
  const conflicts = useMemo(() => scheduleConflicts(stops), [stops]);
  const conflictFor = new Map(conflicts.map((c) => [c.stopId, c]));
  const dayKm = stops.slice(1).reduce((s, st, i) => s + legBetween(stops[i], st).km, 0);
  const points = useMemo(() => stops.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, name: s.name, category: s.category })), [stops]);
  const doneIds = useMemo(() => stops.filter((s) => s.done).map((s) => s.id), [stops]);

  function setStops(next: TripStopJson[], dayIdx = day, other?: { idx: number; stops: TripStopJson[] }) {
    const days = trip.days.map((d, i) => (i === dayIdx ? { stops: next } : other && i === other.idx ? { stops: other.stops } : d));
    commit({ ...trip, days }, ["days"]);
  }
  function update(id: string, patch: Partial<TripStopJson>) {
    setStops(stops.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function move(i: number, dir: -1 | 1) {
    const next = [...stops];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setStops(next);
  }
  function moveToDay(stop: TripStopJson, target: number) {
    if (target === day) return;
    if (trip.days[target].stops.length >= LIMITS.stopsPerDay) return;
    setStops(
      stops.filter((s) => s.id !== stop.id),
      day,
      { idx: target, stops: [...trip.days[target].stops, stop] }
    );
  }
  function add(place: { name: string; lat: number; lng: number; category: string | null }) {
    if (stops.length >= LIMITS.stopsPerDay) return;
    const last = stops[stops.length - 1];
    const lastEnd = last?.time ? (Number(last.time.slice(0, 2)) * 60 + Number(last.time.slice(3)) + (last.duration_min ?? 60) + legBetween(last, place).minutes) : null;
    const time = lastEnd != null && lastEnd < 24 * 60 ? `${String(Math.floor(lastEnd / 60)).padStart(2, "0")}:${String(Math.round(lastEnd % 60)).padStart(2, "0")}` : stops.length ? null : "09:00";
    setStops([...stops, { id: newId(), name: place.name.slice(0, 120), lat: place.lat, lng: place.lng, category: place.category, time, duration_min: 60, note: null, done: false }]);
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <nav aria-label="Dias da viagem" className="flex min-w-[200px] flex-[0_1_220px] flex-col gap-1">
        {trip.days.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setDay(i)}
            aria-current={i === day ? "step" : undefined}
            className={`flex flex-col gap-0.5 rounded-[10px] px-3 py-2.5 text-left text-sm ${i === day ? "bg-mt-teal-soft shadow-[inset_0_0_0_1px_#16845A]" : "hover:bg-white"}`}
          >
            <span className="font-extrabold">Dia {i + 1}</span>
            <span className="text-xs text-mt-muted">
              {formatDay(trip.start_date, i)} · {d.stops.length} {d.stops.length === 1 ? "lugar" : "lugares"}
            </span>
          </button>
        ))}
        <p className="mt-2 px-3 text-xs text-mt-muted">Para mais dias, mude a volta em Ajustes.</p>
      </nav>

      <main className="flex min-w-0 flex-[3_1_380px] flex-col gap-4">
        <section className={`${card} p-5`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-extrabold">
              Dia {day + 1} · {formatDay(trip.start_date, day, { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            <span className="text-[13px] text-mt-muted">
              {stops.length} {stops.length === 1 ? "parada" : "paradas"}
              {stops.length > 1 && ` · ${formatKm(dayKm)}`}
            </span>
          </div>

          {stops.length === 0 ? (
            <p className="mt-4 rounded-[14px] border border-dashed border-mt-line-strong px-4 py-8 text-center text-sm text-mt-muted">
              Nenhuma parada neste dia. Adicione um lugar salvo ou busque um endereço.
            </p>
          ) : (
            <ol className="mt-4">
              {stops.map((s, i) => {
                const leg = i < stops.length - 1 ? legBetween(s, stops[i + 1]) : null;
                const late = conflictFor.get(s.id);
                return (
                  <li key={s.id}>
                    <div className={`flex gap-3 rounded-[14px] p-3 ${late ? "bg-[#FCF3E0]" : "hover:bg-mt-bg"}`}>
                      <button
                        type="button"
                        onClick={() => update(s.id, { done: !s.done })}
                        aria-pressed={s.done}
                        aria-label={s.done ? `Desmarcar ${s.name} como visitado` : `Marcar ${s.name} como visitado`}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${s.done ? "bg-[#59625C] text-white" : "bg-[#16845A] text-white"}`}
                      >
                        {s.done ? <Check size={16} aria-hidden="true" /> : i + 1}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <label className="sr-only" htmlFor={`t-${s.id}`}>
                            Horário de {s.name}
                          </label>
                          <input
                            id={`t-${s.id}`}
                            type="time"
                            value={s.time ?? ""}
                            onChange={(e) => update(s.id, { time: e.target.value || null })}
                            className="h-8 rounded-lg border border-mt-line px-1.5 text-sm font-bold tabular-nums focus:border-mt-teal focus:outline-none"
                          />
                          <span className={`min-w-0 truncate text-[15px] font-extrabold ${s.done ? "text-mt-muted line-through" : ""}`}>{s.name}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-mt-muted">
                          {s.category && <span>{CATEGORY_LABEL[s.category]}</span>}
                          <label className="flex items-center gap-1">
                            <span>Duração</span>
                            <select
                              value={s.duration_min ?? ""}
                              onChange={(e) => update(s.id, { duration_min: e.target.value ? Number(e.target.value) : null })}
                              className="h-7 rounded-md border border-mt-line bg-white px-1 text-xs font-bold text-mt-ink"
                            >
                              <option value="">—</option>
                              {[15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 480].map((m) => (
                                <option key={m} value={m}>
                                  {formatDuration(m)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <NoteInput value={s.note} onSave={(note) => update(s.id, { note })} label={`Observação sobre ${s.name}`} />
                        {late && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-[#8F5C00]">
                            <AlertTriangle size={13} aria-hidden="true" />
                            Horário apertado: saindo de {late.previous}, você chega ~{formatDuration(late.lateBy)} depois.
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <div className="flex">
                          <IconBtn label={`Subir ${s.name}`} disabled={i === 0} onClick={() => move(i, -1)}>
                            <ArrowUp size={16} />
                          </IconBtn>
                          <IconBtn label={`Descer ${s.name}`} disabled={i === stops.length - 1} onClick={() => move(i, 1)}>
                            <ArrowDown size={16} />
                          </IconBtn>
                          <IconBtn label={`Remover ${s.name}`} onClick={() => setStops(stops.filter((x) => x.id !== s.id))}>
                            <Trash2 size={16} />
                          </IconBtn>
                        </div>
                        {trip.days.length > 1 && (
                          <select
                            aria-label={`Mover ${s.name} para outro dia`}
                            value={day}
                            onChange={(e) => moveToDay(s, Number(e.target.value))}
                            className="h-7 rounded-md border border-mt-line bg-white px-1 text-xs"
                          >
                            {trip.days.map((d, di) => (
                              <option key={di} value={di} disabled={di !== day && d.stops.length >= LIMITS.stopsPerDay}>
                                Dia {di + 1}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    {leg && (
                      <p className="ml-[27px] border-l-2 border-dashed border-mt-line-strong py-1.5 pl-6 text-xs text-mt-muted">
                        ~{formatDuration(leg.minutes)} {leg.mode} · {formatKm(leg.km)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {conflicts.length > 0 && (
            <div role="alert" className="mt-3 flex gap-2 rounded-[14px] bg-[#FCF3E0] p-3 text-sm text-[#6B4500]">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                <strong>Horário apertado.</strong> {conflicts.length === 1 ? "Uma parada começa" : `${conflicts.length} paradas começam`} antes de dar tempo de chegar. Ajuste os horários ou as durações.
              </span>
            </div>
          )}
          <p className="mt-3 text-xs text-mt-muted">Tempos de trajeto são estimativas em linha reta, não rotas reais.</p>
        </section>

        {adding ? (
          <AddStop trip={trip} onAdd={add} onClose={() => setAdding(false)} full={stops.length >= LIMITS.stopsPerDay} />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-11 items-center justify-center gap-2 self-start rounded-full border-[1.5px] border-mt-line-strong bg-white px-5 text-sm font-bold hover:bg-mt-chip"
          >
            <Plus size={17} aria-hidden="true" />
            Adicionar lugar
          </button>
        )}
      </main>

      <aside className="flex min-w-[300px] flex-[2_1_360px] flex-col gap-4">
        <TripMap points={points} center={{ lat: trip.lat, lng: trip.lng }} route doneIds={doneIds} label={`Rota do dia ${day + 1} com ${stops.length} paradas`} />
        <BudgetSummary trip={trip} />
      </aside>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="flex h-8 w-8 items-center justify-center rounded-full text-mt-ink-2 hover:bg-mt-chip disabled:opacity-30">
      {children}
    </button>
  );
}

function NoteInput({ value, onSave, label }: { value: string | null; onSave: (v: string | null) => void; label: string }) {
  const [text, setText] = useState(value ?? "");
  useEffect(() => setText(value ?? ""), [value]);
  return (
    <input
      aria-label={label}
      value={text}
      maxLength={200}
      placeholder="Observação (ingresso, reserva…)"
      onChange={(e) => setText(e.target.value)}
      onBlur={() => (text.trim() || null) !== value && onSave(text.trim() || null)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="mt-1.5 h-8 w-full rounded-lg border border-transparent bg-transparent px-1.5 text-[13px] placeholder:text-mt-muted hover:border-mt-line focus:border-mt-teal focus:bg-white focus:outline-none"
    />
  );
}

function AddStop({
  trip,
  onAdd,
  onClose,
  full,
}: {
  trip: TripJson;
  onAdd: (p: { name: string; lat: number; lng: number; category: string | null }) => void;
  onClose: () => void;
  full: boolean;
}) {
  const [mode, setMode] = useState<"salvos" | "buscar">("salvos");
  const [saved, setSaved] = useState<SavedPlace[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    fetch("/api/places?status=quero_visitar")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setSaved(d.items ?? []))
      .catch(() => setSaved([]));
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setResults(await geocodeSearch(`${query}, ${trip.city}`, { near: { lat: trip.lat, lng: trip.lng }, limit: 6 }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const tripStopNames = new Set(trip.days.flatMap((d) => d.stops.map((s) => s.name.toLowerCase())));

  return (
    <section aria-labelledby="add-stop" className={`${card} p-5`}>
      <div className="flex items-center justify-between">
        <h2 id="add-stop" className="font-extrabold">
          Adicionar lugar
        </h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-mt-chip">
          <X size={17} />
        </button>
      </div>
      {full && <p className="mt-2 text-sm font-semibold text-[#8F5C00]">Este dia já tem {LIMITS.stopsPerDay} paradas.</p>}
      <div role="group" aria-label="Origem do lugar" className="mt-3 flex gap-1 self-start rounded-full bg-[#E9ECEA] p-1">
        {(
          [
            ["salvos", "Lugares salvos", Bookmark],
            ["buscar", "Buscar endereço", Search],
          ] as const
        ).map(([v, label, Icon]) => (
          <button
            key={v}
            type="button"
            aria-pressed={mode === v}
            onClick={() => setMode(v)}
            className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] ${mode === v ? "bg-white font-extrabold text-mt-teal-dark" : "font-semibold text-mt-ink-2"}`}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {mode === "salvos" ? (
        saved === null ? (
          <Loader2 className="mt-4 animate-spin text-mt-muted" aria-label="Carregando lugares salvos" />
        ) : saved.length === 0 ? (
          <p className="mt-4 text-sm text-mt-muted">
            Você ainda não salvou lugares.{" "}
            <Link href="/quero-visitar" className="font-bold text-mt-teal-dark underline">
              Abrir Quero visitar
            </Link>
          </p>
        ) : (
          <ul className="mt-3 flex max-h-[320px] flex-col overflow-y-auto">
            {saved.map(({ id, place }) => (
              <li key={id} className="flex items-center gap-3 border-b border-mt-line py-2 last:border-b-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{place.name}</span>
                  <span className="block text-xs text-mt-muted">{place.category ? CATEGORY_LABEL[place.category] : "Lugar salvo"}</span>
                </span>
                {tripStopNames.has(place.name.toLowerCase()) && <span className="text-xs font-bold text-mt-teal-dark">no roteiro</span>}
                <button
                  type="button"
                  disabled={full}
                  onClick={() => onAdd({ name: place.name, lat: place.lat, lng: place.lng, category: place.category })}
                  className="h-9 shrink-0 rounded-full bg-mt-teal px-3.5 text-[13px] font-bold text-white hover:bg-mt-teal-dark disabled:opacity-50"
                >
                  Adicionar
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          <form onSubmit={search} className="mt-3 flex gap-2">
            <label htmlFor="stop-q" className="sr-only">
              Nome ou endereço
            </label>
            <input id="stop-q" value={query} onChange={(e) => setQuery(e.target.value)} required maxLength={120} placeholder={`Ex.: museu, praia, rua… em ${trip.city.split(",")[0]}`} className={field} />
            <select aria-label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 rounded-[12px] border-[1.5px] border-mt-line-strong bg-white px-2 text-sm">
              <option value="">Categoria</option>
              {POST_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <button type="submit" disabled={busy} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#080A09] px-4 text-sm font-bold text-white disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
              Buscar
            </button>
          </form>
          {error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-[#B42323]">
              {error}
            </p>
          )}
          {results && (
            <ul className="mt-3 flex flex-col">
              {results.length === 0 && <li className="text-sm text-mt-muted">Nada encontrado. Tente outro nome.</li>}
              {results.map((r, i) => (
                <li key={`${r.lat},${r.lng},${i}`} className="flex items-center gap-3 border-b border-mt-line py-2 last:border-b-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{r.name}</span>
                    <span className="block truncate text-xs text-mt-muted">{r.label}</span>
                  </span>
                  <button
                    type="button"
                    disabled={full}
                    onClick={() => onAdd({ name: r.name, lat: r.lat, lng: r.lng, category: category || null })}
                    className="h-9 shrink-0 rounded-full bg-mt-teal px-3.5 text-[13px] font-bold text-white hover:bg-mt-teal-dark disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Orçamento

function spentBy(trip: TripJson) {
  const out = Object.fromEntries(BUDGET_KEYS.map((k) => [k, 0])) as Record<BudgetKey, number>;
  for (const e of trip.expenses) out[e.key] += e.amount;
  return out;
}

function BudgetSummary({ trip }: { trip: TripJson }) {
  const spent = spentBy(trip);
  const planned = BUDGET_KEYS.reduce((s, k) => s + trip.budget[k], 0);
  const total = BUDGET_KEYS.reduce((s, k) => s + spent[k], 0);
  return (
    <section aria-labelledby="orc-resumo" className={`${card} p-5`}>
      <div className="flex items-baseline justify-between">
        <h2 id="orc-resumo" className="font-extrabold">
          Orçamento
        </h2>
        <span className="text-xs text-mt-muted">{trip.members.length > 1 ? `${money(total / trip.members.length)} por pessoa` : ""}</span>
      </div>
      <p className="mt-1 text-sm">
        <strong className="text-lg tabular-nums">{money(total)}</strong> <span className="text-mt-muted">gastos de {money(planned)}</span>
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {BUDGET_KEYS.map((k) => (
          <li key={k}>
            <div className="flex justify-between text-[13px]">
              <span className="font-semibold">{BUDGET_LABELS[k]}</span>
              <span className="tabular-nums text-mt-muted">
                {money(spent[k])} / {money(trip.budget[k])}
              </span>
            </div>
            <Bar value={spent[k]} max={trip.budget[k]} label={BUDGET_LABELS[k]} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const over = max > 0 && value > max;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  return (
    <div
      role="progressbar"
      aria-label={`${label}: ${money(value)} de ${money(max)}${over ? ", acima do previsto" : ""}`}
      aria-valuemin={0}
      aria-valuemax={Math.max(max, value)}
      aria-valuenow={value}
      className="mt-1 h-2 overflow-hidden rounded-full bg-mt-line"
    >
      <div className={`h-2 rounded-full ${over ? "bg-[#C2362F]" : "bg-[#16845A]"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Budget({ trip, commit, viewerId }: { trip: TripJson; commit: (t: TripJson, f: Editable[]) => void; viewerId: string }) {
  const [form, setForm] = useState({ key: "alimentacao" as BudgetKey, label: "", amount: "" });
  const [error, setError] = useState("");
  const names = new Map(trip.members.map((m) => [m.id, m.display_name || m.username]));

  function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount.replace(/\./g, "").replace(",", "."));
    if (!form.label.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Informe a descrição e um valor maior que zero.");
      return;
    }
    if (trip.expenses.length >= LIMITS.expenses) {
      setError(`Até ${LIMITS.expenses} gastos por viagem.`);
      return;
    }
    setError("");
    const expense = { id: newId(), key: form.key, label: form.label.trim().slice(0, 80), amount, created_by: viewerId, created_at: new Date().toISOString() };
    commit({ ...trip, expenses: [expense, ...trip.expenses] }, ["expenses"]);
    setForm({ ...form, label: "", amount: "" });
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <section aria-labelledby="previsto" className={`${card} min-w-[300px] flex-[1_1_340px] p-5`}>
        <h2 id="previsto" className="font-extrabold">
          Previsto por categoria
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {BUDGET_KEYS.map((k) => (
            <MoneyInput key={k} label={BUDGET_LABELS[k]} value={trip.budget[k]} onSave={(v) => commit({ ...trip, budget: { ...trip.budget, [k]: v } }, ["budget"])} />
          ))}
        </div>
        <p className="mt-4 border-t border-mt-line pt-3 text-sm">
          Total previsto: <strong className="tabular-nums">{money(BUDGET_KEYS.reduce((s, k) => s + trip.budget[k], 0))}</strong>
        </p>
      </section>

      <section aria-labelledby="gastos" className={`${card} min-w-[300px] flex-[2_1_480px] p-5`}>
        <h2 id="gastos" className="font-extrabold">
          Gastos
        </h2>
        <form onSubmit={addExpense} className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr_130px_auto]">
          <select aria-label="Categoria do gasto" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value as BudgetKey })} className={field}>
            {BUDGET_KEYS.map((k) => (
              <option key={k} value={k}>
                {BUDGET_LABELS[k]}
              </option>
            ))}
          </select>
          <input aria-label="Descrição" placeholder="Descrição" maxLength={80} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={field} />
          <input aria-label="Valor em reais" placeholder="R$ 0,00" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={field} />
          <button type="submit" className="h-11 rounded-full bg-mt-teal px-5 text-sm font-bold text-white hover:bg-mt-teal-dark">
            Adicionar
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-[#B42323]">
            {error}
          </p>
        )}
        {trip.expenses.length === 0 ? (
          <p className="mt-4 text-sm text-mt-muted">Nenhum gasto registrado.</p>
        ) : (
          <ul className="mt-4">
            {trip.expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-3 border-b border-mt-line py-2.5 text-sm last:border-b-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{e.label}</span>
                  <span className="block text-xs text-mt-muted">
                    {BUDGET_LABELS[e.key]} · {names.get(e.created_by) ?? "ex-participante"}
                  </span>
                </span>
                <span className="font-extrabold tabular-nums">{money(e.amount)}</span>
                <IconBtn label={`Remover gasto ${e.label}`} onClick={() => commit({ ...trip, expenses: trip.expenses.filter((x) => x.id !== e.id) }, ["expenses"])}>
                  <Trash2 size={16} />
                </IconBtn>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="min-w-[300px] flex-[1_1_340px]">
        <BudgetSummary trip={trip} />
      </div>
    </div>
  );
}

function MoneyInput({ label, value, onSave }: { label: string; value: number; onSave: (v: number) => void }) {
  const [text, setText] = useState(value ? String(value).replace(".", ",") : "");
  const [error, setError] = useState(false);
  useEffect(() => setText(value ? String(value).replace(".", ",") : ""), [value]);
  function save() {
    const n = text.trim() ? Number(text.replace(/\./g, "").replace(",", ".")) : 0;
    if (!Number.isFinite(n) || n < 0 || n > LIMITS.money) {
      setError(true);
      return;
    }
    setError(false);
    if (n !== value) onSave(Math.round(n * 100) / 100);
  }
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-bold">
      {label}
      <span className="flex flex-col items-end">
        <input
          inputMode="decimal"
          value={text}
          placeholder="0"
          aria-invalid={error}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className={`h-10 w-36 rounded-[10px] border-[1.5px] px-3 text-right tabular-nums focus:outline-none ${error ? "border-[#C2362F]" : "border-mt-line-strong focus:border-mt-teal"}`}
        />
        {error && <span className="text-xs text-[#B42323]">Valor inválido</span>}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Pessoas

function People({
  trip,
  viewerId,
  inviteRef,
  onTrip,
  onLeft,
}: {
  trip: TripJson;
  viewerId: string;
  inviteRef: React.RefObject<HTMLInputElement | null>;
  onTrip: (t: TripJson) => void;
  onLeft: () => void;
}) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: "", error: false });

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg({ text: "", error: false });
    try {
      const res = await fetch(`/api/trips/${trip.id}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível convidar.");
      onTrip(data.trip);
      setUsername("");
      setMsg({ text: "Pessoa adicionada à viagem.", error: false });
    } catch (err) {
      setMsg({ text: (err as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string, self: boolean) {
    if (!confirm(self ? "Sair desta viagem?" : "Remover esta pessoa da viagem?")) return;
    const res = await fetch(`/api/trips/${trip.id}/members?user_id=${userId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setMsg({ text: data.error || "Não foi possível remover.", error: true });
      return;
    }
    if (self) onLeft();
    else if (data.trip) onTrip(data.trip);
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <section aria-labelledby="pessoas-t" className={`${card} min-w-[300px] flex-[2_1_480px] p-5`}>
        <h2 id="pessoas-t" className="font-extrabold">
          Quem vai
        </h2>
        <ul className="mt-3">
          {trip.members.map((m) => {
            const name = m.display_name || m.username;
            const owner = m.id === trip.owner_id;
            const self = m.id === viewerId;
            return (
              <li key={m.id} className="flex items-center gap-3 border-b border-mt-line py-2.5 last:border-b-0">
                <PersonAvatar name={name} src={m.avatar_url} size={40} />
                <span className="min-w-0 flex-1">
                  <Link href={`/profile/${m.username}`} className="block truncate text-sm font-bold text-mt-ink hover:underline">
                    {name}
                    {self && " (você)"}
                  </Link>
                  <span className="block text-xs text-mt-muted">{owner ? "Criou a viagem" : "Participante"}</span>
                </span>
                {!owner && (trip.is_owner || self) && (
                  <button type="button" onClick={() => remove(m.id, self)} className="h-9 rounded-full px-3 text-[13px] font-bold text-[#B42323] hover:bg-[#FBEAE8]">
                    {self ? "Sair" : "Remover"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-mt-muted">Todos os participantes podem editar o roteiro e o orçamento.</p>
      </section>
      {trip.is_owner && (
        <section aria-labelledby="convidar-t" className={`${card} min-w-[300px] flex-[1_1_340px] p-5`}>
          <h2 id="convidar-t" className="font-extrabold">
            Convidar
          </h2>
          <p className="mt-1 text-[13px] text-mt-muted">Só amigos: pessoas que você segue e que seguem você.</p>
          <form onSubmit={invite} className="mt-3 flex gap-2">
            <label htmlFor="invite" className="sr-only">
              Usuário
            </label>
            <input
              id="invite"
              ref={inviteRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@usuario"
              required
              maxLength={31}
              disabled={trip.members.length >= LIMITS.members}
              className={field}
            />
            <button type="submit" disabled={busy || trip.members.length >= LIMITS.members} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-mt-teal px-4 text-sm font-bold text-white disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
              Convidar
            </button>
          </form>
          {msg.text && (
            <p role={msg.error ? "alert" : "status"} className={`mt-2 text-sm font-semibold ${msg.error ? "text-[#B42323]" : "text-mt-teal-dark"}`}>
              {msg.text}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ajustes

function Settings({ trip, commit, onDeleted }: { trip: TripJson; commit: (t: TripJson, f: Editable[]) => void; onDeleted: () => void }) {
  const [form, setForm] = useState({ title: trip.title, start_date: trip.start_date, end_date: trip.end_date });
  const [error, setError] = useState("");

  function save(e: React.FormEvent) {
    e.preventDefault();
    const span = spanDays(form.start_date, form.end_date);
    if (!form.title.trim()) return setError("Dê um nome à viagem.");
    if (!span) return setError(`A volta precisa ser no mesmo dia ou depois da ida, em até ${LIMITS.days} dias.`);
    if (trip.days.slice(span).some((d) => d.stops.length)) return setError("Tire as paradas dos últimos dias antes de encurtar a viagem.");
    setError("");
    const days = Array.from({ length: span }, (_, i) => trip.days[i] ?? { stops: [] });
    commit({ ...trip, title: form.title.trim(), start_date: form.start_date, end_date: form.end_date, days }, ["title", "start_date", "end_date", "days"]);
  }

  async function remove() {
    if (!confirm("Excluir esta viagem para todos os participantes?")) return;
    const res = await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
    else setError((await res.json()).error || "Não foi possível excluir.");
  }

  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <form onSubmit={save} className={`${card} grid gap-3 p-5 sm:grid-cols-2`}>
        <label className="text-sm font-bold sm:col-span-2">
          Nome
          <input value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${field} mt-1.5`} />
        </label>
        <label className="text-sm font-bold">
          Ida
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={`${field} mt-1.5`} />
        </label>
        <label className="text-sm font-bold">
          Volta
          <input type="date" value={form.end_date} min={form.start_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={`${field} mt-1.5`} />
        </label>
        <p className="text-xs text-mt-muted sm:col-span-2">Mudar a ida desloca todos os dias; as paradas ficam no mesmo número de dia.</p>
        {error && (
          <p role="alert" className="text-sm font-semibold text-[#B42323] sm:col-span-2">
            {error}
          </p>
        )}
        <button type="submit" className="h-11 justify-self-start rounded-full bg-mt-teal px-6 text-sm font-bold text-white hover:bg-mt-teal-dark">
          Salvar ajustes
        </button>
      </form>
      {trip.is_owner && (
        <section className="rounded-[20px] border-[1.5px] border-[#C2362F] bg-white p-5">
          <h2 className="font-extrabold text-[#7A1F1A]">Excluir viagem</h2>
          <p className="mt-1 text-sm text-mt-muted">Apaga o roteiro, o orçamento e os gastos para todos.</p>
          <button type="button" onClick={remove} className="mt-3 h-11 rounded-full bg-[#C2362F] px-5 text-sm font-bold text-white">
            Excluir viagem
          </button>
        </section>
      )}
    </div>
  );
}
