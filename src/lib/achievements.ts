// Achievements derived from a user's visits (pure; no extra storage).
// Used by /conquistas and the profile page so both always agree.

import {
  Accessibility,
  BadgeCheck,
  BedDouble,
  Camera,
  Compass,
  Landmark,
  Map as MapIcon,
  MapPin,
  Route,
  Trees,
  Trophy,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { groupFor } from "@/components/map/categories";
import { profileLevelFor } from "@/lib/points";
import { normalize } from "@/lib/search";
import type { ProfileVisit } from "@/app/api/users/[username]/visits/route";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export const RARITY: Record<Rarity, { label: string; ring: string; bg: string; fg: string }> = {
  common: { label: "Comum", ring: "#737D76", bg: "#EFF1EE", fg: "#3A423D" },
  rare: { label: "Raro", ring: "#16845A", bg: "#EEF7F1", fg: "#126E4B" },
  epic: { label: "Épico", ring: "#123D2C", bg: "#D6EEDD", fg: "#123D2C" },
  legendary: { label: "Lendário", ring: "#C8A85C", bg: "#F5EEDB", fg: "#7A5F1C" },
};

export const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary"];

type BadgeDef = {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  icon: LucideIcon;
  goal: number;
  /** Counts matching visits… */
  test?: (v: ProfileVisit) => boolean;
  /** …or distinct non-null keys. */
  key?: (v: ProfileVisit) => string | null;
};

export function placeKey(v: Pick<ProfileVisit, "place_name" | "lat" | "lng">) {
  return `${normalize(v.place_name)}|${v.lat.toFixed(3)},${v.lng.toFixed(3)}`;
}

/** Neighborhood from an address-like place name ("Café, Rua X, Centro" → "Centro"). */
export function neighborhoodOf(placeName: string): string | null {
  const parts = placeName.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  const last = parts[parts.length - 1];
  return /\d{5}|^brasil$/i.test(last) || last.length > 40 ? null : last;
}

const BADGES: BadgeDef[] = [
  { id: "primeira", name: "Primeira visita", description: "Registre sua primeira visita.", rarity: "common", icon: MapPin, goal: 1, test: () => true },
  { id: "hospede", name: "Hóspede", description: "Registre 2 hospedagens.", rarity: "common", icon: BedDouble, goal: 2, test: (v) => v.category === "hotel" },
  { id: "cultura", name: "Cultura em dia", description: "Visite 3 museus ou monumentos.", rarity: "rare", icon: Landmark, goal: 3, test: (v) => groupFor(v.category) === "atracao" },
  { id: "natureza", name: "Amigo da natureza", description: "Visite 3 parques, trilhas ou praias.", rarity: "rare", icon: Trees, goal: 3, test: (v) => groupFor(v.category) === "natureza" },
  { id: "garfo", name: "Bom de garfo", description: "Registre 5 restaurantes, bares ou cafés.", rarity: "rare", icon: Utensils, goal: 5, test: (v) => groupFor(v.category) === "restaurante" },
  { id: "foto", name: "Fotógrafo de viagem", description: "Publique 5 visitas com fotos.", rarity: "rare", icon: Camera, goal: 5, test: (v) => v.photos.length > 0 },
  { id: "explorador", name: "Explorador assíduo", description: "Conheça 10 lugares diferentes.", rarity: "rare", icon: MapIcon, goal: 10, key: placeKey },
  { id: "acess", name: "Mapeia acessibilidade", description: "Responda sobre acessibilidade em 3 visitas.", rarity: "epic", icon: Accessibility, goal: 3, test: (v) => v.answered.includes("acessibilidade") },
  { id: "completo", name: "Registro completo", description: "Faça 5 registros de nível Completo ou melhor.", rarity: "epic", icon: BadgeCheck, goal: 5, test: (v) => v.points >= 40 },
  { id: "bairros", name: "Desbravador de bairros", description: "Visite lugares em 5 bairros diferentes.", rarity: "epic", icon: Route, goal: 5, key: (v) => (neighborhoodOf(v.place_name) ? normalize(neighborhoodOf(v.place_name)!) : null) },
  { id: "cinquenta", name: "Cinquenta visitas", description: "Registre 50 visitas.", rarity: "legendary", icon: Trophy, goal: 50, test: () => true },
  { id: "guia", name: "Guia da cidade", description: "Conheça 30 lugares diferentes.", rarity: "legendary", icon: Compass, goal: 30, key: placeKey },
];

export type BadgeState = Omit<BadgeDef, "test" | "key"> & { progress: number; unlocked: boolean; unlockedAt: string | null };

function visitDate(v: ProfileVisit): Date {
  return v.visit_date ? new Date(`${v.visit_date}T12:00:00`) : new Date(v.created_at);
}

function weekStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x.getTime();
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function computeAchievements(visits: ProfileVisit[], now = new Date()) {
  const asc = [...visits].sort((a, b) => visitDate(a).getTime() - visitDate(b).getTime());

  const badges: BadgeState[] = BADGES.map(({ test, key, ...def }) => {
    let progress = 0;
    let unlockedAt: string | null = null;
    const seen = new Set<string>();
    for (const v of asc) {
      if (key) {
        const k = key(v);
        if (!k || seen.has(k)) continue;
        seen.add(k);
      } else if (!test!(v)) continue;
      progress++;
      if (progress === def.goal) unlockedAt = visitDate(v).toISOString();
    }
    return { ...def, progress: Math.min(progress, def.goal), unlocked: progress >= def.goal, unlockedAt };
  });

  const xp = visits.reduce((s, v) => s + v.points, 0);
  const places = new Set(visits.map(placeKey));
  const groupCount = (g: string) => visits.filter((v) => groupFor(v.category) === g).length;

  // Neighborhood "stamps": first visit in each one.
  const stampMap = new Map<string, { label: string; date: string; visits: number }>();
  for (const v of asc) {
    const n = neighborhoodOf(v.place_name);
    if (!n) continue;
    const k = normalize(n);
    const s = stampMap.get(k) ?? { label: n, date: visitDate(v).toISOString(), visits: 0 };
    s.visits++;
    stampMap.set(k, s);
  }
  const stamps = [...stampMap.values()].sort((a, b) => b.date.localeCompare(a.date));

  // Weekly activity (last 12 weeks, oldest → newest) and current streak.
  const thisWeek = weekStart(now);
  const weeks = Array.from({ length: 12 }, () => 0);
  const activeWeeks = new Set<number>();
  for (const v of visits) {
    const w = weekStart(visitDate(v));
    activeWeeks.add(w);
    const idx = 11 - Math.round((thisWeek - w) / WEEK_MS);
    if (idx >= 0 && idx < 12) weeks[idx]++;
  }
  let streak = 0;
  // A streak stays alive during the current week even before its first visit.
  let cursor = activeWeeks.has(thisWeek) ? thisWeek : thisWeek - WEEK_MS;
  while (activeWeeks.has(cursor)) {
    streak++;
    cursor -= WEEK_MS;
  }

  const history = [...visits]
    .sort((a, b) => visitDate(b).getTime() - visitDate(a).getTime())
    .slice(0, 8)
    .map((v) => {
      const extras = [v.photos.length ? "com fotos" : null, v.answered.length ? `${v.answered.length} respostas` : null].filter(Boolean);
      return {
        id: v.id,
        reason: `Visita registrada · ${v.place_name.split(",")[0]}${extras.length ? ` (${extras.join(", ")})` : ""}`,
        date: visitDate(v).toISOString(),
        xp: v.points,
      };
    });

  const unlocked = badges.filter((b) => b.unlocked);
  const latest = [...unlocked].sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))[0] ?? null;
  const next =
    badges
      .filter((b) => !b.unlocked)
      .sort((a, b) => b.progress / b.goal - a.progress / a.goal || RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity))[0] ?? null;

  return {
    xp,
    level: profileLevelFor(xp),
    passport: {
      visits: visits.length,
      places: places.size,
      neighborhoods: stamps.length,
      culture: groupCount("atracao"),
      nature: groupCount("natureza"),
      food: groupCount("restaurante"),
    },
    stamps,
    weeks,
    streak,
    visitedThisWeek: activeWeeks.has(thisWeek),
    badges,
    latest,
    next,
    history,
  };
}

export type Achievements = ReturnType<typeof computeAchievements>;
