"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { BedDouble, Coffee, Landmark, Loader2, Plus, Search, Share2, ShoppingBag, Trees, Utensils, Wine, type LucideIcon } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { CATEGORY_GROUPS, formatRatingBR, groupFor } from "@/components/map/categories";
import { POST_CATEGORIES } from "@/lib/types";
import { FEED_FILTERS, type FeedFilterId } from "@/lib/feed";
import { geocodeCity } from "@/lib/geocode";
import { placeHref } from "@/lib/place";
import type { DestinationResponse } from "@/lib/destination";

const TripMap = dynamic(() => import("@/components/trip/TripMap"), {
  ssr: false,
  loading: () => <div className="h-[380px] animate-pulse rounded-[20px] bg-mt-land motion-reduce:animate-none" />,
});

const ICONS: Record<FeedFilterId, LucideIcon | null> = {
  todos: null,
  comer: Utensils,
  bares: Wine,
  cafes: Coffee,
  museus: Landmark,
  natureza: Trees,
  hoteis: BedDouble,
  compras: ShoppingBag,
};
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(POST_CATEGORIES.map((c) => [c.value, c.label]));

export default function DestinationPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuthContext();
  const [city, setCity] = useState("");
  const [input, setInput] = useState("");
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState<FeedFilterId>("todos");
  const [data, setData] = useState<DestinationResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [notice, setNotice] = useState("");

  // City from ?cidade=, else the profile city.
  useEffect(() => {
    if (authLoading) return;
    const fromUrl = new URLSearchParams(window.location.search).get("cidade")?.slice(0, 80);
    const initial = fromUrl || profile?.city || "";
    setCity(initial);
    setInput(initial);
  }, [authLoading, profile?.city]);

  useEffect(() => {
    if (!city) return;
    document.title = `${city.split(",")[0]} · MapTrip`;
    let alive = true;
    setError("");
    setCenter(null);
    setData(null);
    geocodeCity(city)
      .then((c) => {
        if (!alive) return;
        if (!c) throw new Error(`Não encontramos “${city}” no mapa.`);
        setCenter(c);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [city]);

  useEffect(() => {
    if (!center) return;
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams({ near: `${center.lat.toFixed(4)},${center.lng.toFixed(4)}` });
    if (filter !== "todos") params.set("filter", filter);
    fetch(`/api/destination?${params}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Não foi possível carregar o destino.");
        if (alive) setData(d);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [center, filter]);

  const points = useMemo(
    () => (data?.places ?? []).slice(0, 20).map((p) => ({ id: p.key, lat: p.lat, lng: p.lng, name: p.name.split(",")[0], category: p.category, rating: p.rating })),
    [data]
  );

  function go(e: React.FormEvent) {
    e.preventDefault();
    const next = input.trim();
    if (!next) return;
    setCity(next);
    setShowAll(false);
    router.replace(`/destino?cidade=${encodeURIComponent(next)}`);
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Link copiado");
      window.setTimeout(() => setNotice(""), 2500);
    } catch {
      /* ignore */
    }
  }

  const cityName = city.split(",")[0];
  const hero = data?.places.find((p) => p.photo_url)?.photo_url ?? null;
  const shown = showAll ? data?.places ?? [] : (data?.places ?? []).slice(0, 6);

  return (
    <div className="bg-mt-bg text-mt-ink">
      <div className="mx-auto max-w-[1360px] px-4 pb-12 pt-6 md:px-6">
        <form role="search" onSubmit={go} className="relative max-w-[520px]">
          <label htmlFor="dest-q" className="sr-only">
            Buscar destino
          </label>
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mt-muted" />
          <input
            id="dest-q"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Buscar cidade (ex.: Belém, PA)"
            maxLength={80}
            className="h-11 w-full rounded-full border-[1.5px] border-mt-line bg-white pl-10 pr-4 text-[15px] focus:border-mt-teal focus:outline-none"
          />
        </form>

        {!city && !authLoading && <p className="mt-10 text-center text-sm text-mt-muted">Busque uma cidade para ver o que a comunidade registrou por lá.</p>}

        {city && (
          <>
            <section className="relative mt-5 h-[300px] overflow-hidden rounded-[28px] bg-[#123D2C] md:h-[380px]">
              {hero && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent from-30% to-[rgba(8,10,9,0.78)]" />
              <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-end justify-between gap-4 text-white md:inset-x-10 md:bottom-8">
                <div>
                  <h1 className="text-[40px] font-extrabold leading-[44px] tracking-[-1px] md:text-[56px] md:leading-[60px]">{cityName}</h1>
                  <p className="mt-1 text-[15px]">
                    {city.includes(",") ? `${city.split(",").slice(1).join(",").trim()} · ` : ""}
                    {data
                      ? `${data.total_places.toLocaleString("pt-BR")} ${data.total_places === 1 ? "lugar" : "lugares"} · ${data.explorers.toLocaleString("pt-BR")} ${
                          data.explorers === 1 ? "explorador" : "exploradores"
                        }`
                      : "Carregando…"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={share} className="flex h-11 items-center gap-2 rounded-full bg-white/90 px-4 text-sm font-bold text-mt-ink hover:bg-white">
                    <Share2 size={16} aria-hidden="true" />
                    {notice || "Compartilhar"}
                  </button>
                  <Link
                    href={`/viagens?nova=1&cidade=${encodeURIComponent(city)}`}
                    className="flex h-11 items-center gap-2 rounded-full bg-[#16845A] px-5 text-sm font-bold text-white hover:bg-[#126E4B]"
                  >
                    <Plus size={16} aria-hidden="true" />
                    Criar viagem
                  </Link>
                </div>
              </div>
            </section>

            <div role="group" aria-label="O que procurar" className="mt-6 flex flex-wrap gap-2">
              {FEED_FILTERS.map((f) => {
                const Icon = ICONS[f.id];
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={filter === f.id}
                    onClick={() => {
                      setFilter(f.id);
                      setShowAll(false);
                    }}
                    className={`flex h-9 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-[13px] ${
                      filter === f.id ? "border-mt-teal bg-mt-teal-soft font-extrabold text-mt-teal-dark" : "border-mt-line bg-white font-semibold text-mt-ink-2 hover:border-mt-line-strong"
                    }`}
                  >
                    {Icon && <Icon size={15} strokeWidth={2.2} aria-hidden="true" />}
                    {f.id === "todos" ? "Imperdíveis" : f.label}
                  </button>
                );
              })}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-[#FFF0F0] px-4 py-3 text-sm font-semibold text-[#B42323]">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-start gap-8">
              <main className="min-w-0 flex-[999_1_480px]" aria-busy={loading}>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[24px] font-extrabold tracking-[-0.3px]">{filter === "todos" ? "Principais atrações" : FEED_FILTERS.find((f) => f.id === filter)?.label}</h2>
                  {data && data.places.length > 6 && (
                    <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm font-bold text-mt-teal-dark hover:underline">
                      {showAll ? "Ver menos" : `Ver todas (${data.places.length})`}
                    </button>
                  )}
                </div>
                {!data ? (
                  <div aria-hidden="true" className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-60 animate-pulse rounded-[20px] bg-mt-chip motion-reduce:animate-none" />
                    ))}
                  </div>
                ) : data.places.length === 0 ? (
                  <div className="mt-4 rounded-[20px] border border-dashed border-mt-line-strong bg-white px-6 py-10 text-center">
                    <p className="font-extrabold">Ninguém registrou visitas públicas aqui ainda</p>
                    <p className="mt-1 text-sm text-mt-muted">Seja a primeira pessoa a mostrar {cityName} no MapTrip.</p>
                    <Link href="/post/new" className="mt-4 inline-flex h-10 items-center rounded-full bg-mt-teal px-5 text-sm font-bold text-white">
                      Registrar visita
                    </Link>
                  </div>
                ) : (
                  <ul className={`mt-4 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 ${loading ? "opacity-60" : ""}`}>
                    {shown.map((p) => {
                      const g = CATEGORY_GROUPS[groupFor(p.category)];
                      const [title, ...rest] = p.name.split(",").map((s) => s.trim());
                      return (
                        <li key={p.key}>
                          <Link href={placeHref(p.name, p.lat, p.lng)} className="block h-full overflow-hidden rounded-[20px] border border-mt-line bg-white text-mt-ink hover:border-mt-line-strong">
                            <span className="relative flex h-[140px] items-center justify-center" style={{ background: g.soft, color: g.color }}>
                              {p.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.photo_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                              ) : (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  {g.paths.map((d) => (
                                    <path key={d} d={d} />
                                  ))}
                                </svg>
                              )}
                            </span>
                            <span className="block p-4">
                              <span className="block truncate text-[15px] font-extrabold">{title}</span>
                              <span className="mt-0.5 block truncate text-xs text-mt-muted">{[p.category ? CATEGORY_LABEL[p.category] : null, rest[rest.length - 1]].filter(Boolean).join(" · ")}</span>
                              <span className="mt-2 flex items-center gap-2 text-xs">
                                {p.rating > 0 && (
                                  <strong className="text-[#9A4508]">
                                    <span aria-hidden="true">★ </span>
                                    <span className="sr-only">Nota </span>
                                    {formatRatingBR(p.rating)}
                                  </strong>
                                )}
                                <span className="text-mt-muted">
                                  {p.visits} {p.visits === 1 ? "visita" : "visitas"} · {p.explorers} {p.explorers === 1 ? "pessoa" : "pessoas"}
                                </span>
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </main>

              <aside className="flex min-w-[300px] flex-[1_1_360px] flex-col gap-4">
                {center ? (
                  <TripMap points={points} center={center} height={380} label={`Mapa de ${cityName} com ${points.length} lugares`} />
                ) : (
                  <div className="flex h-[380px] items-center justify-center rounded-[20px] bg-mt-land">
                    {!error && <Loader2 className="animate-spin text-mt-muted" aria-label="Localizando cidade" />}
                  </div>
                )}
                <section aria-labelledby="ja-foram" className="rounded-[20px] border border-mt-line bg-white p-4">
                  <h2 id="ja-foram" className="mb-1 text-[17px] font-extrabold">
                    Quem você segue e já foi
                  </h2>
                  {!data ? (
                    <p className="text-sm text-mt-muted">Carregando…</p>
                  ) : data.friends.length === 0 ? (
                    <p className="text-sm text-mt-muted">Ninguém que você segue registrou visitas aqui ainda.</p>
                  ) : (
                    <ul>
                      {data.friends.map((f) => {
                        const name = f.user.display_name || f.user.username;
                        return (
                          <li key={f.user.id} className="flex items-center gap-3 border-b border-mt-line py-2 last:border-b-0">
                            <PersonAvatar name={name} src={f.user.avatar_url} size={40} />
                            <span className="min-w-0 flex-1">
                              <Link href={`/profile/${f.user.username}`} className="block truncate text-sm font-bold text-mt-ink hover:underline">
                                {name}
                              </Link>
                              <span className="block truncate text-xs text-mt-muted">
                                {f.visits} {f.visits === 1 ? "visita" : "visitas"} · última: {f.last_place.split(",")[0]}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
                {data?.truncated && <p className="text-xs text-mt-muted">Mostrando as visitas mais recentes deste destino.</p>}
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
