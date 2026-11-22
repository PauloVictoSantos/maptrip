"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Award, Minus, Target } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import type { RankingResponse, RankingRow } from "@/lib/ranking";

type Scope = RankingResponse["scope"];
type Period = RankingResponse["period"];
type Kind = RankingResponse["kind"];

const PERIOD_LABEL: Record<Period, string> = { week: "Semana", month: "Mês", all: "Sempre" };

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-full bg-[#E9ECEA] p-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`h-9 rounded-full px-4 text-[13px] ${
            value === v ? "bg-white font-extrabold text-mt-teal-dark shadow-[0_1px_3px_rgba(20,32,43,0.12)]" : "font-semibold text-mt-ink-2 hover:bg-white/50"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function windowLabel(data: RankingResponse) {
  if (data.period === "all") return "Desde o início";
  const d = new Date(data.window_start!);
  if (data.period === "month") {
    const s = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return `Semana de ${d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "")}`;
}

function rowMeta(r: RankingRow, kind: Kind) {
  if (kind === "contribuicao") return `${r.comments} ${r.comments === 1 ? "comentário" : "comentários"} · ${r.answers} respostas`;
  return `${r.visits} ${r.visits === 1 ? "visita" : "visitas"} · ${r.places} ${r.places === 1 ? "lugar" : "lugares"}`;
}

function daysLeft(iso: string) {
  const days = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
  return days <= 1 ? "termina hoje" : `termina em ${days} dias`;
}

export default function RankingPage() {
  const [scope, setScope] = useState<Scope>("city");
  const [period, setPeriod] = useState<Period>("month");
  const [kind, setKind] = useState<Kind>("exploracao");
  const [data, setData] = useState<RankingResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Ranking · MapTrip";
    let alive = true;
    setLoading(true);
    setError("");
    fetch(`/api/ranking?${new URLSearchParams({ scope, period, kind })}`)
      .then(async (r) => {
        const d = await r.json();
        if (!alive) return;
        if (!r.ok) {
          if (r.status === 400 && scope === "city") setScope("all"); // no city in the profile
          throw new Error(d.error || "Não foi possível carregar o ranking.");
        }
        setData(d);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [scope, period, kind]);

  const unit = kind === "exploracao" ? "XP" : "pts";
  const place = data?.scope === "city" && data.city ? data.city : "geral";
  const meOutsideTop = data?.me && !data.rows.some((r) => r.me);

  return (
    <div className="bg-mt-bg text-mt-ink">
      <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-8 md:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-extrabold tracking-[-0.5px] md:text-[34px]">Ranking de exploradores</h1>
            <p className="mt-1 text-sm text-mt-muted">Só visitas públicas contam pontos, e cada ponto vem da qualidade do registro.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Segmented label="Abrangência" value={scope} onChange={setScope} options={[["city", "Cidade"], ["all", "Geral"]]} />
            <Segmented label="Período" value={period} onChange={setPeriod} options={[["week", "Semana"], ["month", "Mês"], ["all", "Sempre"]]} />
          </div>
        </header>

        <div role="tablist" aria-label="Tipo de ranking" className="mt-6 flex gap-1 border-b border-mt-line">
          {(
            [
              ["exploracao", "Exploração"],
              ["contribuicao", "Contribuição"],
            ] as [Kind, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={kind === v}
              onClick={() => setKind(v)}
              className={`h-12 border-b-[3px] px-4 text-sm ${kind === v ? "border-mt-teal font-extrabold text-mt-teal-dark" : "border-transparent font-semibold text-mt-ink-2 hover:text-mt-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-[#FFF0F0] px-4 py-3 text-sm font-semibold text-[#B42323]">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-start gap-8">
          <main className="min-w-0 flex-[999_1_480px]">
            <section className="rounded-[20px] border border-mt-line bg-white" aria-busy={loading}>
              <div className="flex items-baseline justify-between gap-2 border-b border-mt-line px-5 py-4">
                <h2 className="text-[17px] font-extrabold">
                  {kind === "exploracao" ? "Exploração" : "Contribuição"} · {place}
                </h2>
                <span className="text-[13px] text-mt-muted">{data ? windowLabel(data) : PERIOD_LABEL[period]}</span>
              </div>
              {loading && !data ? (
                <div className="space-y-3 p-5" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-mt-chip motion-reduce:animate-none" />
                  ))}
                </div>
              ) : data && data.rows.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="font-extrabold">Ninguém pontuou neste período ainda</p>
                  <p className="mt-1 text-sm text-mt-muted">Registre uma visita pública para abrir o ranking.</p>
                  <Link href="/post/new" className="mt-4 inline-flex h-10 items-center rounded-full bg-mt-teal px-5 text-sm font-bold text-white hover:bg-mt-teal-dark">
                    Registrar visita
                  </Link>
                </div>
              ) : (
                data && (
                  <ol className={loading ? "opacity-60" : ""}>
                    {data.rows.map((r) => (
                      <Row key={r.user.id} row={r} kind={kind} unit={unit} />
                    ))}
                    {meOutsideTop && (
                      <>
                        <li aria-hidden="true" className="px-5 py-1 text-center text-mt-muted">
                          ⋯
                        </li>
                        <Row row={data.me!} kind={kind} unit={unit} />
                      </>
                    )}
                  </ol>
                )
              )}
            </section>
            {kind === "contribuicao" && (
              <p className="mt-3 text-xs text-mt-muted">Contribuição: 5 pontos por comentário e 2 por pergunta respondida em visitas públicas.</p>
            )}
          </main>

          <aside className="flex min-w-[280px] max-w-[380px] flex-[1_1_320px] flex-col gap-4">
            {data?.me && (
              <section aria-label="Sua posição" className="rounded-[20px] border border-mt-line bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-mt-muted">Sua posição</p>
                <p className="mt-1 text-[26px] font-extrabold tracking-[-0.3px] tabular-nums">
                  {data.me.rank ? `${data.me.rank}º ${data.scope === "city" && data.city ? `em ${data.city}` : "no geral"}` : "Sem pontos ainda"}
                </p>
                <p className="mt-1 text-sm font-bold text-[#7A5F1C]">
                  {data.me.value} {unit}
                  {data.me.delta ? (
                    <span className={data.me.delta > 0 ? "text-mt-teal-dark" : "text-[#B42323]"}>
                      {" "}
                      · {data.me.delta > 0 ? `subiu ${data.me.delta}` : `caiu ${-data.me.delta}`}
                    </span>
                  ) : null}
                </p>
                {data.next && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[13px] font-semibold">
                      <span>Até o {data.next.rank}º lugar</span>
                      <span className="text-mt-muted">
                        faltam {data.next.missing} {unit}
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`Progresso até o ${data.next.rank}º lugar`}
                      aria-valuemin={0}
                      aria-valuemax={data.me.value + data.next.missing}
                      aria-valuenow={data.me.value}
                      className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-mt-line"
                    >
                      <div
                        className="h-2.5 rounded-full bg-[#C8A85C]"
                        style={{ width: `${(data.me.value / Math.max(1, data.me.value + data.next.missing)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </section>
            )}

            {data?.challenges.map((c) => (
              <article key={c.id} className="rounded-[20px] border border-mt-line bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5EEDB] text-[#7A5F1C]">
                    <Target size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-extrabold">{c.title}</h3>
                    <p className="text-xs text-mt-muted">{daysLeft(c.ends_at)}</p>
                  </div>
                </div>
                <p className="mt-3 text-[13px] text-mt-ink-2">{c.description}</p>
                <div
                  role="progressbar"
                  aria-label={`Progresso: ${c.title}`}
                  aria-valuemin={0}
                  aria-valuemax={c.goal}
                  aria-valuenow={c.progress}
                  className="mt-3 h-2 overflow-hidden rounded-full bg-mt-line"
                >
                  <div className="h-2 rounded-full bg-[#16845A]" style={{ width: `${(c.progress / c.goal) * 100}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-bold">
                    {c.progress} de {c.goal}
                    {c.progress >= c.goal && " · concluído"}
                  </span>
                  <Link href="/post/new" className="font-bold text-mt-teal-dark hover:underline">
                    Registrar visita
                  </Link>
                </div>
              </article>
            ))}

            <Link href="/conquistas" className="flex items-center gap-2 rounded-[20px] border border-mt-line bg-white p-4 text-sm font-bold hover:border-mt-line-strong">
              <Award size={18} aria-hidden="true" className="text-[#7A5F1C]" />
              Ver seus selos e o histórico de XP
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Row({ row, kind, unit }: { row: RankingRow; kind: Kind; unit: string }) {
  const name = row.user.display_name || row.user.username;
  const medal = row.rank === 1 ? "#C8A85C" : row.rank === 2 ? "#A3ACA6" : row.rank === 3 ? "#B07A4A" : null;
  return (
    <li className={`flex items-center gap-3 border-b border-mt-line px-5 py-3 last:border-b-0 ${row.me ? "bg-mt-teal-soft" : ""}`}>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums"
        style={medal ? { background: medal, color: "#fff" } : { color: "#59625C" }}
      >
        {row.rank ?? "—"}
      </span>
      <Link href={`/profile/${row.user.username}`} aria-label={`Perfil de ${name}`}>
        <PersonAvatar name={name} src={row.user.avatar_url} size={40} />
      </Link>
      <span className="min-w-0 flex-1">
        <Link href={`/profile/${row.user.username}`} className="block truncate text-sm font-bold text-mt-ink hover:underline">
          {row.me ? `Você (${name})` : name}
        </Link>
        <span className="block truncate text-xs text-mt-muted">{rowMeta(row, kind)}</span>
      </span>
      <span className="flex w-14 shrink-0 items-center justify-end gap-0.5 text-xs font-bold">
        {row.is_new ? (
          <span className="text-mt-teal-dark">novo</span>
        ) : row.delta == null || row.delta === 0 ? (
          <Minus size={14} aria-label="Mesma posição" className="text-mt-muted" />
        ) : row.delta > 0 ? (
          <span className="flex items-center text-mt-teal-dark">
            <ArrowUp size={14} aria-hidden="true" />
            <span className="sr-only">subiu </span>
            {row.delta}
          </span>
        ) : (
          <span className="flex items-center text-[#B42323]">
            <ArrowDown size={14} aria-hidden="true" />
            <span className="sr-only">caiu </span>
            {-row.delta}
          </span>
        )}
      </span>
      <span className="w-20 shrink-0 text-right text-sm font-extrabold tabular-nums text-[#7A5F1C]">
        {row.value.toLocaleString("pt-BR")} {unit}
      </span>
    </li>
  );
}
