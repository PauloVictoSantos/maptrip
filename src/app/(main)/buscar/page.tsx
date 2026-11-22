"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Crosshair, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { CATEGORY_GROUPS, GROUP_ORDER, formatRatingBR, groupFor, type CategoryGroup } from "@/components/map/categories";
import {
  EMPTY_FILTERS,
  PREFERENCES,
  PRICES,
  PRICE_LABELS,
  RATING_OPTIONS,
  SORTS,
  filtersToParams,
  paramsToFilters,
  parseQuery,
  type BBox,
  type PrefId,
  type SearchFilters,
  type SearchResponse,
  type SearchResult,
  type SortId,
} from "@/lib/search";
import { placeHref } from "@/lib/place";

const SearchMap = dynamic(() => import("@/components/search/SearchMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-mt-land motion-reduce:animate-none" />,
});

type Geocoded = { lat: number; lng: number; label: string };

async function geocode(text: string): Promise<Geocoded | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(text)}`,
    { headers: { "Accept-Language": "pt-BR" } }
  );
  const list = await res.json();
  if (!Array.isArray(list) || list.length === 0) return null;
  const label = String(list[0].display_name ?? text).split(", ").slice(0, 2).join(", ");
  return { lat: parseFloat(list[0].lat), lng: parseFloat(list[0].lon), label };
}

function formatKm(km: number) {
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function SearchPage() {
  const { profile, loading: authLoading } = useAuthContext();

  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [placeInput, setPlaceInput] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState("");

  const [results, setResults] = useState<SearchResult[]>([]);
  const [meta, setMeta] = useState<Omit<SearchResponse, "results"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const askedCity = useRef(false);

  const patch = useCallback((p: Partial<SearchFilters>) => setFilters((f) => ({ ...f, ...p })), []);

  // ---- Initial state from the URL ------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const f = paramsToFilters(params);
    setFilters(f);
    setInput(params.get("texto") ?? f.q);
    setPlaceInput(f.place);
    if (f.lat != null || f.bbox) askedCity.current = true;
    setReady(true);
  }, []);

  // Default location: the user's city from the profile
  useEffect(() => {
    if (!ready || authLoading || askedCity.current) return;
    askedCity.current = true;
    const city = profile?.city;
    if (!city) return;
    setPlaceInput(city);
    geocode(city)
      .then((g) => g && patch({ lat: g.lat, lng: g.lng, place: city, bbox: null }))
      .catch(() => undefined);
  }, [ready, authLoading, profile?.city, patch]);

  // ---- Fetch ------------------------------------------------------------------
  useEffect(() => {
    if (!ready) return;
    const ctrl = new AbortController();
    const params = filtersToParams(filters, input.trim() ? { texto: input.trim() } : {});
    window.history.replaceState(null, "", `/buscar${params.size ? `?${params}` : ""}`);

    const t = window.setTimeout(() => {
      setLoading(true);
      setError("");
      fetch(`/api/search?${filtersToParams(filters)}`, { signal: ctrl.signal })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Erro ao buscar.");
          const { results: list, ...rest } = data as SearchResponse;
          setResults(list);
          setMeta(rest);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setError(err?.message || "Erro de conexão.");
          setResults([]);
          setMeta(null);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
    // `input` is only mirrored to the URL; searching happens on submit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, ready]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/search?${filtersToParams(filters, { offset: String(results.length) })}`);
      const data = (await res.json()) as SearchResponse;
      if (res.ok) {
        setResults((r) => [...r, ...data.results]);
        setMeta({ total: data.total, hasMore: data.hasMore, answersAvailable: data.answersAvailable, capped: data.capped });
      }
    } finally {
      setLoadingMore(false);
    }
  }

  // ---- Actions --------------------------------------------------------------
  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseQuery(input);
    setFilters((f) => ({
      ...f,
      q: parsed.q,
      groups: [...new Set([...f.groups, ...parsed.groups])],
      prefs: [...new Set([...f.prefs, ...parsed.prefs])],
    }));
  }

  async function submitPlace() {
    const text = placeInput.trim();
    if (!text) {
      patch({ lat: null, lng: null, place: "", bbox: null });
      return;
    }
    setGeoBusy(true);
    setGeoError("");
    try {
      const g = await geocode(text);
      if (!g) setGeoError("Não encontramos esse lugar.");
      else patch({ lat: g.lat, lng: g.lng, place: text, bbox: null });
    } catch {
      setGeoError("Não foi possível buscar o endereço.");
    } finally {
      setGeoBusy(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setGeoError("Seu navegador não permite obter a localização.");
    setGeoBusy(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        setPlaceInput("Sua localização");
        patch({ lat: pos.coords.latitude, lng: pos.coords.longitude, place: "Sua localização", bbox: null });
      },
      () => {
        setGeoBusy(false);
        setGeoError("Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function clearAll() {
    setInput("");
    setFilters((f) => ({ ...EMPTY_FILTERS, lat: f.lat, lng: f.lng, place: f.place, radiusKm: f.radiusKm }));
  }

  const toggleGroup = (g: CategoryGroup) =>
    setFilters((f) => ({ ...f, groups: f.groups.includes(g) ? f.groups.filter((x) => x !== g) : [...f.groups, g] }));
  const togglePref = (p: PrefId) =>
    setFilters((f) => ({ ...f, prefs: f.prefs.includes(p) ? f.prefs.filter((x) => x !== p) : [...f.prefs, p] }));

  function focusResult(id: string) {
    setHighlightedId(id);
    const index = results.findIndex((r) => r.id === id);
    document.getElementById(`resultado-${index}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // ---- Derived --------------------------------------------------------------
  const activeChips: { key: string; label: string; aria: string; remove: () => void }[] = [
    ...(filters.q
      ? [{ key: "q", label: `“${filters.q}”`, aria: `Remover busca ${filters.q}`, remove: () => { patch({ q: "" }); setInput(""); } }]
      : []),
    ...filters.groups.map((g) => ({
      key: `g-${g}`,
      label: CATEGORY_GROUPS[g].label,
      aria: `Remover filtro ${CATEGORY_GROUPS[g].label}`,
      remove: () => toggleGroup(g),
    })),
    ...filters.prefs.map((p) => {
      const label = PREFERENCES.find((x) => x.id === p)!.label;
      return { key: `p-${p}`, label, aria: `Remover filtro ${label}`, remove: () => togglePref(p) };
    }),
    ...(filters.price
      ? [{ key: "price", label: filters.price, aria: `Remover filtro preço ${PRICE_LABELS[filters.price]}`, remove: () => patch({ price: null }) }]
      : []),
    ...(filters.noFee
      ? [{ key: "fee", label: "Sem taxa de entrada", aria: "Remover filtro sem taxa de entrada", remove: () => patch({ noFee: false }) }]
      : []),
    ...(filters.minRating
      ? [{
          key: "rating",
          label: `Nota ${formatRatingBR(filters.minRating).replace(",0", "")}+`,
          aria: `Remover filtro nota ${filters.minRating} ou mais`,
          remove: () => patch({ minRating: 0 }),
        }]
      : []),
  ];

  const total = meta?.total ?? 0;
  const where = filters.bbox
    ? " na área do mapa"
    : filters.lat != null && filters.place
    ? ` em ${filters.place} · até ${filters.radiusKm} km`
    : "";
  const needsAnswers = filters.prefs.length > 0 || !!filters.price || filters.noFee;
  const center = filters.lat != null && filters.lng != null ? { lat: filters.lat, lng: filters.lng, radiusKm: filters.radiusKm } : null;

  const panelProps: FiltersPanelProps = {
    filters,
    patch,
    toggleGroup,
    togglePref,
    placeInput,
    setPlaceInput,
    submitPlace,
    useMyLocation,
    geoBusy,
    geoError,
    clearAll,
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] bg-mt-bg text-mt-ink">
      {/* ---------------- Filters (desktop) ---------------- */}
      <aside
        aria-label="Filtros"
        className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-[300px] shrink-0 overflow-y-auto border-r border-mt-line bg-white p-5 lg:block"
      >
        <FiltersPanel {...panelProps} />
      </aside>

      {/* ---------------- Results ---------------- */}
      <main className="min-w-0 flex-1 px-4 py-5 md:px-6">
        <form role="search" onSubmit={submitSearch} className="flex gap-2">
          <div className="relative flex-1">
            <label htmlFor="busca" className="sr-only">
              Buscar lugares
            </label>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              id="busca"
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex.: restaurante vegetariano, praia, museu"
              className="h-11 w-full rounded-full border-2 border-mt-line-strong bg-white pl-11 pr-4 text-sm font-medium focus:border-mt-teal focus:outline-none"
            />
          </div>
          <button type="submit" className="h-11 rounded-full bg-mt-teal px-5 text-sm font-bold text-white hover:bg-mt-teal-dark">
            Buscar
          </button>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-mt-line-strong bg-white px-4 text-sm font-bold lg:hidden"
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filtros
            {activeChips.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-mt-teal px-1 text-[11px] text-white">
                {activeChips.length}
              </span>
            )}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <h1 className="text-2xl font-extrabold tracking-[-0.4px]">
              {input.trim() ? capitalize(input.trim()) : "Explorar lugares"}
            </h1>
            <p className="mt-1 text-sm text-mt-muted" aria-live="polite">
              {loading ? "Buscando…" : `${total} ${total === 1 ? "lugar" : "lugares"}${where}`}
            </p>
          </div>
          <label htmlFor="ordenar" className="text-[13px] font-semibold text-mt-ink-2">
            Ordenar por
          </label>
          <select
            id="ordenar"
            value={filters.sort}
            onChange={(e) => patch({ sort: e.target.value as SortId })}
            className="h-10 rounded-[10px] border-[1.5px] border-mt-line-strong bg-white px-2.5 text-sm font-semibold"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value} disabled={s.value === "distance" && filters.lat == null}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {activeChips.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {activeChips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.remove}
                aria-label={c.aria}
                className="flex h-8 items-center gap-1.5 rounded-full bg-mt-ink pl-3 pr-2.5 text-xs font-bold text-white hover:bg-black"
              >
                {c.label}
                <X size={13} strokeWidth={2.6} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}

        {meta && !meta.answersAvailable && needsAnswers && (
          <p role="status" className="mt-4 rounded-xl bg-[#FDF0E3] px-4 py-3 text-sm font-semibold text-[#9A4508]">
            Não foi possível ler as respostas do questionário, então preferências e preço não podem ser filtrados agora.
          </p>
        )}

        {error ? (
          <p role="alert" className="mt-6 rounded-xl bg-[#FFF0F0] px-4 py-3 text-sm font-semibold text-[#B42323]">
            {error}
          </p>
        ) : loading ? (
          <ResultsSkeleton />
        ) : results.length === 0 ? (
          <div className="mt-10 rounded-[18px] border border-dashed border-mt-line-strong bg-white px-6 py-10 text-center">
            <p className="text-base font-extrabold">Nenhum lugar encontrado</p>
            <p className="mt-1 text-sm text-mt-muted">
              Tente remover filtros{filters.lat != null && !filters.bbox ? " ou aumentar o raio" : ""}.
            </p>
            {activeChips.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="mt-4 h-10 rounded-full border-[1.5px] border-mt-teal px-5 text-sm font-bold text-mt-teal-dark hover:bg-mt-teal-soft"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <ol className="mt-4 flex flex-col gap-2.5">
              {results.map((r, i) => (
                <li key={r.id} id={`resultado-${i}`}>
                  <ResultCard
                    result={r}
                    rank={i + 1}
                    highlighted={r.id === highlightedId}
                    onHighlight={() => setHighlightedId(r.id)}
                  />
                </li>
              ))}
            </ol>
            {meta?.hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-mt-line-strong bg-white px-6 text-sm font-bold hover:bg-mt-chip disabled:opacity-60"
                >
                  {loadingMore && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                  Carregar mais {Math.min(20, total - results.length)}
                </button>
              </div>
            )}
            {meta?.capped && (
              <p className="mt-4 text-center text-xs text-mt-muted">
                A busca considera as 1.000 visitas mais recentes da área. Aproxime o mapa para refinar.
              </p>
            )}
          </>
        )}
      </main>

      {/* ---------------- Map (wide screens) ---------------- */}
      <section
        aria-label="Resultados no mapa"
        className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-[380px] shrink-0 border-l border-mt-line xl:block 2xl:w-[460px]"
      >
        <SearchMap
          results={results}
          highlightedId={highlightedId}
          onPinClick={focusResult}
          center={center}
          followMap={!!filters.bbox}
          autoUpdate={autoUpdate}
          onAutoUpdateChange={(v) => {
            setAutoUpdate(v);
            if (!v && filters.bbox) patch({ bbox: null });
          }}
          onUserMove={(bbox: BBox) => patch({ bbox })}
        />
      </section>

      {/* ---------------- Filters sheet (mobile) ---------------- */}
      {filtersOpen && (
        <div role="dialog" aria-modal="true" aria-label="Filtros" className="fixed inset-0 z-[70] flex flex-col bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-mt-line px-4 py-3">
            <span className="text-base font-extrabold">Filtros</span>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label="Fechar filtros"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-mt-chip"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <FiltersPanel {...panelProps} hideTitle />
          </div>
          <div className="border-t border-mt-line p-4">
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="h-12 w-full rounded-full bg-mt-teal text-[15px] font-bold text-white"
            >
              {loading ? "Buscando…" : `Ver ${total} ${total === 1 ? "lugar" : "lugares"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type FiltersPanelProps = {
  filters: SearchFilters;
  patch: (p: Partial<SearchFilters>) => void;
  toggleGroup: (g: CategoryGroup) => void;
  togglePref: (p: PrefId) => void;
  placeInput: string;
  setPlaceInput: (v: string) => void;
  submitPlace: () => void;
  useMyLocation: () => void;
  geoBusy: boolean;
  geoError: string;
  clearAll: () => void;
  hideTitle?: boolean;
};

function FiltersPanel({
  filters,
  patch,
  toggleGroup,
  togglePref,
  placeInput,
  setPlaceInput,
  submitPlace,
  useMyLocation,
  geoBusy,
  geoError,
  clearAll,
  hideTitle,
}: FiltersPanelProps) {
  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        {!hideTitle && <h2 className="text-lg font-extrabold">Filtros</h2>}
        <button type="button" onClick={clearAll} className="ml-auto h-9 px-2 text-[13px] font-bold text-mt-teal-dark hover:underline">
          Limpar tudo
        </button>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-extrabold">Localização</legend>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitPlace();
          }}
          className="flex gap-1.5"
        >
          <input
            type="text"
            aria-label="Cidade ou endereço"
            value={placeInput}
            onChange={(e) => setPlaceInput(e.target.value)}
            placeholder="Cidade ou endereço"
            className="h-10 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-mt-line-strong px-3 text-sm focus:border-mt-teal focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Buscar localização"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-mt-chip hover:bg-mt-line"
          >
            {geoBusy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </form>
        <button
          type="button"
          onClick={useMyLocation}
          className="flex h-8 items-center gap-1.5 self-start text-[13px] font-bold text-mt-teal-dark hover:underline"
        >
          <Crosshair size={14} strokeWidth={2.2} aria-hidden="true" />
          Usar minha localização
        </button>
        {geoError && <p className="text-xs font-semibold text-[#B42323]">{geoError}</p>}
        {filters.lat != null && (
          <>
            <label htmlFor="raio" className="flex justify-between text-[13px] font-semibold text-mt-ink-2">
              <span>Raio</span>
              <strong className="text-mt-ink">{filters.bbox ? "Área do mapa" : formatKm(filters.radiusKm)}</strong>
            </label>
            <input
              id="raio"
              type="range"
              min={1}
              max={50}
              value={filters.radiusKm}
              onChange={(e) => patch({ radiusKm: Number(e.target.value), bbox: null })}
              className="w-full accent-mt-teal"
            />
          </>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[13px] font-extrabold">Tipo de lugar</legend>
        <div className="flex flex-wrap gap-1.5">
          {GROUP_ORDER.map((g) => {
            const active = filters.groups.includes(g);
            return (
              <button
                key={g}
                type="button"
                aria-pressed={active}
                onClick={() => toggleGroup(g)}
                className={`h-8 rounded-full border px-2.5 text-xs transition-colors ${
                  active
                    ? "border-mt-teal bg-mt-teal-soft font-bold text-mt-teal-dark"
                    : "border-mt-line-strong bg-white font-semibold hover:bg-mt-chip"
                }`}
              >
                {CATEGORY_GROUPS[g].label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-2 text-[13px] font-extrabold">Preferências</legend>
        {PREFERENCES.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-2.5 py-0.5 text-sm font-semibold">
            <input
              type="checkbox"
              checked={filters.prefs.includes(p.id)}
              onChange={() => togglePref(p.id)}
              className="h-[18px] w-[18px] accent-mt-teal"
            />
            {p.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[13px] font-extrabold">Preço e taxas</legend>
        <Segmented
          label="Faixa de preço"
          options={PRICES.map((p) => ({ value: p, label: p, aria: `Preço ${PRICE_LABELS[p]}` }))}
          value={filters.price}
          onChange={(v) => patch({ price: v === filters.price ? null : v })}
        />
        <label className="mt-2 flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
          <input
            type="checkbox"
            checked={filters.noFee}
            onChange={(e) => patch({ noFee: e.target.checked })}
            className="h-[18px] w-[18px] accent-mt-teal"
          />
          Sem taxa de entrada
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[13px] font-extrabold">Qualidade</legend>
        <Segmented
          label="Nota mínima"
          options={RATING_OPTIONS.map((r) => ({
            value: String(r.value),
            label: r.label,
            aria: r.value ? `Nota ${r.label.replace("+", "")} ou mais` : "Qualquer nota",
          }))}
          value={String(filters.minRating)}
          onChange={(v) => patch({ minRating: Number(v) })}
        />
      </fieldset>
    </div>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string; aria?: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-[10px] bg-mt-chip p-[3px]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            aria-label={o.aria}
            onClick={() => onChange(o.value)}
            className={`h-8 flex-1 rounded-lg text-xs transition-colors ${
              active ? "bg-white font-extrabold text-mt-ink shadow-[0_1px_3px_rgba(20,32,43,0.12)]" : "font-bold text-mt-ink-2 hover:bg-white/60"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ResultCard({
  result: r,
  rank,
  highlighted,
  onHighlight,
}: {
  result: SearchResult;
  rank: number;
  highlighted: boolean;
  onHighlight: () => void;
}) {
  const key = groupFor(r.category);
  const g = CATEGORY_GROUPS[key];
  const tags: { label: string; green?: boolean }[] = [];
  if (r.flags.vegetariano) tags.push({ label: "Vegetariano", green: true });
  if (r.flags.acessivel) tags.push({ label: "Acessível" });
  if (r.flags.pet) tags.push({ label: "Pet-friendly" });
  if (r.flags.noFee) tags.push({ label: "Sem taxa de entrada" });

  return (
    <Link
      href={placeHref(r.place_name, r.lat, r.lng)}
      onMouseEnter={onHighlight}
      onFocus={onHighlight}
      className={`flex flex-wrap gap-4 rounded-[18px] bg-white p-3.5 text-mt-ink transition-colors ${
        highlighted ? "border-2 border-mt-teal" : "border border-mt-line hover:border-mt-line-strong"
      }`}
    >
      <span
        className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-[14px] sm:w-[132px]"
        style={{ background: g.soft, color: g.color }}
      >
        {r.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {g.paths.map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
        )}
        <span
          className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold text-white"
          style={{ background: highlighted ? "#14202B" : g.color }}
        >
          {rank}
        </span>
      </span>
      <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-[5px]">
        <span className="text-[17px] font-extrabold">{r.place_name}</span>
        <span className="text-[13px] text-mt-muted">
          {r.rating > 0 && (
            <>
              <strong className="font-extrabold text-mt-ink">★ {formatRatingBR(r.rating)}</strong>{" "}
            </>
          )}
          ({r.visits} {r.visits === 1 ? "visita" : "visitas"}) · {g.label}
          {r.price && ` · ${r.price}`}
          {r.distance_km != null && ` · ${formatKm(r.distance_km)}`}
        </span>
        {tags.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t.label}
                className={`inline-flex h-[22px] items-center rounded-md px-[7px] text-[11px] font-bold ${
                  t.green ? "bg-[#E6F4EA] text-[#1E6B30]" : "bg-mt-chip text-mt-ink-2"
                }`}
              >
                {t.label}
              </span>
            ))}
          </span>
        )}
        {r.tip && <span className="text-[13px] text-mt-ink-2">“{r.tip}”</span>}
      </span>
    </Link>
  );
}

function ResultsSkeleton() {
  return (
    <ul aria-hidden="true" className="mt-4 flex flex-col gap-2.5">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex gap-4 rounded-[18px] border border-mt-line bg-white p-3.5">
          <span className="hidden h-28 w-[132px] animate-pulse rounded-[14px] bg-mt-chip motion-reduce:animate-none sm:block" />
          <span className="flex-1 space-y-2.5 py-1">
            <span className="block h-4 w-1/2 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
            <span className="block h-3 w-2/3 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
            <span className="block h-3 w-1/3 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
          </span>
        </li>
      ))}
    </ul>
  );
}
