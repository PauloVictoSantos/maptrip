"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Compass, Loader2, MapPin, Plus, X } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { geocodeSearch } from "@/lib/geocode";
import { LIMITS, formatRange, money, spanDays, type TripSummary } from "@/lib/trips";

const field = "mt-1.5 h-11 w-full rounded-[12px] border-[1.5px] border-mt-line-strong bg-white px-3.5 text-[15px] focus:border-mt-teal focus:outline-none";

function isoToday(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TripsPage() {
  const { profile } = useAuthContext();
  const [trips, setTrips] = useState<TripSummary[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [prefillCity, setPrefillCity] = useState("");

  useEffect(() => {
    document.title = "Viagens · MapTrip";
    const params = new URLSearchParams(window.location.search);
    const city = params.get("cidade");
    if (params.get("nova") === "1") {
      setCreating(true);
      if (city) setPrefillCity(city.slice(0, 80));
    }
    fetch("/api/trips")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Não foi possível carregar suas viagens.");
        setTrips(d.trips);
      })
      .catch((e) => setError(e.message));
  }, []);

  const today = isoToday();
  const upcoming = trips?.filter((t) => t.end_date >= today) ?? [];
  const past = trips?.filter((t) => t.end_date < today) ?? [];

  return (
    <div className="bg-mt-bg text-mt-ink">
      <div className="mx-auto max-w-[1100px] px-4 pb-12 pt-8 md:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-extrabold tracking-[-0.5px] md:text-[34px]">Viagens</h1>
            <p className="mt-1 text-sm text-mt-muted">Monte o roteiro dia a dia, com mapa, orçamento e amigos.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/destino${profile?.city ? `?cidade=${encodeURIComponent(profile.city)}` : ""}`}
              className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-mt-line-strong bg-white px-5 text-sm font-bold hover:bg-mt-chip"
            >
              <Compass size={17} aria-hidden="true" />
              Explorar destinos
            </Link>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex h-11 items-center gap-2 rounded-full bg-mt-teal px-5 text-sm font-bold text-white hover:bg-mt-teal-dark"
            >
              <Plus size={17} aria-hidden="true" />
              Nova viagem
            </button>
          </div>
        </header>

        {creating && <CreateTrip initialCity={prefillCity} onClose={() => setCreating(false)} />}

        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-[#FFF0F0] px-4 py-3 text-sm font-semibold text-[#B42323]">
            {error}
          </p>
        )}

        {!trips && !error ? (
          <div aria-hidden="true" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-[20px] bg-mt-chip motion-reduce:animate-none" />
            ))}
          </div>
        ) : trips && trips.length === 0 ? (
          <div className="mt-8 rounded-[20px] border border-dashed border-mt-line-strong bg-white px-6 py-12 text-center">
            <p className="text-base font-extrabold">Nenhuma viagem planejada ainda</p>
            <p className="mt-1 text-sm text-mt-muted">Crie uma viagem e adicione os lugares que você salvou em “Quero visitar”.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && <TripGrid title="Próximas" trips={upcoming} />}
            {past.length > 0 && <TripGrid title="Já aconteceram" trips={past} />}
          </>
        )}
      </div>
    </div>
  );
}

function TripGrid({ title, trips }: { title: string; trips: TripSummary[] }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[19px] font-extrabold">{title}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((t) => {
          const days = spanDays(t.start_date, t.end_date) ?? 0;
          return (
            <li key={t.id}>
              <Link href={`/viagens/${t.id}`} className="flex h-full flex-col gap-3 rounded-[20px] border border-mt-line bg-white p-5 text-mt-ink hover:border-mt-line-strong">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-mt-muted">Viagem · {t.city}</span>
                <span className="text-lg font-extrabold leading-6">{t.title}</span>
                <span className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-mt-ink-2">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={14} aria-hidden="true" />
                    {formatRange(t.start_date, t.end_date)} · {days} {days === 1 ? "dia" : "dias"}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={14} aria-hidden="true" />
                    {t.stops} {t.stops === 1 ? "lugar" : "lugares"}
                  </span>
                  {t.planned > 0 && <span>{money(t.planned)}</span>}
                </span>
                <span className="mt-auto flex items-center gap-2">
                  <span className="flex -space-x-2">
                    {t.members.slice(0, 4).map((m) => (
                      <PersonAvatar key={m.id} name={m.display_name || m.username} src={m.avatar_url} size={28} className="ring-2 ring-white" />
                    ))}
                  </span>
                  <span className="text-xs text-mt-muted">
                    {t.members.length === 1 ? "Só você" : `${t.members.length} pessoas`}
                    {!t.is_owner && " · convidado"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CreateTrip({ initialCity, onClose }: { initialCity: string; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", city: initialCity, start_date: isoToday(7), end_date: isoToday(10) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialCity) setForm((f) => ({ ...f, city: initialCity, title: f.title || `${initialCity.split(",")[0]} em breve` }));
  }, [initialCity]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const span = spanDays(form.start_date, form.end_date);
    if (!span) {
      setError(`A volta precisa ser no mesmo dia ou depois da ida, em até ${LIMITS.days} dias.`);
      return;
    }
    setBusy(true);
    try {
      const [place] = await geocodeSearch(form.city, { limit: 1 });
      if (!place) throw new Error("Não encontramos esse destino. Tente “Cidade, UF”.");
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, lat: place.lat, lng: place.lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível criar a viagem.");
      router.push(`/viagens/${data.trip.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="nova-viagem" className="mt-6 rounded-[20px] border border-mt-line bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 id="nova-viagem" className="text-lg font-extrabold">
          Nova viagem
        </h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-mt-chip">
          <X size={18} />
        </button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <label className="text-sm font-bold md:col-span-2">
          Nome
          <input
            required
            autoFocus
            maxLength={80}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Rio em fevereiro"
            className={field}
          />
        </label>
        <label className="text-sm font-bold md:col-span-2">
          Destino
          <input required maxLength={80} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Rio de Janeiro, RJ" className={field} />
        </label>
        <label className="text-sm font-bold">
          Ida
          <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={field} />
        </label>
        <label className="text-sm font-bold">
          Volta
          <input type="date" required min={form.start_date} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={field} />
        </label>
        <div className="flex items-end md:col-span-2">
          <button type="submit" disabled={busy} className="flex h-11 items-center gap-2 rounded-full bg-mt-teal px-6 text-sm font-bold text-white hover:bg-mt-teal-dark disabled:opacity-60">
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            Criar viagem
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-[#B42323]">
          {error}
        </p>
      )}
    </form>
  );
}
