"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, Trophy } from "lucide-react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { BadgeCircle, BadgeMedal } from "@/components/achievements/BadgeMedal";
import { computeAchievements, tierIndex, TIER_STYLE, type BadgeState, type Tier } from "@/lib/achievements";
import type { ProfileVisit } from "@/app/api/users/[username]/visits/route";

type Filter = "todos" | "ganhos" | "bloq" | "raros";

function shortDate(iso: string) {
  const d = new Date(iso);
  return d
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })
    .replace(".", "");
}

export default function AchievementsPage() {
  const { profile, loading } = useAuthContext();
  const [visits, setVisits] = useState<ProfileVisit[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  useEffect(() => {
    document.title = "Conquistas · MapTrip";
    if (!profile) return;
    fetch(`/api/users/${profile.username}/visits`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Não foi possível carregar suas visitas.");
        setVisits(d.visits);
      })
      .catch((e) => setError(e.message));
  }, [profile]);

  const a = useMemo(() => (visits ? computeAchievements(visits) : null), [visits]);

  if (error) return <p className="mx-auto max-w-xl px-4 py-16 text-center font-bold text-mt-ink">{error}</p>;
  if (loading || !profile || !a) {
    return (
      <div aria-hidden="true" className="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 md:grid-cols-[380px_1fr] md:px-6">
        <div className="h-[520px] animate-pulse rounded-[20px] bg-mt-chip motion-reduce:animate-none" />
        <div className="h-[520px] animate-pulse rounded-[20px] bg-mt-chip motion-reduce:animate-none" />
      </div>
    );
  }

  const unlockedCount = a.badges.filter((b) => b.tier).length;
  const shown = a.badges.filter((b) =>
    filter === "ganhos" ? !!b.tier : filter === "bloq" ? !b.tier : filter === "raros" ? tierIndex(b.tier) >= 1 : true
  );
  const name = profile.display_name || profile.username;
  const since = new Date(profile.created_at).getFullYear();
  const passport = [
    [a.passport.visits, "Visitas"],
    [a.passport.places, "Lugares"],
    [a.passport.neighborhoods, "Bairros"],
    [a.passport.culture, "Cultura"],
    [a.passport.nature, "Natureza"],
    [a.passport.food, "Comer e beber"],
  ] as const;
  const maxWeek = Math.max(1, ...a.weeks);

  return (
    <div className="bg-mt-bg text-mt-ink">
      <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-8 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-[30px] font-extrabold tracking-[-0.5px] md:text-[34px]">Conquistas</h1>
          <Link href="/ranking" className="flex h-10 items-center gap-2 rounded-full border-[1.5px] border-mt-line-strong bg-white px-4 text-sm font-bold hover:bg-mt-chip">
            <Trophy size={16} aria-hidden="true" />
            Ver ranking
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-start gap-8">
          {/* ---- Left column ---- */}
          <aside className="flex min-w-[280px] max-w-[420px] flex-[1_1_340px] flex-col gap-4">
            <section aria-label="Passaporte digital" className="overflow-hidden rounded-[20px] bg-[#123D2C] text-white">
              <div className="flex items-start justify-between px-5 pb-3 pt-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6FC493]">Passaporte MapTrip</p>
                  <p className="mt-1 text-xl font-extrabold">{name}</p>
                  <p className="text-xs text-white/70">Explorador desde {since}</p>
                </div>
                <span className="rounded-full border border-white/25 px-2.5 py-1 text-xs font-bold">{a.level.label}</span>
              </div>
              <dl className="grid grid-cols-3 gap-px bg-white/10">
                {passport.map(([n, label]) => (
                  <div key={label} className="flex flex-col-reverse bg-[#123D2C] px-4 py-3">
                    <dt className="text-[11px] font-semibold text-white/70">{label}</dt>
                    <dd className="text-xl font-extrabold tabular-nums">{n}</dd>
                  </div>
                ))}
              </dl>
              <div className="px-5 py-4">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#C8A85C]">Carimbos de bairro</h2>
                {a.stamps.length === 0 ? (
                  <p className="mt-2 text-sm text-white/70">Os carimbos aparecem quando o endereço da visita tem o bairro.</p>
                ) : (
                  <ul className="mt-2.5 flex flex-wrap gap-2">
                    {a.stamps.slice(0, 8).map((s) => (
                      <li key={s.label} className="rounded-xl border-2 border-dashed border-[#C8A85C]/70 px-3 py-1.5 text-center">
                        <span className="block text-[13px] font-extrabold uppercase tracking-[0.04em]">{s.label}</span>
                        <span className="block font-mono text-[10px] text-white/70">{shortDate(s.date).toUpperCase()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="rounded-[20px] border border-mt-line bg-white p-5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[28px] font-extrabold tabular-nums text-[#7A5F1C]">{a.xp} XP</span>
                <span className="text-sm font-bold">{a.level.label}</span>
              </div>
              <div
                role="progressbar"
                aria-label="Progresso até o próximo nível"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(a.level.pct * 100)}
                className="mt-3 h-2.5 overflow-hidden rounded-full bg-mt-line"
              >
                <div className="h-2.5 rounded-full bg-[#C8A85C]" style={{ width: `${Math.round(a.level.pct * 100)}%` }} />
              </div>
              <p className="mt-2 text-[13px] text-mt-muted">
                {a.level.next ? `${a.level.missing} XP para ${a.level.next.label}` : "Você chegou ao nível máximo."}
              </p>
            </section>

            <section className="rounded-[20px] border border-mt-line bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FCF3E0] text-[#8F5C00]">
                  <Flame size={22} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-lg font-extrabold">
                    {a.streak} {a.streak === 1 ? "semana" : "semanas"} seguidas
                  </p>
                  <p className="text-[13px] text-mt-muted">
                    {a.visitedThisWeek
                      ? "Você já registrou uma visita esta semana."
                      : "Registre uma visita até domingo para manter a sequência."}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex h-14 items-end gap-1.5" role="img" aria-label={`Visitas por semana nas últimas 12 semanas: ${a.weeks.join(", ")}`}>
                {a.weeks.map((n, i) => (
                  <span
                    key={i}
                    className={`flex-1 rounded-[3px] ${n ? "bg-[#16845A]" : "bg-mt-chip"}`}
                    style={{ height: `${n ? 20 + (n / maxWeek) * 80 : 12}%` }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-mt-muted">
                <span>12 semanas atrás</span>
                <span>esta semana</span>
              </div>
            </section>
          </aside>

          {/* ---- Main column ---- */}
          <main className="flex min-w-0 flex-[999_1_480px] flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-extrabold tracking-[-0.3px]">
                  Selos · {unlockedCount} de {a.badges.length}
                </h2>
                <p className="text-[13px] text-mt-muted">
                  {a.levelsUnlocked} de {a.levelsTotal} níveis conquistados · cada selo evolui de comum para raro e épico
                </p>
              </div>
              <div role="group" aria-label="Filtrar selos" className="flex flex-wrap gap-2">
                {(
                  [
                    ["todos", `Todos (${a.badges.length})`],
                    ["ganhos", `Desbloqueados (${unlockedCount})`],
                    ["bloq", `Bloqueados (${a.badges.length - unlockedCount})`],
                    ["raros", "Raros e acima"],
                  ] as [Filter, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                    className={`h-9 rounded-full border-[1.5px] px-3.5 text-[13px] ${
                      filter === id
                        ? "border-mt-teal bg-mt-teal-soft font-extrabold text-mt-teal-dark"
                        : "border-mt-line bg-white font-semibold text-mt-ink-2 hover:border-mt-line-strong"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] justify-items-center gap-x-3 gap-y-6 rounded-[20px] border border-mt-line bg-white p-6">
              {shown.map((b) => (
                <li key={b.id}>
                  <BadgeMedal badge={b} />
                </li>
              ))}
              {shown.length === 0 && <li className="col-span-full text-sm text-mt-muted">Nenhum selo neste filtro.</li>}
            </ul>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {a.latest && <AchievementCard badge={a.latest.badge} tier={a.latest.tier} date={a.latest.date} title="Último nível conquistado" />}
              {a.next && <AchievementCard badge={a.next} tier={a.next.next!.tier} title="Próximo nível" />}
            </div>

            <section>
              <h2 className="mb-2 text-[17px] font-extrabold">Histórico de XP</h2>
              {a.history.length === 0 ? (
                <p className="text-sm text-mt-muted">
                  Nenhuma visita ainda.{" "}
                  <Link href="/post/new" className="font-bold text-mt-teal-dark underline">
                    Registre a primeira
                  </Link>
                  .
                </p>
              ) : (
                <ul>
                  {a.history.map((h) => (
                    <li key={h.id} className="flex items-center gap-3 border-b border-mt-line py-2.5 text-sm">
                      <Link href={`/post/${h.id}`} className="min-w-0 flex-1 truncate hover:underline">
                        {h.reason}
                      </Link>
                      <span className="shrink-0 text-mt-muted">{shortDate(h.date)}</span>
                      <span className="w-16 shrink-0 text-right font-extrabold tabular-nums text-[#7A5F1C]">+{h.xp}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}


/** "Último nível conquistado" (with date) or "Próximo nível" (with progress). */
function AchievementCard({ badge, tier, date, title }: { badge: BadgeState; tier: Tier; date?: string; title: string }) {
  const style = TIER_STYLE[tier];
  const reached = tierIndex(badge.tier) >= tierIndex(tier);
  const goal = badge.goals[tierIndex(tier)];
  return (
    <article className="flex gap-4 rounded-[20px] border border-mt-line bg-white p-5">
      <BadgeCircle id={badge.id} tier={reached ? tier : null} size={60} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-mt-muted">
          {title} · <span style={{ color: style.ink }}>{style.label}</span>
        </p>
        <h3 className="mt-0.5 text-base font-extrabold">{badge.name}</h3>
        {reached ? (
          <p className="mt-1 text-[13px] text-mt-ink-2">
            {badge.count} {badge.count === 1 ? badge.unit[0] : badge.unit[1]}
            {date && <span className="text-mt-muted"> · conquistado em {shortDate(date)}</span>}
          </p>
        ) : (
          <>
            <p className="mt-1 text-[13px] text-mt-ink-2">{badge.description}</p>
            <div
              role="progressbar"
              aria-label={`Progresso de ${badge.name} até o nível ${style.label.toLowerCase()}`}
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={Math.min(badge.count, goal)}
              className="mt-3 h-2 overflow-hidden rounded-full bg-mt-line"
            >
              <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (badge.count / goal) * 100)}%`, background: style.accent }} />
            </div>
            <p className="mt-1.5 text-xs tabular-nums text-mt-muted">
              {badge.count} de {goal}
            </p>
          </>
        )}
      </div>
    </article>
  );
}
