// Places are derived from visits: same name (normalized) within ~150 m.
import { QUESTIONS_BY_CATEGORY, type QuestionType } from "@/lib/questions";

export const PLACE_RADIUS_KM = 0.15;

export function placeHref(name: string, lat: number, lng: number): string {
  return `/lugar?${new URLSearchParams({ n: name, lat: lat.toFixed(5), lng: lng.toFixed(5) })}`;
}

/** Short labels for questionnaire keys (lib/questions.ts uses full questions). */
export const ANSWER_LABELS: Record<string, string> = {
  acessibilidade: "Acessível",
  tem_opcao_vegetariana: "Vegetariano",
  aceita_pet: "Pet-friendly",
  cobra_entrada: "Taxa de entrada",
  tem_banheiro: "Banheiro",
  tem_estacionamento: "Estacionamento",
  aceita_cartao: "Aceita cartão",
  aceita_pix: "Aceita Pix",
  tem_wifi: "Wi-fi",
  bom_para_criancas: "Bom para crianças",
  boa_para_criancas: "Bom para crianças",
  tem_delivery: "Delivery",
  tempo_espera: "Espera razoável",
  tem_quiosque: "Quiosque por perto",
  tem_sombra: "Sombra",
  movimentada: "Costuma lotar",
  tem_aluguel_cadeiras: "Aluguel de cadeiras",
  cafe_incluso: "Café incluso",
  tem_piscina: "Piscina",
  check_in_facil: "Check-in rápido",
  tem_ar_condicionado: "Ar-condicionado",
  precisa_guia: "Precisa de guia",
  sinal_celular: "Sinal de celular",
  atendimento: "Atendimento",
  ambiente: "Ambiente",
  acesso_facil: "Acesso",
  agua_limpa: "Água limpa",
  limpeza: "Limpeza",
  vista: "Vista",
  trilha_dificil: "Dificuldade",
  faixa_preco: "Faixa de preço",
  melhor_horario: "Melhor horário",
  melhor_epoca: "Melhor época",
};

/** Preference keys shown first, as bars. */
export const PREFERENCE_KEYS = ["acessibilidade", "tem_opcao_vegetariana", "aceita_pet"];
export const MIN_REPORTS = 3;

type QuestionMeta = { type: QuestionType; choices: Record<string, string> };
export const QUESTION_META: Record<string, QuestionMeta> = {};
for (const list of Object.values(QUESTIONS_BY_CATEGORY)) {
  for (const q of list) {
    const meta = (QUESTION_META[q.key] ??= { type: q.type, choices: {} });
    for (const c of q.choices ?? []) meta.choices[c.value] = c.label;
  }
}

export type AnswerSummary = {
  key: string;
  label: string;
  type: QuestionType;
  n: number;
  pct?: number; // boolean: share of "sim"
  avg?: number; // scale_1_5
  mode?: string; // choice value
  modeLabel?: string;
};

export function summarizeAnswers(rows: { question_key: string; answer_value: string }[]): AnswerSummary[] {
  const byKey = new Map<string, string[]>();
  for (const r of rows) {
    if (!QUESTION_META[r.question_key]) continue;
    const list = byKey.get(r.question_key) ?? [];
    list.push(r.answer_value);
    byKey.set(r.question_key, list);
  }
  const out: AnswerSummary[] = [];
  for (const [key, values] of byKey) {
    const meta = QUESTION_META[key];
    const label = ANSWER_LABELS[key] ?? key;
    if (meta.type === "boolean") {
      const valid = values.filter((v) => v === "sim" || v === "nao");
      if (!valid.length) continue;
      out.push({ key, label, type: "boolean", n: valid.length, pct: valid.filter((v) => v === "sim").length / valid.length });
    } else if (meta.type === "scale_1_5") {
      const nums = values.map(Number).filter((v) => v >= 1 && v <= 5);
      if (!nums.length) continue;
      out.push({ key, label, type: "scale_1_5", n: nums.length, avg: nums.reduce((a, b) => a + b, 0) / nums.length });
    } else {
      const counts: Record<string, number> = {};
      for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
      const [mode] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      out.push({ key, label, type: "choice", n: values.length, mode, modeLabel: meta.choices[mode] ?? mode });
    }
  }
  return out;
}

export type PlaceVisit = {
  id: string;
  title: string;
  description: string | null;
  rating: number;
  created_at: string;
  media_count: number;
  tags: string[];
  user: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
};

export type PlaceDetail = {
  name: string;
  category: string | null;
  lat: number;
  lng: number;
  rating: number;
  visits_count: number;
  photos: { url: string; post_id: string }[];
  summary: AnswerSummary[];
  visits: PlaceVisit[];
};
