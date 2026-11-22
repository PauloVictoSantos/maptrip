"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Bookmark, MapPin, Navigation, Plus, Share2 } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { CATEGORY_GROUPS, formatRatingBR, groupFor } from "@/components/map/categories";
import { relativeTime } from "@/lib/feed";
import { MIN_REPORTS, PREFERENCE_KEYS, type AnswerSummary, type PlaceDetail } from "@/lib/place";
import { PRICE_LABELS } from "@/lib/search";

const PlaceMiniMap = dynamic(() => import("@/components/place/PlaceMiniMap"), {
  ssr: false,
  loading: () => <div className="h-[180px] animate-pulse bg-mt-land motion-reduce:animate-none" />,
});

type Address = { line: string; city: string };
type Tab = "visitas" | "fotos";

function Star({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#E8590C" stroke="#E8590C" strokeWidth={1.5} strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function PlacePage() {
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [error, setError] = useState("");
  const [address, setAddress] = useState<Address | null>(null);
  const [tab, setTab] = useState<Tab>("visitas");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    fetch(`/api/places/detail?${params}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Não foi possível carregar o lugar.");
        setPlace(data);
        document.title = `${data.name} · MapTrip`;
        // Address for the header / breadcrumb
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${data.lat}&lon=${data.lng}`,
          { headers: { "Accept-Language": "pt-BR" } }
        )
          .then((r) => r.json())
          .then((g) => {
            const a = g?.address ?? {};
            const city = a.city || a.town || a.village || a.municipality || "";
            const street = [a.road, a.house_number].filter(Boolean).join(", ");
            const area = a.suburb || a.neighbourhood || "";
            setAddress({ line: [street, area].filter(Boolean).join(", "), city: [city, a.state_code || a.state].filter(Boolean).join(", ") });
          })
          .catch(() => undefined);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-lg font-extrabold text-mt-ink">{error}</p>
        <Link href="/buscar" className="mt-4 inline-flex h-11 items-center rounded-full bg-mt-teal px-5 text-sm font-bold text-white">
          Buscar lugares
        </Link>
      </div>
    );
  }
  if (!place) return <PlaceSkeleton />;

  const groupKey = groupFor(place.category);
  const group = CATEGORY_GROUPS[groupKey];
  const registerHref = `/post/new?${new URLSearchParams({
    lat: String(place.lat),
    lng: String(place.lng),
    place: place.name,
    ...(place.category ? { category: place.category } : {}),
  })}`;

  const byKey = Object.fromEntries(place.summary.map((s) => [s.key, s]));
  const reportCards = [
    byKey.faixa_preco && {
      label: "Faixa de preço",
      value: byKey.faixa_preco.mode!,
      note: PRICE_LABELS[byKey.faixa_preco.mode!] ?? "",
      n: byKey.faixa_preco.n,
    },
    byKey.cobra_entrada && {
      label: "Taxa de entrada",
      value: `${Math.round(byKey.cobra_entrada.pct! * 100)}%`,
      note: "relataram cobrança",
      n: byKey.cobra_entrada.n,
    },
    byKey.melhor_horario && { label: "Melhor horário", value: byKey.melhor_horario.modeLabel!, note: "", n: byKey.melhor_horario.n },
    byKey.melhor_epoca && { label: "Melhor época", value: byKey.melhor_epoca.modeLabel!, note: "", n: byKey.melhor_epoca.n },
    ...place.summary
      .filter((s) => s.type === "scale_1_5")
      .map((s) => ({ label: s.label, value: formatRatingBR(s.avg!), note: "de 5", n: s.n })),
  ].filter(Boolean) as { label: string; value: string; note: string; n: number }[];

  const bars: AnswerSummary[] = [
    ...PREFERENCE_KEYS.map((k) => byKey[k]).filter(Boolean),
    ...place.summary.filter((s) => s.type === "boolean" && !PREFERENCE_KEYS.includes(s.key) && s.key !== "cobra_entrada"),
  ];
  const missingPrefs = PREFERENCE_KEYS.filter((k) => !byKey[k]);

  async function save() {
    if (!place || saved) return;
    const res = await fetch("/api/places/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "quero_visitar",
        place: { lat: place.lat, lng: place.lng, name: place.name, place_name: place.name, category: place.category },
      }),
    }).catch(() => null);
    if (res?.ok) {
      setSaved(true);
      setNotice("Salvo em Quero visitar");
    } else setNotice("Não foi possível salvar");
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: place!.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Link copiado");
      }
    } catch {
      /* dismissed */
    }
  }

  const photos = place.photos;
  const extraPhotos = Math.max(0, photos.length - 4);

  return (
    <div className="bg-white text-mt-ink">
      <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-5 md:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Caminho" className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-mt-muted">
          {address?.city && (
            <>
              <Link href={`/buscar?${new URLSearchParams({ local: address.city })}`} className="py-1 text-mt-teal-dark hover:underline">
                {address.city}
              </Link>
              <span aria-hidden="true">›</span>
            </>
          )}
          <Link href={`/buscar?tipo=${groupKey}`} className="py-1 text-mt-teal-dark hover:underline">
            {group.label}
          </Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page" className="text-mt-ink">
            {place.name}
          </span>
        </nav>

        {/* Header */}
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-[1_1_420px]">
            <span className="inline-flex h-6 items-center rounded-md px-2 text-xs font-bold" style={{ background: group.soft, color: group.softText }}>
              {group.label}
            </span>
            <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-[-0.6px] md:text-[34px] md:leading-[40px]">{place.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-sm text-mt-muted">
              <span className="flex items-center gap-1">
                {place.rating > 0 && (
                  <>
                    <Star />
                    <strong className="text-base font-extrabold text-mt-ink">{formatRatingBR(place.rating)}</strong>·
                  </>
                )}{" "}
                {place.visits_count} {place.visits_count === 1 ? "visita pública" : "visitas públicas"}
              </span>
              {address?.line && (
                <span className="flex items-center gap-1">
                  <MapPin size={16} aria-hidden="true" />
                  {address.line}
                  {address.city ? ` · ${address.city}` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              aria-pressed={saved}
              className="flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-mt-line-strong px-4 text-sm font-bold hover:bg-mt-chip"
            >
              <Bookmark size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
              {saved ? "Salvo" : "Salvar"}
            </button>
            <button type="button" onClick={share} className="flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-mt-line-strong px-4 text-sm font-bold hover:bg-mt-chip">
              <Share2 size={18} aria-hidden="true" />
              Compartilhar
            </button>
            <Link href={registerHref} className="flex h-11 items-center gap-1.5 rounded-full bg-mt-teal px-5 text-sm font-bold text-white hover:bg-mt-teal-dark">
              <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
              Registrar visita aqui
            </Link>
          </div>
        </div>
        <p aria-live="polite" className="mt-2 min-h-5 text-sm font-semibold text-mt-teal-dark">
          {notice}
        </p>

        {/* Photos */}
        {photos.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Photo url={photos[0].url} className="h-64 flex-[2_1_480px] rounded-[20px] md:h-80" alt={`Foto de ${place.name}`} />
            {photos.length > 1 && (
              <div className="grid flex-[1_1_320px] grid-cols-2 gap-2">
                {photos.slice(1, 4).map((p, i) => (
                  <Photo key={i} url={p.url} className="h-[156px] rounded-2xl" alt="" />
                ))}
                {extraPhotos > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab("fotos");
                      document.getElementById("abas-lugar")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="flex h-[156px] flex-col items-center justify-center gap-1 rounded-2xl bg-mt-ink text-[15px] font-extrabold text-white hover:bg-black"
                  >
                    <span className="text-[22px]">+{extraPhotos}</span>
                    Ver todas as fotos
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 flex h-40 items-center justify-center rounded-[20px] text-sm font-semibold" style={{ background: group.soft, color: group.softText }}>
            Ainda sem fotos. Registre sua visita e seja a primeira pessoa a mostrar o lugar.
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-start gap-8">
          <main className="min-w-0 flex-[999_1_560px]">
            {/* Community report */}
            <h2 className="mb-3 text-[19px] font-extrabold">O que a comunidade relata</h2>
            {reportCards.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {reportCards.map((c) => (
                  <div key={c.label} className="flex-[1_1_150px] rounded-2xl border border-mt-line p-3.5">
                    <div className="text-xs font-semibold text-mt-muted">{c.label}</div>
                    <div className="mt-1 text-xl font-extrabold">
                      {c.value} {c.note && <span className="text-[13px] font-semibold text-mt-muted">{c.note}</span>}
                    </div>
                    <div className="mt-0.5 text-[11px] text-mt-muted">
                      {c.n} {c.n === 1 ? "relato" : "relatos"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-mt-muted">Ninguém respondeu às perguntas sobre este lugar ainda.</p>
            )}

            {/* Preferences */}
            <h2 className="mb-2 mt-7 text-[19px] font-extrabold">Acessibilidade e preferências</h2>
            <div className="flex flex-wrap gap-x-8">
              {bars.map((s) => (
                <div key={s.key} className="flex h-10 flex-[1_1_260px] items-center gap-2.5 text-sm font-semibold">
                  <span className="w-[130px] shrink-0">{s.label}</span>
                  {s.n >= MIN_REPORTS ? (
                    <>
                      <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded bg-mt-line">
                        <span className="block h-2 bg-mt-teal" style={{ width: `${Math.round(s.pct! * 100)}%` }} />
                      </span>
                      <span className="w-12 text-right font-extrabold">
                        {Math.round(s.pct! * 100)}%<span className="sr-only"> de {s.n} relatos dizem que sim</span>
                      </span>
                    </>
                  ) : (
                    <span className="flex-1 text-[13px] font-medium text-mt-muted">Poucos relatos ainda</span>
                  )}
                </div>
              ))}
              {missingPrefs.map((k) => (
                <div key={k} className="flex h-10 flex-[1_1_260px] items-center gap-2.5 text-sm font-semibold text-mt-muted">
                  <span className="w-[130px] shrink-0">
                    {k === "acessibilidade" ? "Acessível" : k === "aceita_pet" ? "Pet-friendly" : "Vegetariano"}
                  </span>
                  <span className="flex-1 text-[13px] font-medium">Sem relatos</span>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div id="abas-lugar" role="tablist" aria-label="Conteúdo do lugar" className="mt-7 flex flex-wrap gap-1 border-b border-mt-line">
              {(
                [
                  ["visitas", `Visitas (${place.visits_count})`],
                  ["fotos", `Fotos (${photos.length})`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`h-12 border-b-[3px] px-3.5 text-sm ${
                    tab === value ? "border-mt-teal font-extrabold text-mt-teal-dark" : "border-transparent font-semibold text-mt-ink-2 hover:text-mt-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "visitas" ? (
              <div role="tabpanel" className="flex flex-col">
                {place.visits.map((v, i) => {
                  const name = v.user?.display_name || v.user?.username || "Alguém";
                  const showTitle = v.title && v.title.trim() !== place.name.trim();
                  return (
                    <article key={v.id} className={`flex gap-3.5 py-[18px] ${i < place.visits.length - 1 ? "border-b border-[#EEF0EE]" : ""}`}>
                      <Link href={`/profile/${v.user?.username ?? ""}`} aria-label={`Perfil de ${name}`}>
                        <PersonAvatar name={name} src={v.user?.avatar_url} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <Link href={`/profile/${v.user?.username ?? ""}`} className="text-[15px] font-extrabold text-mt-ink hover:underline">
                            {name}
                          </Link>
                          {v.rating > 0 && <span className="text-[13px] font-bold text-[#9A4508]">★ {formatRatingBR(v.rating)}</span>}
                          <span className="text-[13px] text-mt-muted">
                            {relativeTime(v.created_at)}
                            {v.media_count > 0 && ` · ${v.media_count} ${v.media_count === 1 ? "foto" : "fotos"}`}
                          </span>
                        </div>
                        {showTitle && <p className="mt-1.5 text-[15px] font-bold">{v.title}</p>}
                        {v.description && <p className="mt-1.5 whitespace-pre-line text-[15px] leading-[23px]">{v.description}</p>}
                        {v.tags.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {v.tags.map((t) => (
                              <span key={t} className="inline-flex h-6 items-center rounded-md bg-mt-chip px-2 text-xs font-semibold text-mt-ink-2">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <Link href={`/post/${v.id}`} className="mt-2 inline-block text-[13px] font-bold text-mt-teal-dark hover:underline">
                          Ver visita
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div role="tabpanel" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.length === 0 && <p className="col-span-full text-sm text-mt-muted">Ainda sem fotos.</p>}
                {photos.map((p, i) => (
                  <Link key={i} href={`/post/${p.post_id}`} className="block">
                    <Photo url={p.url} className="aspect-square rounded-2xl" alt={`Foto ${i + 1} de ${place.name}`} />
                  </Link>
                ))}
              </div>
            )}
          </main>

          {/* Aside */}
          <aside className="flex flex-[1_1_320px] flex-col gap-3.5">
            <div className="overflow-hidden rounded-[18px] border border-mt-line">
              <PlaceMiniMap lat={place.lat} lng={place.lng} category={place.category} label={place.name} />
              <div className="flex flex-col gap-2.5 px-4 py-3.5">
                <div className="text-sm leading-5">
                  {address?.line || place.name}
                  {address?.city && (
                    <>
                      <br />
                      <span className="text-mt-muted">{address.city}</span>
                    </>
                  )}
                </div>
                <a
                  href={`https://www.openstreetmap.org/directions?to=${place.lat}%2C${place.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-mt-teal text-sm font-bold text-mt-teal-dark hover:bg-mt-teal-soft"
                >
                  <Navigation size={16} strokeWidth={2.2} aria-hidden="true" />
                  Como chegar
                  <span className="sr-only">(abre o OpenStreetMap em nova aba)</span>
                </a>
                <p className="text-[11px] text-mt-muted">
                  Mapa ©{" "}
                  <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="hover:underline">
                    OpenStreetMap
                  </a>
                </p>
              </div>
            </div>

            {place.visits.some((v) => v.description) && (
              <div className="rounded-[18px] bg-mt-teal-soft p-4 text-mt-teal-dark">
                <h2 className="text-base font-extrabold">Dicas de quem foi</h2>
                {place.visits
                  .filter((v) => v.description && v.description.trim().length <= 160)
                  .slice(0, 3)
                  .map((v) => (
                    <p key={v.id} className="mt-2.5 text-sm leading-5">
                      <strong className="font-extrabold">{(v.user?.display_name || v.user?.username || "Alguém").split(" ")[0]}:</strong>{" "}
                      {v.description}
                    </p>
                  ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Photo({ url, className, alt }: { url: string; className: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} loading="lazy" className={`w-full bg-mt-chip object-cover ${className}`} />
  );
}

function PlaceSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-[1200px] px-4 pt-5 md:px-6">
      <div className="h-4 w-48 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
      <div className="mt-4 h-9 w-2/3 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
      <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
      <div className="mt-6 h-72 animate-pulse rounded-[20px] bg-mt-chip motion-reduce:animate-none" />
    </div>
  );
}
