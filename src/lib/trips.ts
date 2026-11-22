// Trip planning: shared types, validation and itinerary math (client + server).
import { haversineKm } from "@/lib/search";
import { POST_CATEGORIES } from "@/lib/types";
import type { FeedUser } from "@/lib/feed";

export const BUDGET_KEYS = ["hospedagem", "transporte", "alimentacao", "passeios"] as const;
export type BudgetKey = (typeof BUDGET_KEYS)[number];
export const BUDGET_LABELS: Record<BudgetKey, string> = {
  hospedagem: "Hospedagem",
  transporte: "Transporte",
  alimentacao: "Alimentação",
  passeios: "Passeios",
};

export const LIMITS = { days: 30, stopsPerDay: 20, members: 10, expenses: 200, money: 10_000_000 } as const;

export type TripStopJson = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string | null;
  time: string | null;
  duration_min: number | null;
  note: string | null;
  done: boolean;
};
export type TripExpenseJson = { id: string; key: BudgetKey; label: string; amount: number; created_by: string; created_at: string };

export type TripJson = {
  id: string;
  owner_id: string;
  is_owner: boolean;
  members: FeedUser[];
  title: string;
  city: string;
  lat: number;
  lng: number;
  start_date: string;
  end_date: string;
  days: { stops: TripStopJson[] }[];
  budget: Record<BudgetKey, number>;
  expenses: TripExpenseJson[];
  version: number;
  updated_at: string;
};

export type TripSummary = Pick<TripJson, "id" | "title" | "city" | "start_date" | "end_date" | "members" | "is_owner"> & {
  stops: number;
  planned: number;
};

// ---- Dates -----------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(s: unknown): Date | null {
  if (typeof s !== "string" || !DATE_RE.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  return isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

/** Number of days in [start, end], or null when invalid / too long. */
export function spanDays(start: string, end: string): number | null {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b || b < a) return null;
  const n = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  return n > LIMITS.days ? null : n;
}

export function dayDate(start: string, index: number): Date {
  const d = parseDate(start)!;
  d.setUTCDate(d.getUTCDate() + index);
  return d;
}

export function formatDay(start: string, index: number, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return dayDate(start, index).toLocaleDateString("pt-BR", { ...opts, timeZone: "UTC" }).replace(/\./g, "");
}

export function formatRange(start: string, end: string) {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return "";
  const o: Intl.DateTimeFormatOptions = { timeZone: "UTC" };
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  const left = a.toLocaleDateString("pt-BR", { ...o, day: "numeric", ...(sameMonth ? {} : { month: "short" }) });
  const right = b.toLocaleDateString("pt-BR", { ...o, day: "numeric", month: "short", year: a.getUTCFullYear() !== new Date().getUTCFullYear() ? "numeric" : undefined });
  return `${left}–${right}`.replace(/\./g, "");
}

// ---- Itinerary math --------------------------------------------------------

export function toMinutes(time: string | null): number | null {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Straight-line leg with a rough travel estimate (walk ≤ 1.5 km, otherwise car in city traffic). */
export function legBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const km = haversineKm(a.lat, a.lng, b.lat, b.lng) * 1.3; // detour factor over a straight line
  const walk = km <= 1.5;
  const minutes = Math.max(1, Math.round(walk ? (km / 4.5) * 60 : (km / 22) * 60 + 5));
  return { km, minutes, mode: walk ? ("a pé" as const) : ("de carro" as const) };
}

export function formatKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
}

/** Stops whose start time can't be reached after the previous stop + travel. */
export function scheduleConflicts(stops: TripStopJson[]) {
  const out: { stopId: string; previous: string; lateBy: number }[] = [];
  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1];
    const cur = stops[i];
    const start = toMinutes(prev.time);
    const next = toMinutes(cur.time);
    if (start == null || next == null) continue;
    const ready = start + (prev.duration_min ?? 0) + legBetween(prev, cur).minutes;
    if (ready > next) out.push({ stopId: cur.id, previous: prev.name, lateBy: ready - next });
  }
  return out;
}

export function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: n % 1 ? 2 : 0 });
}

// ---- Validation (server uses these; client mirrors limits) -----------------

const CATEGORIES = new Set(POST_CATEGORIES.map((c) => c.value as string));
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

function str(v: unknown, max: number, required = false): string | null | undefined {
  if (v == null || v === "") return required ? undefined : null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (required && !t) return undefined;
  return t.length > max ? undefined : t || null;
}

export function validateStop(raw: unknown): TripStopJson | string {
  if (!raw || typeof raw !== "object") return "Parada inválida.";
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || !ID_RE.test(s.id)) return "Parada sem identificador.";
  const name = str(s.name, 120, true);
  if (!name) return "Toda parada precisa de nome (até 120 caracteres).";
  const lat = Number(s.lat);
  const lng = Number(s.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return "Localização inválida.";
  const category = s.category == null || s.category === "" ? null : String(s.category);
  if (category && !CATEGORIES.has(category)) return "Categoria inválida.";
  const time = s.time == null || s.time === "" ? null : String(s.time);
  if (time && (toMinutes(time) == null || toMinutes(time)! >= 24 * 60)) return "Horário inválido (use HH:MM).";
  const duration = s.duration_min == null || s.duration_min === "" ? null : Number(s.duration_min);
  if (duration != null && (!Number.isInteger(duration) || duration < 0 || duration > 1440)) return "Duração inválida.";
  const note = str(s.note, 200);
  if (note === undefined) return "Observação muito longa (até 200 caracteres).";
  return { id: s.id, name, lat, lng, category, time, duration_min: duration, note, done: s.done === true };
}

export function validateDays(raw: unknown, expected: number): { stops: TripStopJson[] }[] | string {
  if (!Array.isArray(raw) || raw.length !== expected) return "Os dias não batem com as datas da viagem.";
  const ids = new Set<string>();
  const days: { stops: TripStopJson[] }[] = [];
  for (const d of raw) {
    const stops = (d as { stops?: unknown })?.stops;
    if (!Array.isArray(stops) || stops.length > LIMITS.stopsPerDay) return `Cada dia aceita até ${LIMITS.stopsPerDay} paradas.`;
    const clean: TripStopJson[] = [];
    for (const s of stops) {
      const v = validateStop(s);
      if (typeof v === "string") return v;
      if (ids.has(v.id)) return "Parada repetida.";
      ids.add(v.id);
      clean.push(v);
    }
    days.push({ stops: clean });
  }
  return days;
}

export function validateBudget(raw: unknown): Record<BudgetKey, number> | string {
  if (!raw || typeof raw !== "object") return "Orçamento inválido.";
  const out = {} as Record<BudgetKey, number>;
  for (const k of BUDGET_KEYS) {
    const n = Number((raw as Record<string, unknown>)[k] ?? 0);
    if (!Number.isFinite(n) || n < 0 || n > LIMITS.money) return "Valor do orçamento inválido.";
    out[k] = Math.round(n * 100) / 100;
  }
  return out;
}

export function validateExpense(raw: unknown): Pick<TripExpenseJson, "id" | "key" | "label" | "amount"> | string {
  if (!raw || typeof raw !== "object") return "Gasto inválido.";
  const e = raw as Record<string, unknown>;
  if (typeof e.id !== "string" || !ID_RE.test(e.id)) return "Gasto sem identificador.";
  if (!BUDGET_KEYS.includes(e.key as BudgetKey)) return "Categoria do gasto inválida.";
  const label = str(e.label, 80, true);
  if (!label) return "Descreva o gasto (até 80 caracteres).";
  const amount = Number(e.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > LIMITS.money) return "Valor do gasto inválido.";
  return { id: e.id, key: e.key as BudgetKey, label, amount: Math.round(amount * 100) / 100 };
}

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
