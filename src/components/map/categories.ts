// Visual category groups used by the map (pins, list, legend, place card).
// Post categories are finer-grained; each one maps to a single group so the
// map stays readable with a small, consistent color legend.

export type CategoryGroup =
  | "restaurante"
  | "atracao"
  | "natureza"
  | "hospedagem"
  | "compras"
  | "outro";

type GroupStyle = {
  label: string;
  color: string; // pin / tile background
  soft: string; // badge + card header background
  softText: string; // badge text (AA on `soft`)
  categories: string[]; // post categories in this group
  paths: string[]; // 24x24 stroke icon paths (lucide)
};

export const CATEGORY_GROUPS: Record<CategoryGroup, GroupStyle> = {
  restaurante: {
    label: "Restaurante",
    color: "#D9480F",
    soft: "#FDEBE1",
    softText: "#A8380B",
    categories: ["restaurante", "bar", "cafe"],
    paths: [
      "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2",
      "M7 2v20",
      "M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7",
    ],
  },
  atracao: {
    label: "Atração",
    color: "#7048E8",
    soft: "#EFEAFD",
    softText: "#5A35C9",
    categories: ["museu", "monumento"],
    paths: ["M3 22h18", "M6 18v-7", "M10 18v-7", "M14 18v-7", "M18 18v-7", "M12 2 20 7H4Z"],
  },
  natureza: {
    label: "Natureza",
    color: "#2B8A3E",
    soft: "#E3F2E6",
    softText: "#22702F",
    categories: ["parque", "trilha", "praia"],
    paths: [
      "M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z",
      "M7 16v6",
      "M13 19v3",
      "M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5",
    ],
  },
  hospedagem: {
    label: "Hospedagem",
    color: "#1971C2",
    soft: "#E1EEFA",
    softText: "#155A9C",
    categories: ["hotel"],
    paths: ["M2 4v16", "M2 8h18a2 2 0 0 1 2 2v10", "M2 17h20", "M6 8v9"],
  },
  compras: {
    label: "Compras",
    color: "#C2255C",
    soft: "#FBE4EE",
    softText: "#9C1D4A",
    categories: ["compras"],
    paths: ["M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z", "M3 6h18", "M16 10a4 4 0 0 1-8 0"],
  },
  outro: {
    label: "Outro",
    color: "#5B6670",
    soft: "#F1F3F1",
    softText: "#3D4A53",
    categories: ["outro"],
    paths: ["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z", "M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"],
  },
};

export const GROUP_ORDER: CategoryGroup[] = [
  "restaurante",
  "atracao",
  "natureza",
  "hospedagem",
  "compras",
  "outro",
];

export function groupFor(category: string | null | undefined): CategoryGroup {
  if (category) {
    for (const key of GROUP_ORDER) {
      if (CATEGORY_GROUPS[key].categories.includes(category)) return key;
    }
  }
  return "outro";
}

/** Inline SVG markup for a group icon (for Leaflet divIcons, which take raw HTML). */
export function groupIconSvg(group: CategoryGroup, size: number, strokeWidth = 2.4): string {
  const paths = CATEGORY_GROUPS[group].paths.map((d) => `<path d="${d}"></path>`).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function formatRatingBR(rating: number): string {
  return rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
