// Gera os arquivos oficiais da marca MapTrip em public/brand/ e o favicon do app,
// a partir de uma única geometria.  Uso: node scripts/brand-logo.mjs
//
// Símbolo "Meridiano": um disco cortado no meridiano, com a metade direita deslocada
// 5u para baixo — o mundo rearranjado por onde você passou. O ponto dourado (o lugar)
// pousa no degrau que o deslocamento abre.
// Grade 48u · raio do disco 17u · vão do corte 2u · deslocamento 5u · ponto r 3,2u.

import { mkdirSync, writeFileSync } from "node:fs";

export const COLORS = {
  floresta: "#123D2C", // metade esquerda, placa do ícone
  mata: "#16845A", // metade direita
  ouro: "#C8A85C", // o ponto / lugar
  tinta: "#080A09", // nome e versão mono
  nevoa: "#F7F8F6", // fundo claro; metade esquerda sobre fundo escuro
  broto: "#6FC493", // metade direita sobre fundo escuro
};

export const GEOMETRY = {
  left: "M23 6a17 17 0 0 0 0 34Z", // semicírculo, centro (23,23)
  right: "M25 11a17 17 0 0 1 0 34Z", // semicírculo, centro (25,28)
  dot: { cx: 28.5, cy: 6.2, r: 3.2 },
};

/** Inner SVG of the symbol in a 48×48 box. */
export function mark({ left, right, dot, dotR = GEOMETRY.dot.r }) {
  const d = GEOMETRY.dot;
  return `<path d="${GEOMETRY.left}" fill="${left}"/><path d="${GEOMETRY.right}" fill="${right}"/><circle cx="${d.cx}" cy="${d.cy}" r="${dotR}" fill="${dot}"/>`;
}

export const LIGHT = { left: COLORS.floresta, right: COLORS.mata, dot: COLORS.ouro };
export const DARK = { left: COLORS.nevoa, right: COLORS.broto, dot: COLORS.ouro };
export const MONO = { left: "currentColor", right: "currentColor", dot: "currentColor" };

const svg = (viewBox, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="MapTrip"><title>MapTrip</title>${body}</svg>\n`;

const WORD = (x, y, size, fill, anchor = "start") =>
  `<text x="${x}" y="${y}" font-family="Geist, Inter, 'Segoe UI', system-ui, sans-serif" font-size="${size}" font-weight="600" letter-spacing="${(-size * 0.03).toFixed(2)}" fill="${fill}" text-anchor="${anchor}">maptrip</text>`;

/** App icon / favicon: Floresta tile, symbol at 80 %, bigger dot for tiny sizes. */
export const tile = (dotR = 3.2) =>
  `<rect width="48" height="48" rx="11" fill="${COLORS.floresta}"/><g transform="translate(4.8 4.8) scale(.8)">${mark({ ...DARK, dotR })}</g>`;

export const FILES = {
  "maptrip-simbolo.svg": svg("0 0 48 48", mark(LIGHT)),
  "maptrip-simbolo-fundo-escuro.svg": svg("0 0 48 48", mark(DARK)),
  "maptrip-simbolo-mono.svg": svg("0 0 48 48", mark(MONO)),
  "maptrip-logo-horizontal.svg": svg("0 0 184 48", mark(LIGHT) + WORD(56, 34.5, 30, COLORS.tinta)),
  "maptrip-logo-horizontal-fundo-escuro.svg": svg("0 0 184 48", mark(DARK) + WORD(56, 34.5, 30, "#FFFFFF")),
  "maptrip-logo-horizontal-mono.svg": svg("0 0 184 48", mark(MONO) + WORD(56, 34.5, 30, "currentColor")),
  "maptrip-logo-vertical.svg": svg("0 0 160 128", `<g transform="translate(44 0) scale(1.5)">${mark(LIGHT)}</g>` + WORD(80, 120, 30, COLORS.tinta, "middle")),
  "maptrip-logo-vertical-fundo-escuro.svg": svg("0 0 160 128", `<g transform="translate(44 0) scale(1.5)">${mark(DARK)}</g>` + WORD(80, 120, 30, "#FFFFFF", "middle")),
  "maptrip-icone-app.svg": svg("0 0 48 48", tile()),
  "favicon.svg": svg("0 0 48 48", tile(3.8)),
};

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/brand-logo.mjs")) {
  mkdirSync("public/brand", { recursive: true });
  for (const [name, content] of Object.entries(FILES)) writeFileSync(`public/brand/${name}`, content);
  // Next.js App Router picks this up as the site favicon.
  writeFileSync("src/app/icon.svg", FILES["favicon.svg"]);
  console.log(`Gerados ${Object.keys(FILES).length} arquivos em public/brand/ e src/app/icon.svg`);
}
