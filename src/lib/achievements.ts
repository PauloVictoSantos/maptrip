// Achievements derived from a user's visits (pure; no extra storage).
// Each achievement has three tiers — comum, raro, épico — with growing goals and the
// same symbol (see scripts/achievement-icons.mjs). Used by /conquistas and the profile.

import { groupFor } from "@/components/map/categories";
import { profileLevelFor } from "@/lib/points";
import { normalize } from "@/lib/search";
import type { AchievementIconId } from "@/components/achievements/achievementIcons";
import type { ProfileVisit } from "@/app/api/users/[username]/visits/route";

export type Tier = "comum" | "raro" | "epico";
export const TIER_ORDER: Tier[] = ["comum", "raro", "epico"];

/** Badge colors per tier (line = ink, highlight = accent); same as the icon preview. */
export const TIER_STYLE: Record<Tier, { label: string; bg: string; ink: string; accent: string; ring: string }> = {
  comum: { label: "Comum", bg: "#EFF1EE", ink: "#3A423D", accent: "#737D76", ring: "#C9CFCA" },
  raro: { label: "Raro", bg: "#EEF7F1", ink: "#126E4B", accent: "#16845A", ring: "#A3D9B1" },
  epico: { label: "Épico", bg: "#F5EEDB", ink: "#123D2C", accent: "#C8A85C", ring: "#C8A85C" },
};
export const LOCKED_STYLE = { bg: "#EFF1EE", ink: "#A3ACA6", accent: "#C9CFCA", ring: "#E3E7E3" };

function visitDate(v: ProfileVisit): Date {
  return v.visit_date ? new Date(`${v.visit_date}T12:00:00`) : new Date(v.created_at);
}

function weekStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x.getTime();
}

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

type Def = {
  id: AchievementIconId;
  name: string;
  /** What one unit of progress is, e.g. "visitas" (plural) / "visita". */
  unit: [singular: string, plural: string];
  /** Sentence for a goal: "Registre 10 visitas." */
  describe: (goal: number) => string;
  goals: [number, number, number];
  /** Counts matching visits… */
  test?: (v: ProfileVisit) => boolean;
  /** …or distinct non-null keys. */
  key?: (v: ProfileVisit) => string | null;
};

const n = (goal: number, one: string, many: string) => `${goal} ${goal === 1 ? one : many}`;

const DEFS: Def[] = [
  { id: "primeira-visita", name: "Primeira visita", unit: ["visita", "visitas"], goals: [1, 5, 15], test: () => true,
    describe: (g) => (g === 1 ? "Registre sua primeira visita." : `Registre ${g} visitas.`) },
  { id: "hospede", name: "Hóspede", unit: ["hospedagem", "hospedagens"], goals: [2, 5, 10], test: (v) => v.category === "hotel",
    describe: (g) => `Registre ${n(g, "hospedagem", "hospedagens")}.` },
  { id: "cultura-em-dia", name: "Cultura em dia", unit: ["visita", "visitas"], goals: [3, 10, 25], test: (v) => groupFor(v.category) === "atracao",
    describe: (g) => `Visite ${g} museus ou monumentos.` },
  { id: "amigo-da-natureza", name: "Amigo da natureza", unit: ["visita", "visitas"], goals: [3, 10, 25], test: (v) => groupFor(v.category) === "natureza",
    describe: (g) => `Visite ${g} parques, trilhas ou praias.` },
  { id: "bom-de-garfo", name: "Bom de garfo", unit: ["visita", "visitas"], goals: [5, 15, 40], test: (v) => groupFor(v.category) === "restaurante",
    describe: (g) => `Registre ${g} restaurantes, bares ou cafés.` },
  { id: "fotografo-de-viagem", name: "Fotógrafo de viagem", unit: ["visita com foto", "visitas com foto"], goals: [5, 20, 50], test: (v) => v.photos.length > 0,
    describe: (g) => `Publique ${g} visitas com fotos.` },
  { id: "explorador-assiduo", name: "Explorador assíduo", unit: ["semana", "semanas"], goals: [4, 12, 26], key: (v) => String(weekStart(visitDate(v))),
    describe: (g) => `Registre visitas em ${g} semanas diferentes.` },
  { id: "mapeia-acessibilidade", name: "Mapeia acessibilidade", unit: ["resposta", "respostas"], goals: [3, 10, 25], test: (v) => v.answered.includes("acessibilidade"),
    describe: (g) => `Responda sobre acessibilidade em ${g} visitas.` },
  { id: "registro-completo", name: "Registro completo", unit: ["registro", "registros"], goals: [5, 15, 40], test: (v) => v.points >= 40,
    describe: (g) => `Faça ${g} registros de nível Completo ou melhor.` },
  { id: "desbravador-de-bairros", name: "Desbravador de bairros", unit: ["bairro", "bairros"], goals: [5, 12, 25],
    key: (v) => (neighborhoodOf(v.place_name) ? normalize(neighborhoodOf(v.place_name)!) : null),
    describe: (g) => `Visite lugares em ${g} bairros diferentes.` },
  { id: "cinquenta-visitas", name: "Cinquenta visitas", unit: ["visita", "visitas"], goals: [50, 100, 250], test: () => true,
    describe: (g) => `Registre ${g} visitas.` },
  { id: "guia-da-cidade", name: "Guia da cidade", unit: ["lugar", "lugares"], goals: [30, 75, 150], key: placeKey,
    describe: (g) => `Conheça ${g} lugares diferentes.` },
];

export type BadgeState = {
  id: AchievementIconId;
  name: string;
  goals: [number, number, number];
  count: number;
  /** Highest tier reached, or null when still locked. */
  tier: Tier | null;
  /** Next tier to reach and its goal (null when épico is done). */
  next: { tier: Tier; goal: number } | null;
  unlockedAt: Partial<Record<Tier, string>>;
  description: string; // the next goal, or the épico goal when maxed
  unit: [string, string];
};

export function tierIndex(t: Tier | null) {
  return t ? TIER_ORDER.indexOf(t) : -1;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function computeAchievements(visits: ProfileVisit[], now = new Date()) {
  const asc = [...visits].sort((a, b) => visitDate(a).getTime() - visitDate(b).getTime());

  const badges: BadgeState[] = DEFS.map((def) => {
    const events: string[] = []; // date of each unit of progress, oldest first
    const seen = new Set<string>();
    for (const v of asc) {
      if (def.key) {
        const k = def.key(v);
        if (!k || seen.has(k)) continue;
        seen.add(k);
      } else if (!def.test!(v)) continue;
      events.push(visitDate(v).toISOString());
    }
    const count = events.length;
    let tier: Tier | null = null;
    const unlockedAt: Partial<Record<Tier, string>> = {};
    def.goals.forEach((g, i) => {
      if (count >= g) {
        tier = TIER_ORDER[i];
        unlockedAt[TIER_ORDER[i]] = events[g - 1];
      }
    });
    const ni = tierIndex(tier) + 1;
    const next = ni < 3 ? { tier: TIER_ORDER[ni], goal: def.goals[ni] } : null;
    return {
      id: def.id,
      name: def.name,
      goals: def.goals,
      count,
      tier,
      next,
      unlockedAt,
      description: def.describe(next ? next.goal : def.goals[2]),
      unit: def.unit,
    };
  });

  const xp = visits.reduce((s, v) => s + v.points, 0);
  const places = new Set(visits.map(placeKey));
  const groupCount = (g: string) => visits.filter((v) => groupFor(v.category) === g).length;

  // Neighborhood "stamps": first visit in each one.
  const stampMap = new Map<string, { label: string; date: string; visits: number }>();
  for (const v of asc) {
    const nb = neighborhoodOf(v.place_name);
    if (!nb) continue;
    const k = normalize(nb);
    const s = stampMap.get(k) ?? { label: nb, date: visitDate(v).toISOString(), visits: 0 };
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
  let cursor = activeWeeks.has(thisWeek) ? thisWeek : thisWeek - WEEK_MS; // alive during the current week
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

  // Most recent tier unlocked, and the tier closest to being reached.
  let latest: { badge: BadgeState; tier: Tier; date: string } | null = null;
  for (const b of badges) {
    for (const t of TIER_ORDER) {
      const d = b.unlockedAt[t];
      if (d && (!latest || d > latest.date || (d === latest.date && tierIndex(t) > tierIndex(latest.tier)))) latest = { badge: b, tier: t, date: d };
    }
  }
  const next =
    badges
      .filter((b) => b.next)
      .sort((a, b) => b.count / b.next!.goal - a.count / a.next!.goal || tierIndex(a.tier) - tierIndex(b.tier))[0] ?? null;

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
    levelsUnlocked: badges.reduce((s, b) => s + tierIndex(b.tier) + 1, 0),
    levelsTotal: badges.length * 3,
    latest,
    next,
    history,
  };
}

export type Achievements = ReturnType<typeof computeAchievements>;
