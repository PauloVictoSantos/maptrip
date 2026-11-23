// Gera os 36 ícones de conquistas (12 conquistas × 3 níveis) em public/achievements/
// e o módulo React src/components/achievements/achievementIcons.ts.
// Uso: node scripts/achievement-icons.mjs
//
// Sistema (viewBox 64 × 64, fundo transparente, sem círculo externo — o app desenha o selo):
// - Linha do símbolo: traço 3,5 u, pontas e junções arredondadas, cor = currentColor.
// - Destaque: uma forma por símbolo, pintada ATRÁS da linha com var(--badge-accent, currentColor).
// - Área do símbolo: caixa de 28 × 28 u centrada em (32, 32) — igual em todos os ícones.
//
// Níveis (mesmo símbolo, a evolução é sempre a mesma):
// - comum: só a linha.
// - raro:  linha + destaque translúcido (25 %) + dois arcos de órbita na base.
// - epico: linha + destaque sólido + coroa de louros (arcos com folhas) + estrela de 4 pontas no topo.

import { mkdirSync, writeFileSync } from "node:fs";

const STROKE = 3.5;
const ACCENT = "var(--badge-accent, currentColor)";
const r1 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Símbolos: `line` = desenho em traço; `accent` = forma de destaque (preenchida).

/** Rosette with `n` rounded points for the verification seal. */
function rosette(cx, cy, rOut, rIn, n) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? rIn : rOut;
    const a = (Math.PI * i) / n - Math.PI / 2;
    pts.push(`${r1(cx + r * Math.cos(a))} ${r1(cy + r * Math.sin(a))}`);
  }
  return `M${pts.join("L")}Z`;
}

export const ACHIEVEMENTS = [
  {
    id: "primeira-visita",
    name: "Primeira visita",
    line: `<path d="M32 47s-12-11-12-20.5a12 12 0 0 1 24 0C44 36 32 47 32 47Z"/><circle cx="32" cy="26.5" r="4.5"/>`,
    accent: `<path d="M32 47s-12-11-12-20.5a12 12 0 0 1 24 0C44 36 32 47 32 47Z"/>`,
  },
  {
    id: "hospede",
    name: "Hóspede",
    line: `<path d="M18 45V21"/><path d="M18 37h28v8"/><path d="M29 37v-9h12a5 5 0 0 1 5 5v4"/><circle cx="23.5" cy="31.5" r="3"/>`,
    accent: `<path d="M29 37v-9h12a5 5 0 0 1 5 5v4Z"/>`,
  },
  {
    id: "cultura-em-dia",
    name: "Cultura em dia",
    line: `<path d="M18 26 32 18l14 8Z"/><path d="M18 45h28"/><path d="M22 30v11M29 30v11M35 30v11M42 30v11"/>`,
    accent: `<path d="M18 26 32 18l14 8Z"/>`,
  },
  {
    id: "amigo-da-natureza",
    name: "Amigo da natureza",
    line: `<path d="M32 46V30"/><path d="M32 34c-8 0-13-5-13-13 8 0 13 5 13 13Z"/><path d="M32 30c0-8 5-13 13-13 0 8-5 13-13 13Z"/>`,
    accent: `<path d="M32 34c-8 0-13-5-13-13 8 0 13 5 13 13Z"/><path d="M32 30c0-8 5-13 13-13 0 8-5 13-13 13Z"/>`,
  },
  {
    id: "bom-de-garfo",
    name: "Bom de garfo",
    line: `<path d="M22 18v9a5 5 0 0 0 10 0v-9"/><path d="M27 18v28"/><path d="M42 46V18c-4 2.5-5.5 7-5.5 12v5H42"/>`,
    accent: `<path d="M42 35V18c-4 2.5-5.5 7-5.5 12v5Z"/>`,
  },
  {
    id: "fotografo-de-viagem",
    name: "Fotógrafo de viagem",
    line: `<rect x="17" y="24" width="30" height="21" rx="4.5"/><path d="M25 24l3-5h8l3 5"/><circle cx="32" cy="34.5" r="6"/>`,
    accent: `<circle cx="32" cy="34.5" r="6"/>`,
  },
  {
    id: "explorador-assiduo",
    name: "Explorador assíduo",
    line: `<path d="M18 22.5l9.3-4 9.4 4 9.3-4v23l-9.3 4-9.4-4-9.3 4Z"/><path d="M27.3 18.5v23M36.7 22.5v23"/>`,
    accent: `<path d="M27.3 18.5l9.4 4v23l-9.4-4Z"/>`,
  },
  {
    id: "mapeia-acessibilidade",
    name: "Mapeia acessibilidade",
    line: `<circle cx="32" cy="32" r="15"/><circle cx="32" cy="23.5" r="1.6"/><path d="M24 28.5l8 1.5 8-1.5"/><path d="M32 30v6.5l-4.5 8.5M32 36.5l4.5 8.5"/>`,
    accent: `<circle cx="32" cy="32" r="15"/>`,
  },
  {
    id: "registro-completo",
    name: "Registro completo",
    line: `<path d="${rosette(32, 32, 15, 12.2, 9)}"/><path d="M25.5 32.5l4.5 4.5 8.5-9"/>`,
    accent: `<path d="${rosette(32, 32, 15, 12.2, 9)}"/>`,
  },
  {
    id: "desbravador-de-bairros",
    name: "Desbravador de bairros",
    line: `<path d="M22.4 39.2l6.9-12.6M35.4 25.9l6 5.2M23.9 42.6l14.8-6.7"/><circle cx="20.5" cy="42.5" r="3.5"/><circle cx="31" cy="23" r="3.5"/><circle cx="44" cy="34" r="3.5"/>`,
    accent: `<circle cx="20.5" cy="42.5" r="3.5"/><circle cx="31" cy="23" r="3.5"/><circle cx="44" cy="34" r="3.5"/>`,
  },
  {
    id: "cinquenta-visitas",
    name: "Cinquenta visitas",
    line: `<path d="M24 18h16v8.5a8 8 0 0 1-16 0Z"/><path d="M24 21h-3.5a4.5 4.5 0 0 0 4.5 7.5M40 21h3.5a4.5 4.5 0 0 1-4.5 7.5"/><path d="M32 34.5V40"/><path d="M26 45.5h12"/><path d="M28.5 40h7"/>`,
    accent: `<path d="M24 18h16v8.5a8 8 0 0 1-16 0Z"/>`,
  },
  {
    id: "guia-da-cidade",
    name: "Guia da cidade",
    line: `<circle cx="32" cy="32" r="14.5"/><path d="M32 22l4.5 10L32 42l-4.5-10Z"/>`,
    accent: `<path d="M32 22l4.5 10h-9Z"/>`,
  },
];

// ---------------------------------------------------------------------------
// Tier ornaments (identical for every achievement).

const polar = (r, deg) => [32 + r * Math.cos((deg * Math.PI) / 180), 32 + r * Math.sin((deg * Math.PI) / 180)];
function arc(r, from, to) {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 1 : 0;
  return `M${r1(x1)} ${r1(y1)}A${r} ${r} 0 ${large} ${sweep} ${r1(x2)} ${r1(y2)}`;
}
function leaf(r, deg, side) {
  const [x, y] = polar(r, deg);
  // leaf points outward-up along the wreath
  const rot = deg + (side === "left" ? 60 : -60) + 90;
  return `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="3.4" ry="1.5" transform="rotate(${r1(rot)} ${r1(x)} ${r1(y)})"/>`;
}

// Rare: two short orbit arcs cradling the symbol (bottom-left / bottom-right).
const RARE_ORBIT = `<g fill="none" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round"><path d="${arc(25, 118, 152)}"/><path d="${arc(25, 62, 28)}"/></g>`;

// Epic: laurel wreath (arcs + 3 leaves each side) and a 4-point star on top.
const EPIC_WREATH =
  `<g fill="none" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round"><path d="${arc(25, 104, 176)}"/><path d="${arc(25, 76, 4)}"/></g>` +
  `<g fill="${ACCENT}">${[122, 142, 162].map((d) => leaf(25, d, "left")).join("")}${[58, 38, 18].map((d) => leaf(25, d, "right")).join("")}` +
  `<path d="M32 2.8l1.7 3.9 3.9 1.7-3.9 1.7L32 14l-1.7-3.9-3.9-1.7 3.9-1.7Z"/></g>`;

export const TIERS = ["comum", "raro", "epico"];

/** Inner SVG markup for one icon (no <svg> wrapper). */
export function iconBody(a, tier) {
  const line = `<g fill="none" stroke="currentColor" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">${a.line}</g>`;
  if (tier === "comum") return line;
  const accent = `<g fill="${ACCENT}"${tier === "raro" ? ' fill-opacity="0.25"' : ""}>${a.accent}</g>`;
  return tier === "raro" ? RARE_ORBIT + accent + line : EPIC_WREATH + accent + line;
}

export function iconSvg(a, tier) {
  const label = `${a.name} — ${tier === "epico" ? "épico" : tier}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="${label}"><title>${label}</title>${iconBody(a, tier)}</svg>\n`;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/achievement-icons.mjs")) {
  mkdirSync("public/achievements", { recursive: true });
  let n = 0;
  for (const a of ACHIEVEMENTS) {
    for (const t of TIERS) {
      writeFileSync(`public/achievements/${a.id}-${t}.svg`, iconSvg(a, t));
      n++;
    }
  }
  // React data module (inline SVG so CSS controls color/accent).
  const data = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, { name: a.name, comum: iconBody(a, "comum"), raro: iconBody(a, "raro"), epico: iconBody(a, "epico") }]));
  writeFileSync(
    "src/components/achievements/achievementIcons.ts",
    `// GERADO por scripts/achievement-icons.mjs — não edite à mão.\n` +
      `export const ACHIEVEMENT_ICON_IDS = ${JSON.stringify(ACHIEVEMENTS.map((a) => a.id))} as const;\n` +
      `export type AchievementIconId = (typeof ACHIEVEMENT_ICON_IDS)[number];\n` +
      `export type AchievementTier = "comum" | "raro" | "epico";\n` +
      `export const ACHIEVEMENT_ICONS: Record<AchievementIconId, { name: string } & Record<AchievementTier, string>> = ${JSON.stringify(data, null, 2)};\n`
  );
  console.log(`Gerados ${n} SVG em public/achievements/ e src/components/achievements/achievementIcons.ts`);
}
