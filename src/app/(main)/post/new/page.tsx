"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, Camera, Check, Globe, Lock, Users, X } from "lucide-react";
import { ImageUpload } from "@/components/post/ImageUpload";
import { PlaceQuestionnaire } from "@/components/post/PlaceQuestionnaire";
import { Spinner } from "@/components/ui/Spinner";
import { CATEGORY_GROUPS, groupFor } from "@/components/map/categories";
import { POST_CATEGORIES } from "@/lib/types";
import { getQuestionsForCategory } from "@/lib/questions";
import { LEVEL_MAX, MIN_COMMENT_CHARS, computePoints, levelFor } from "@/lib/points";

const LocationPicker = dynamic(
  () => import("@/components/post/LocationPicker").then((mod) => mod.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-2xl bg-mt-chip">
        <p className="text-sm text-mt-muted">Carregando mapa…</p>
      </div>
    ),
  }
);

type Visibility = "public" | "friends" | "private";
type StepId = "lugar" | "nota" | "fotos" | "detalhes" | "revisar";

const STEPS: { id: StepId; label: string; hint: string }[] = [
  { id: "lugar", label: "Lugar", hint: "Obrigatório" },
  { id: "nota", label: "Nota e visibilidade", hint: "Obrigatório" },
  { id: "fotos", label: "Fotos e comentário", hint: "Opcional · até +20 pts" },
  { id: "detalhes", label: "Detalhes do lugar", hint: "Opcional · até +40 pts" },
  { id: "revisar", label: "Revisar e publicar", hint: "" },
];

const RATING_LABELS = ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"];

const VISIBILITY_OPTIONS: { value: Visibility; label: string; text: string; icon: typeof Globe }[] = [
  { value: "public", label: "Pública", text: "Feed, mapa da comunidade e página do lugar", icon: Globe },
  { value: "friends", label: "Amigos", text: "Só seus amigos veem no feed e no mapa", icon: Users },
  { value: "private", label: "Privada", text: "Só você, no seu mapa pessoal", icon: Lock },
];

const DRAFT_KEY = "maptrip:visit-draft";

type FormState = {
  title: string;
  description: string;
  rating: number;
  lat: number | null;
  lng: number | null;
  place_name: string;
  category: string;
  visibility: Visibility;
  visit_date: string;
};

type Draft = { form: FormState; images: string[]; answers: Record<string, string>; stepIndex: number };

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  rating: 0,
  lat: null,
  lng: null,
  place_name: "",
  category: "",
  visibility: "public",
  visit_date: "",
};

export default function NewVisitPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [images, setImages] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIndex];
  const questions = useMemo(() => getQuestionsForCategory(form.category || null), [form.category]);
  const answeredCount = questions.filter((q) => answers[q.key] !== undefined).length;
  const points = computePoints({
    imageCount: images.length,
    comment: form.description,
    category: form.category,
    answeredCount,
  });
  const level = levelFor(points.total);

  const hasPlace = form.lat != null && form.lng != null && !!form.place_name;
  const hasRating = form.rating > 0;

  // ---- Prefill (from the map) or restore draft ---------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get("lat") ?? "");
    const lng = parseFloat(params.get("lng") ?? "");
    const place = params.get("place");

    if (Number.isFinite(lat) && Number.isFinite(lng) && place) {
      const category = params.get("category") ?? "";
      setForm({
        ...EMPTY_FORM,
        lat,
        lng,
        place_name: place,
        category: POST_CATEGORIES.some((c) => c.value === category) ? category : "",
        visit_date: today(),
      });
      setStepIndex(1);
    } else {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        const draft = raw ? (JSON.parse(raw) as Draft) : null;
        if (draft?.form) {
          setForm({ ...EMPTY_FORM, ...draft.form });
          setImages(Array.isArray(draft.images) ? draft.images : []);
          setAnswers(draft.answers ?? {});
          setStepIndex(Math.min(Math.max(draft.stepIndex ?? 0, 0), STEPS.length - 1));
          setDraftRestored(true);
        } else {
          setForm((f) => ({ ...f, visit_date: today() }));
        }
      } catch {
        setForm((f) => ({ ...f, visit_date: today() }));
      }
    }
    setHydrated(true);
  }, []);

  // ---- Autosave draft -----------------------------------------------------
  useEffect(() => {
    if (!hydrated || publishing) return;
    const t = window.setTimeout(() => {
      try {
        const draft: Draft = { form, images, answers, stepIndex };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setDraftSaved(true);
      } catch {
        setDraftSaved(false);
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [form, images, answers, stepIndex, hydrated, publishing]);

  // Reset scroll when the step changes
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [stepIndex]);

  // Escape closes (draft is kept)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !publishing) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishing]);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  }

  function close() {
    if (window.history.length > 1) router.back();
    else router.push("/map");
  }

  function discardDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setForm({ ...EMPTY_FORM, visit_date: today() });
    setImages([]);
    setAnswers({});
    setStepIndex(0);
    setDraftRestored(false);
  }

  /** A step is reachable once every required step before it is complete. */
  function canReach(index: number) {
    if (index >= 1 && !hasPlace) return false;
    if (index >= 2 && !hasRating) return false;
    return true;
  }

  function stepDone(id: StepId) {
    switch (id) {
      case "lugar":
        return hasPlace;
      case "nota":
        return hasRating;
      case "fotos":
        return points.photos + points.comment > 0;
      case "detalhes":
        return points.type + points.details > 0;
      default:
        return false;
    }
  }

  function stepSubtitle(id: StepId, hint: string) {
    if (id === "lugar" && hasPlace) return form.place_name;
    if (id === "nota" && hasRating) {
      const vis = VISIBILITY_OPTIONS.find((v) => v.value === form.visibility)?.label;
      return `${form.rating} ${form.rating === 1 ? "estrela" : "estrelas"} · ${vis}`;
    }
    if (id === "fotos" && points.photos + points.comment > 0) return `+${points.photos + points.comment} pts`;
    if (id === "detalhes" && points.type + points.details > 0) return `+${points.type + points.details} pts`;
    return hint;
  }

  function goTo(index: number) {
    if (index === 1 && !hasPlace) return setError("Escolha o lugar da visita.");
    if (index >= 2 && !hasRating) return setError("Dê uma nota de 1 a 5.");
    setError("");
    setStepIndex(index);
  }

  async function publish() {
    if (!hasPlace) {
      setStepIndex(0);
      return setError("Escolha o lugar da visita.");
    }
    if (!hasRating) {
      setStepIndex(1);
      return setError("Dê uma nota de 1 a 5.");
    }

    setPublishing(true);
    setError("");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim() || form.place_name,
          description: form.description.trim() || null,
          rating: form.rating,
          lat: form.lat,
          lng: form.lng,
          place_name: form.place_name,
          category: form.category || null,
          visibility: form.visibility,
          visit_date: form.visit_date || null,
          media_urls: images,
          answers,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Não foi possível publicar. Tente novamente.");
        setPublishing(false);
        return;
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      router.push("/feed");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setPublishing(false);
    }
  }

  const group = groupFor(form.category || null);
  const groupStyle = CATEGORY_GROUPS[group];
  const meterPct = Math.min(100, Math.round((points.total / LEVEL_MAX) * 100));
  const levelHint = level.next
    ? points.total === points.base
      ? `Fotos e detalhes levam a ${level.next.label}`
      : `Faltam ${level.missing} pts para ${level.next.label}`
    : "Nível máximo. Obrigado pela ajuda!";

  return (
    <div className="fixed inset-0 z-[60] flex bg-mt-land font-sans text-mt-ink md:items-center md:justify-center md:p-6">
      <div aria-hidden="true" className="absolute inset-0 hidden bg-[rgba(20,32,43,0.55)] md:block" onClick={close} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-registro"
        className="relative flex h-full w-full flex-col overflow-hidden bg-white md:h-auto md:max-h-[calc(100dvh-3rem)] md:max-w-[980px] md:flex-row md:rounded-3xl md:shadow-[0_24px_60px_rgba(20,32,43,0.35)]"
      >
        {/* ---------------- Steps (desktop) ---------------- */}
        <aside className="hidden w-[280px] shrink-0 flex-col gap-5 overflow-y-auto bg-mt-bg px-6 py-7 md:flex">
          <div>
            <h1 id="titulo-registro" className="text-[22px] font-extrabold tracking-[-0.3px]">
              Registrar visita
            </h1>
            <p className="mt-1 text-[13px] text-mt-muted">Só lugar, nota e visibilidade são obrigatórios.</p>
          </div>

          <ol className="flex flex-col gap-1">
            {STEPS.map((s, i) => {
              const current = i === stepIndex;
              const done = !current && stepDone(s.id);
              const reachable = canReach(i);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    disabled={!reachable}
                    aria-current={current ? "step" : undefined}
                    className={`-mx-2.5 flex w-[calc(100%+1.25rem)] gap-3 rounded-xl px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed ${
                      current ? "bg-white shadow-[0_1px_4px_rgba(20,32,43,0.08)]" : "enabled:hover:bg-white/60"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
                        done
                          ? "bg-mt-teal text-white"
                          : current
                          ? "border-2 border-mt-teal text-mt-teal-dark"
                          : "border-2 border-[#8A938E] text-mt-muted"
                      }`}
                    >
                      {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm ${current ? "font-extrabold" : "font-bold"}`}>{s.label}</span>
                      {stepSubtitle(s.id, s.hint) && (
                        <span className="mt-0.5 block truncate text-xs text-mt-muted">
                          {stepSubtitle(s.id, s.hint)}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <PointsMeter total={points.total} label={level.label} pct={meterPct} hint={levelHint} />

          <div className="mt-auto space-y-2 text-xs font-semibold text-mt-muted">
            {draftRestored && (
              <p>
                Rascunho recuperado ·{" "}
                <button type="button" onClick={discardDraft} className="font-bold text-mt-teal-dark hover:underline">
                  Descartar
                </button>
              </p>
            )}
            {draftSaved && (
              <p className="flex items-center gap-1.5">
                <Check size={14} strokeWidth={2.6} className="text-[#2B8A3E]" aria-hidden="true" />
                Rascunho salvo automaticamente
              </p>
            )}
          </div>
        </aside>

        {/* ---------------- Step content ---------------- */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Mobile header */}
          <div className="flex items-center gap-3 border-b border-mt-line px-4 py-3 md:hidden">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-extrabold leading-tight">Registrar visita</p>
              <p className="mt-0.5 text-xs text-mt-muted">
                Etapa {stepIndex + 1} de {STEPS.length} · {step.label}
              </p>
            </div>
            <span className="rounded-full bg-[#FDF0E3] px-2.5 py-1 text-xs font-extrabold text-[#9A4508]">
              {points.total} pts · {level.label}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mt-chip"
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>
          <div aria-hidden="true" className="flex gap-1 px-4 pt-2 md:hidden">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-mt-teal" : "bg-mt-line"}`}
              />
            ))}
          </div>

          <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-7">
            {/* Place summary + close (desktop) */}
            <div className="flex items-center gap-3">
              {step.id === "lugar" ? (
                <h2 className="flex-1 text-lg font-extrabold">Onde você esteve?</h2>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-mt-line p-2.5">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: groupStyle.soft, color: groupStyle.color }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {groupStyle.paths.map((d) => (
                        <path key={d} d={d} />
                      ))}
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-extrabold">{form.place_name}</span>
                    <span className="mt-0.5 block text-[13px] text-mt-muted">
                      {form.category
                        ? POST_CATEGORIES.find((c) => c.value === form.category)?.label
                        : "Tipo ainda não informado"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => goTo(0)}
                    className="h-10 rounded-[10px] px-3 text-sm font-bold text-mt-teal-dark hover:bg-mt-teal-soft"
                  >
                    Trocar
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="Fechar"
                className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mt-chip hover:bg-mt-line md:flex"
              >
                <X size={20} strokeWidth={2.2} />
              </button>
            </div>

            <div className="mt-6">
              {step.id === "lugar" && (
                <div className="[&_.h-56]:h-72">
                  <LocationPicker
                    lat={form.lat}
                    lng={form.lng}
                    placeName={form.place_name}
                    onSelect={(lat, lng, name) => {
                      setForm((f) => ({ ...f, lat, lng, place_name: name }));
                      setError("");
                    }}
                  />
                </div>
              )}

              {step.id === "nota" && (
                <>
                  <div className="flex flex-wrap gap-x-10 gap-y-6">
                    <div>
                      <h2 id="nota-label" className="text-base font-extrabold">
                        Como foi a visita?
                      </h2>
                      <div role="group" aria-labelledby="nota-label" className="mt-2.5 flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => {
                          const filled = n <= form.rating;
                          return (
                            <button
                              key={n}
                              type="button"
                              aria-label={n === 1 ? "1 estrela" : `${n} estrelas`}
                              aria-pressed={n === form.rating}
                              onClick={() => update("rating", n)}
                              className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#F7F8F6] transition-transform hover:bg-mt-chip active:scale-95 motion-reduce:transition-none"
                            >
                              <svg
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill={filled ? "#E8590C" : "none"}
                                stroke={filled ? "#E8590C" : "#8A938E"}
                                strokeWidth={1.6}
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            </button>
                          );
                        })}
                      </div>
                      <div aria-live="polite" className="mt-2 min-h-5 text-sm font-bold text-[#9A4508]">
                        {form.rating ? RATING_LABELS[form.rating] : <span className="font-semibold text-mt-muted">Escolha de 1 a 5 estrelas</span>}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="data-visita" className="block text-base font-extrabold">
                        Data da visita
                      </label>
                      <input
                        id="data-visita"
                        type="date"
                        value={form.visit_date}
                        max={today()}
                        onChange={(e) => update("visit_date", e.target.value)}
                        className="mt-2.5 h-[52px] rounded-[14px] border-[1.5px] border-mt-line-strong bg-white px-3.5 text-[15px] text-mt-ink focus:border-mt-teal focus:outline-none focus:ring-2 focus:ring-mt-teal-soft"
                      />
                    </div>
                  </div>

                  <h2 id="vis-label" className="mt-6 text-base font-extrabold">
                    Quem pode ver?
                  </h2>
                  <div role="radiogroup" aria-labelledby="vis-label" className="mt-2.5 flex flex-wrap gap-2.5">
                    {VISIBILITY_OPTIONS.map((opt) => {
                      const active = form.visibility === opt.value;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => update("visibility", opt.value)}
                          className={`relative flex flex-[1_1_180px] flex-col items-start gap-2 rounded-2xl border-2 p-3.5 text-left transition-colors ${
                            active ? "border-mt-teal bg-[#F2FAFA]" : "border-mt-line bg-white hover:border-mt-line-strong"
                          }`}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mt-teal-soft text-mt-teal-dark">
                            <Icon size={20} aria-hidden="true" />
                          </span>
                          <span className="text-[15px] font-extrabold">{opt.label}</span>
                          <span className="pr-6 text-[13px] leading-[18px] text-mt-muted">{opt.text}</span>
                          <span
                            aria-hidden="true"
                            className={`absolute right-3.5 top-3.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                              active ? "border-mt-teal" : "border-[#8A938E]"
                            }`}
                          >
                            {active && <span className="h-2.5 w-2.5 rounded-full bg-mt-teal" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step.id === "fotos" && (
                <div className="space-y-6">
                  <section>
                    <h2 className="text-base font-extrabold">Fotos</h2>
                    <p className="mt-1 text-[13px] text-mt-muted">+5 pts na primeira e +2 por foto extra (até +15).</p>
                    <div className="mt-3">
                      <ImageUpload images={images} onChange={setImages} maxImages={10} />
                    </div>
                  </section>
                  <section>
                    <label htmlFor="comentario" className="block text-base font-extrabold">
                      Comentário
                    </label>
                    <p className="mt-1 text-[13px] text-mt-muted">
                      +5 pts com {MIN_COMMENT_CHARS} caracteres ou mais.
                    </p>
                    <textarea
                      id="comentario"
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="Conte como foi: o que valeu a pena, o que evitar…"
                      rows={4}
                      maxLength={2000}
                      className="mt-3 w-full resize-none rounded-[14px] border-[1.5px] border-mt-line-strong px-3.5 py-3 text-[15px] focus:border-mt-teal focus:outline-none focus:ring-2 focus:ring-mt-teal-soft"
                    />
                    <p className="mt-1 text-right text-xs text-mt-muted">{form.description.length}/2000</p>
                  </section>
                  <section>
                    <label htmlFor="titulo" className="block text-base font-extrabold">
                      Título <span className="text-[13px] font-semibold text-mt-muted">(opcional)</span>
                    </label>
                    <input
                      id="titulo"
                      type="text"
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                      placeholder={form.place_name || "Ex.: Pôr do sol na Ponta Negra"}
                      maxLength={200}
                      className="mt-3 h-12 w-full rounded-[14px] border-[1.5px] border-mt-line-strong px-3.5 text-[15px] focus:border-mt-teal focus:outline-none focus:ring-2 focus:ring-mt-teal-soft"
                    />
                  </section>
                </div>
              )}

              {step.id === "detalhes" && (
                <div className="space-y-6">
                  <section>
                    <h2 id="tipo-label" className="text-base font-extrabold">
                      Tipo de lugar
                    </h2>
                    <p className="mt-1 text-[13px] text-mt-muted">+3 pts. Também libera perguntas sobre o lugar.</p>
                    <div role="group" aria-labelledby="tipo-label" className="mt-3 flex flex-wrap gap-2">
                      {POST_CATEGORIES.map((cat) => {
                        const active = form.category === cat.value;
                        return (
                          <button
                            key={cat.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => update("category", active ? "" : cat.value)}
                            className={`flex h-9 items-center gap-1 rounded-full border px-3.5 text-[13px] transition-colors ${
                              active
                                ? "border-mt-teal bg-mt-teal-soft font-bold text-mt-teal-dark"
                                : "border-mt-line-strong bg-white font-semibold hover:bg-mt-chip"
                            }`}
                          >
                            {active && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                  {questions.length > 0 ? (
                    <section>
                      <p className="mb-3 text-[13px] text-mt-muted">+3 pts por resposta (até +37).</p>
                      <PlaceQuestionnaire
                        category={form.category || null}
                        answers={answers}
                        onChange={(key, value) => setAnswers((a) => ({ ...a, [key]: value }))}
                      />
                    </section>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-mt-line-strong px-4 py-6 text-center text-sm text-mt-muted">
                      Escolha o tipo de lugar para ver perguntas rápidas sobre ele.
                    </p>
                  )}
                </div>
              )}

              {step.id === "revisar" && (
                <div className="space-y-4">
                  <h2 className="text-base font-extrabold">Confira antes de publicar</h2>
                  <dl className="divide-y divide-mt-line rounded-2xl border border-mt-line">
                    <ReviewRow label="Nota" value={`${form.rating} de 5 · ${RATING_LABELS[form.rating]}`} onEdit={() => goTo(1)} />
                    <ReviewRow
                      label="Visibilidade"
                      value={VISIBILITY_OPTIONS.find((v) => v.value === form.visibility)?.label ?? ""}
                      onEdit={() => goTo(1)}
                    />
                    <ReviewRow
                      label="Data"
                      value={form.visit_date ? new Date(`${form.visit_date}T12:00:00`).toLocaleDateString("pt-BR") : "Não informada"}
                      onEdit={() => goTo(1)}
                    />
                    <ReviewRow
                      label="Fotos e comentário"
                      value={`${images.length} ${images.length === 1 ? "foto" : "fotos"} · ${
                        form.description.trim() ? "com comentário" : "sem comentário"
                      }`}
                      onEdit={() => goTo(2)}
                    />
                    <ReviewRow
                      label="Detalhes"
                      value={
                        form.category
                          ? `${POST_CATEGORIES.find((c) => c.value === form.category)?.label} · ${answeredCount}/${questions.length} respostas`
                          : "Nenhum detalhe"
                      }
                      onEdit={() => goTo(3)}
                    />
                  </dl>
                  <div className="md:hidden">
                    <PointsMeter total={points.total} label={level.label} pct={meterPct} hint={levelHint} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ---------------- Footer ---------------- */}
          {error && (
            <div role="alert" className="mx-4 mb-2 rounded-xl border border-[#F5C2C2] bg-[#FFF0F0] px-4 py-2.5 text-sm font-semibold text-[#B42323] md:mx-8">
              {error}
            </div>
          )}
          <footer className="flex flex-wrap items-center gap-3 border-t border-mt-line px-4 py-3 md:mx-8 md:px-0 md:py-5">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => goTo(stepIndex - 1)}
                aria-label="Voltar"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-mt-chip hover:bg-mt-line md:hidden"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <span className="hidden text-[13px] text-mt-muted md:inline">
              {stepIndex < STEPS.length - 1 ? `Próximo: ${STEPS[stepIndex + 1].label.toLowerCase()}` : "Tudo pronto"}
              {stepIndex >= 1 && stepIndex < STEPS.length - 2 ? " (opcional)" : ""}
            </span>
            <div className="ml-auto flex flex-1 flex-wrap justify-end gap-2.5 md:flex-none">
              {step.id === "lugar" && (
                <PrimaryButton onClick={() => goTo(1)} disabled={!hasPlace}>
                  Continuar
                </PrimaryButton>
              )}
              {step.id === "nota" && (
                <SecondaryButton onClick={() => goTo(2)}>
                  <Camera size={18} strokeWidth={2.2} aria-hidden="true" />
                  Adicionar fotos e detalhes
                </SecondaryButton>
              )}
              {step.id === "fotos" && <SecondaryButton onClick={() => goTo(3)}>Detalhes do lugar</SecondaryButton>}
              {step.id === "detalhes" && <SecondaryButton onClick={() => goTo(4)}>Revisar</SecondaryButton>}
              {step.id !== "lugar" && (
                <PrimaryButton onClick={publish} disabled={publishing}>
                  {publishing ? <Spinner size={18} className="text-white" /> : "Publicar"}
                </PrimaryButton>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PointsMeter({ total, label, pct, hint }: { total: number; label: string; pct: number; hint: string }) {
  return (
    <div className="rounded-[14px] bg-[#FDF0E3] px-3.5 py-3 text-[#9A4508]">
      <div className="flex items-baseline gap-1.5" aria-live="polite">
        <span className="text-lg font-extrabold">{total} pts</span>
        <span className="text-[13px] font-semibold">· {label}</span>
      </div>
      <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(154,69,8,0.15)]">
        <div
          className="h-1.5 rounded-full bg-[#E8590C] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 text-xs font-semibold">{hint}</div>
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-bold uppercase tracking-[0.4px] text-mt-muted">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-semibold">{value}</dd>
      </div>
      <button type="button" onClick={onEdit} className="h-9 rounded-[10px] px-3 text-sm font-bold text-mt-teal-dark hover:bg-mt-teal-soft">
        Editar
      </button>
    </div>
  );
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-12 min-w-[120px] items-center justify-center gap-2 rounded-full bg-mt-teal px-7 text-[15px] font-bold text-white hover:bg-mt-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-12 items-center gap-2 rounded-full border-[1.5px] border-mt-teal px-5 text-[15px] font-bold text-mt-teal-dark hover:bg-mt-teal-soft"
    >
      {children}
    </button>
  );
}
