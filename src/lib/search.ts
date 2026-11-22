// Shared search definitions: used by /api/search (server) and /buscar (client).
import { CATEGORY_GROUPS, GROUP_ORDER, type CategoryGroup } from "@/components/map/categories";

export const PREFERENCES = [
  { id: "acessivel", label: "Acessível para cadeirantes", short: "Acessível", key: "acessibilidade" },
  { id: "vegetariano", label: "Vegetariano ou vegano", short: "Vegetariano", key: "tem_opcao_vegetariana" },
  { id: "pet", label: "Pet-friendly", short: "Pet-friendly", key: "aceita_pet" },
] as const;
export type PrefId = (typeof PREFERENCES)[number]["id"];

export const PRICES = ["$", "$$", "$$$", "$$$$"] as const;
export const PRICE_LABELS: Record<string, string> = {
  $: "econômico",
  $$: "moderado",
  $$$: "caro",
  $$$$: "muito caro",
};

export const RATING_OPTIONS = [
  { value: 0, label: "Qualquer" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" },
  { value: 4.5, label: "4,5+" },
];

export const SORTS = [
  { value: "relevance", label: "Relevância" },
  { value: "rating", label: "Melhor nota" },
  { value: "distance", label: "Mais próximo" },
  { value: "recent", label: "Mais recente" },
] as const;
export type SortId = (typeof SORTS)[number]["value"];

/** Questionnaire keys the search reads (see lib/questions.ts). */
export const ANSWER_KEYS = [...PREFERENCES.map((p) => p.key), "faixa_preco", "cobra_entrada"];

export const PAGE_SIZE = 20;
export const DEFAULT_RADIUS_KM = 10;

export type BBox = [south: number, west: number, north: number, east: number];

export type SearchFilters = {
  q: string;
  groups: CategoryGroup[];
  prefs: PrefId[];
  price: string | null;
  noFee: boolean;
  minRating: number;
  sort: SortId;
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  bbox: BBox | null; // "update when moving the map" replaces the radius
  place: string; // human label of the location
};

export const EMPTY_FILTERS: SearchFilters = {
  q: "",
  groups: [],
  prefs: [],
  price: null,
  noFee: false,
  minRating: 0,
  sort: "relevance",
  lat: null,
  lng: null,
  radiusKm: DEFAULT_RADIUS_KM,
  bbox: null,
  place: "",
};

export type SearchResult = {
  id: string; // aggregate key
  post_id: string; // most recent visit, used for the link
  place_name: string;
  category: string | null;
  lat: number;
  lng: number;
  rating: number;
  visits: number;
  price: string | null;
  flags: Record<PrefId | "noFee", boolean | null>;
  tip: string | null;
  thumbnail_url: string | null;
  latest_at: string;
  distance_km: number | null;
};

export type SearchResponse = {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  answersAvailable: boolean;
  capped: boolean;
};

// ---------------------------------------------------------------------------

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function radiusBox(lat: number, lng: number, km: number): BBox {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}

// Words in the search box that become filters ("restaurante vegetariano").
const GROUP_WORDS: Record<string, CategoryGroup> = {};
for (const g of GROUP_ORDER) {
  if (g === "outro") continue;
  const word = normalize(CATEGORY_GROUPS[g].label);
  GROUP_WORDS[word] = g;
  GROUP_WORDS[`${word}s`] = g;
  GROUP_WORDS[word.replace(/ao$/, "oes")] = g; // atração → atrações
}
const PREF_WORDS: Record<string, PrefId> = {
  vegetariano: "vegetariano",
  vegetariana: "vegetariano",
  vegetarianos: "vegetariano",
  vegano: "vegetariano",
  vegana: "vegetariano",
  veganos: "vegetariano",
  acessivel: "acessivel",
  acessiveis: "acessivel",
  pet: "pet",
  pets: "pet",
  "pet-friendly": "pet",
};

/** Splits free text into recognized filters and the remaining search text. */
export function parseQuery(text: string): { q: string; groups: CategoryGroup[]; prefs: PrefId[] } {
  const groups = new Set<CategoryGroup>();
  const prefs = new Set<PrefId>();
  const rest: string[] = [];
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const word = normalize(raw);
    if (GROUP_WORDS[word]) groups.add(GROUP_WORDS[word]);
    else if (PREF_WORDS[word]) prefs.add(PREF_WORDS[word]);
    else rest.push(raw);
  }
  return { q: rest.join(" "), groups: [...groups], prefs: [...prefs] };
}

// ---- URL (de)serialization --------------------------------------------------

export function filtersToParams(f: SearchFilters, extra: Record<string, string> = {}): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.groups.length) p.set("tipo", f.groups.join(","));
  if (f.prefs.length) p.set("pref", f.prefs.join(","));
  if (f.price) p.set("preco", f.price);
  if (f.noFee) p.set("semTaxa", "1");
  if (f.minRating) p.set("nota", String(f.minRating));
  if (f.sort !== "relevance") p.set("ordem", f.sort);
  if (f.lat != null && f.lng != null) {
    p.set("lat", f.lat.toFixed(5));
    p.set("lng", f.lng.toFixed(5));
    p.set("raio", String(f.radiusKm));
  }
  if (f.bbox) p.set("area", f.bbox.map((n) => n.toFixed(5)).join(","));
  if (f.place) p.set("local", f.place);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p;
}

export function paramsToFilters(p: URLSearchParams): SearchFilters {
  const num = (key: string) => {
    const v = parseFloat(p.get(key) ?? "");
    return Number.isFinite(v) ? v : null;
  };
  const list = (key: string) => (p.get(key) ?? "").split(",").filter(Boolean);

  const groups = list("tipo").filter((g): g is CategoryGroup => g in CATEGORY_GROUPS);
  const prefs = list("pref").filter((x): x is PrefId => PREFERENCES.some((pr) => pr.id === x));
  const price = PRICES.includes(p.get("preco") as (typeof PRICES)[number]) ? p.get("preco") : null;
  const minRating = RATING_OPTIONS.some((r) => r.value === num("nota")) ? (num("nota") as number) : 0;
  const sortParam = p.get("ordem");
  const sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as SortId) : "relevance";
  const area = list("area").map(Number);
  const bbox = area.length === 4 && area.every(Number.isFinite) ? (area as BBox) : null;
  const radius = num("raio");

  return {
    q: (p.get("q") ?? "").slice(0, 120),
    groups,
    prefs,
    price,
    noFee: p.get("semTaxa") === "1",
    minRating,
    sort,
    lat: num("lat"),
    lng: num("lng"),
    radiusKm: radius && radius >= 1 && radius <= 50 ? radius : DEFAULT_RADIUS_KM,
    bbox,
    place: (p.get("local") ?? "").slice(0, 120),
  };
}
