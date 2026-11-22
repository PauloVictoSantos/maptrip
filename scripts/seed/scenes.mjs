// Illustrated scenes (SVG → JPEG via sharp) for the Manaus seed data.
// Each scene takes a random generator and a time of day, so photos of the
// same place still look different from each other.

export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];
const between = (r, a, b) => a + r() * (b - a);

const SKIES = {
  day: ["#6FBDEB", "#D4F0FB"],
  morning: ["#9FD3F2", "#FFF1D6"],
  sunset: ["#E9784F", "#FCD39B"],
  night: ["#0D1530", "#2E4473"],
};

function sky(time, id = "sky") {
  const [a, b] = SKIES[time] ?? SKIES.day;
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1200" height="800" fill="url(#${id})"/>`;
}

function sunOrMoon(r, time) {
  const x = between(r, 150, 1050);
  if (time === "night") {
    const stars = Array.from({ length: 40 }, () => `<circle cx="${between(r, 0, 1200)}" cy="${between(r, 0, 380)}" r="${between(r, 1, 2.6)}" fill="#fff" opacity="${between(r, 0.4, 0.9)}"/>`).join("");
    return `${stars}<circle cx="${x}" cy="${between(r, 90, 170)}" r="42" fill="#F6F1D3"/>`;
  }
  if (time === "sunset") return `<circle cx="${x}" cy="${between(r, 330, 420)}" r="80" fill="#FFD27A" opacity="0.95"/>`;
  return `<circle cx="${x}" cy="${between(r, 90, 160)}" r="56" fill="#FFF3B0" opacity="0.9"/>`;
}

function clouds(r, time) {
  if (time === "night") return "";
  return Array.from({ length: 3 + Math.floor(r() * 3) }, () => {
    const x = between(r, -50, 1150);
    const y = between(r, 60, 260);
    const s = between(r, 0.7, 1.4);
    return `<g opacity="0.85" fill="#fff" transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="70" ry="24"/><ellipse cx="45" cy="-14" rx="48" ry="26"/><ellipse cx="-40" cy="-8" rx="40" ry="20"/></g>`;
  }).join("");
}

function palm(x, y, s = 1, dark = false) {
  const trunk = dark ? "#3B2A20" : "#7A5A3C";
  const leaf = dark ? "#16341F" : "#2F7D3B";
  const leaves = [-70, -35, 0, 35, 70, 110, -110]
    .map((a) => `<path d="M0 0 Q ${60 * Math.sin((a * Math.PI) / 180)} ${-40} ${120 * Math.sin((a * Math.PI) / 180)} ${30 - 40 * Math.cos((a * Math.PI) / 180)}" stroke="${leaf}" stroke-width="16" fill="none" stroke-linecap="round"/>`)
    .join("");
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 0 Q 10 120 0 260 L 16 260 Q 24 120 8 0 Z" fill="${trunk}"/><g transform="translate(2 0)">${leaves}</g></g>`;
}

function tree(x, y, s, color) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-8" y="0" width="16" height="90" fill="#6B4B32"/><circle cx="0" cy="-20" r="70" fill="${color}"/><circle cx="-45" cy="10" r="48" fill="${color}"/><circle cx="48" cy="6" r="52" fill="${color}"/></g>`;
}

const night = (t) => t === "night";
const windowColor = (t, r) => (night(t) ? pick(r, ["#FFD86B", "#FFE9A6", "#F4B860", "#2B3550"]) : pick(r, ["#BFE3F5", "#9FCFEA", "#D6EEF9"]));

// ---------------------------------------------------------------------------
// Landmarks
// ---------------------------------------------------------------------------

function theatre(r, t) {
  const tiles = ["#2F8F4E", "#F2C230", "#2C6FB7"];
  const stripes = Array.from({ length: 26 }, (_, i) => `<rect x="${450 + i * 12}" y="160" width="12" height="200" fill="${tiles[i % 3]}"/>`).join("");
  const columns = Array.from({ length: 8 }, (_, i) => `<rect x="${410 + i * 52}" y="430" width="22" height="190" fill="#FBF4EC"/>`).join("");
  const wave = Array.from({ length: 9 }, (_, i) => `<path d="M0 ${690 + i * 14} Q 150 ${670 + i * 14} 300 ${690 + i * 14} T 600 ${690 + i * 14} T 900 ${690 + i * 14} T 1200 ${690 + i * 14}" stroke="${i % 2 ? "#1E1E1E" : "#F5F1EA"}" stroke-width="10" fill="none"/>`).join("");
  return `${sky(t)}${sunOrMoon(r, t)}${clouds(r, t)}
  <rect x="0" y="620" width="1200" height="180" fill="#D9D2C5"/>
  <rect x="300" y="380" width="600" height="250" fill="${night(t) ? "#B97E86" : "#E9A6AE"}"/>
  <polygon points="380,430 600,330 820,430" fill="#F6E6E2"/>
  ${columns}
  <rect x="300" y="620" width="600" height="18" fill="#C9BFB2"/><rect x="330" y="638" width="540" height="14" fill="#BDB2A4"/>
  <defs><clipPath id="dome"><path d="M450 360 Q 450 170 600 160 Q 750 170 750 360 Z"/></clipPath></defs>
  <g clip-path="url(#dome)">${stripes}</g>
  <path d="M450 360 Q 450 170 600 160 Q 750 170 750 360" fill="none" stroke="#E8D9A8" stroke-width="6"/>
  <rect x="585" y="120" width="30" height="45" fill="#F6E6E2"/><circle cx="600" cy="112" r="12" fill="#E8D9A8"/>
  ${night(t) ? `<rect x="300" y="380" width="600" height="250" fill="#FFD27A" opacity="0.12"/>` : ""}
  ${wave}
  ${palm(between(r, 90, 200), 420, between(r, 0.9, 1.15), night(t))}${palm(between(r, 1000, 1110), 430, between(r, 0.85, 1.1), night(t))}`;
}

function palace(r, t, body = "#F3E3B5") {
  const wins = [];
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 9; i++) wins.push(`<rect x="${300 + i * 68}" y="${400 + row * 110}" width="34" height="62" rx="16" fill="${windowColor(t, r)}"/>`);
  return `${sky(t)}${sunOrMoon(r, t)}${clouds(r, t)}
  <rect x="0" y="640" width="1200" height="160" fill="#7FB069"/>
  <rect x="270" y="360" width="660" height="290" fill="${body}"/>
  <rect x="250" y="340" width="700" height="28" fill="#FFFFFF" opacity="0.85"/>
  <polygon points="520,340 600,290 680,340" fill="#FFFFFF" opacity="0.9"/>
  ${wins.join("")}
  <rect x="570" y="560" width="60" height="90" fill="#6B4B32"/>
  <rect x="0" y="650" width="1200" height="20" fill="#5D8F4D"/>
  ${tree(between(r, 80, 180), 560, 1.1, "#3E8E41")}${tree(between(r, 1020, 1120), 570, 1, "#357A38")}
  ${Array.from({ length: 6 }, (_, i) => `<circle cx="${200 + i * 160}" cy="${700 + between(r, -10, 10)}" r="${between(r, 16, 26)}" fill="${pick(r, ["#E85D75", "#F2C230", "#FFFFFF"])}"/>`).join("")}`;
}

function church(r, t) {
  const tower = (x) => `<rect x="${x}" y="260" width="110" height="390" fill="#F2EDE4"/><polygon points="${x},260 ${x + 55},170 ${x + 110},260" fill="#9C6B4E"/><rect x="${x + 35}" y="300" width="40" height="60" rx="20" fill="${windowColor(t, r)}"/>`;
  return `${sky(t)}${sunOrMoon(r, t)}${clouds(r, t)}
  <rect x="0" y="640" width="1200" height="160" fill="#CFC7B8"/>
  ${tower(380)}${tower(710)}
  <rect x="490" y="340" width="220" height="310" fill="#F7F2EA"/>
  <polygon points="490,340 600,270 710,340" fill="#E7DDCD"/>
  <circle cx="600" cy="400" r="34" fill="${windowColor(t, r)}"/>
  <rect x="565" y="520" width="70" height="130" rx="35" fill="#6B4B32"/>
  ${palm(150, 430, 1, night(t))}${tree(1060, 560, 1, "#3E8E41")}`;
}

function market(r, t) {
  const arches = Array.from({ length: 7 }, (_, i) => `<path d="M${330 + i * 80} 640 L${330 + i * 80} 520 Q ${370 + i * 80} 470 ${410 + i * 80} 520 L${410 + i * 80} 640" fill="${night(t) ? "#FFD27A" : "#BFE3F5"}" opacity="0.8" stroke="#2E6B4F" stroke-width="8"/>`).join("");
  const lattice = Array.from({ length: 16 }, (_, i) => `<line x1="${300 + i * 38}" y1="420" x2="${320 + i * 38}" y2="500" stroke="#2E6B4F" stroke-width="5"/>`).join("");
  return `${sky(t)}${sunOrMoon(r, t)}${clouds(r, t)}
  <rect x="0" y="560" width="1200" height="240" fill="#3E2E2A" opacity="0.9"/>
  <rect x="0" y="660" width="1200" height="140" fill="#C9B79C"/>
  <rect x="290" y="410" width="620" height="240" fill="#E8EFE9"/>
  ${lattice}${arches}
  <polygon points="270,410 600,330 930,410" fill="#3F8A63"/>
  <rect x="570" y="250" width="60" height="90" fill="#E8EFE9" stroke="#2E6B4F" stroke-width="6"/><circle cx="600" cy="285" r="18" fill="#fff" stroke="#2E6B4F" stroke-width="4"/>
  ${Array.from({ length: 10 }, (_, i) => `<circle cx="${120 + i * 100 + between(r, -20, 20)}" cy="${730 + between(r, -8, 8)}" r="${between(r, 14, 22)}" fill="${pick(r, ["#F2C230", "#E8590C", "#7A3E9D", "#4CAF50", "#C2255C"])}"/>`).join("")}`;
}

function bridge(r, t) {
  const cables = Array.from({ length: 12 }, (_, i) => `<line x1="600" y1="200" x2="${220 + i * 35}" y2="520" stroke="#E6E6E6" stroke-width="3"/><line x1="600" y1="200" x2="${980 - i * 35}" y2="520" stroke="#E6E6E6" stroke-width="3"/>`).join("");
  return `${sky(t)}${sunOrMoon(r, t)}${clouds(r, t)}
  <rect x="0" y="520" width="1200" height="280" fill="${night(t) ? "#0B1424" : "#2A2622"}"/>
  ${Array.from({ length: 8 }, () => `<rect x="${between(r, 0, 1150)}" y="${between(r, 560, 780)}" width="${between(r, 60, 180)}" height="3" fill="#FFD27A" opacity="0.4"/>`).join("")}
  <rect x="0" y="512" width="1200" height="16" fill="#D8D8D8"/>
  ${cables}
  <polygon points="585,520 593,180 607,180 615,520" fill="#F4F4F4"/>
  ${night(t) ? Array.from({ length: 20 }, (_, i) => `<circle cx="${i * 62}" cy="512" r="4" fill="#FFE08A"/>`).join("") : ""}`;
}

function waters(r, t) {
  return `${sky(t)}${sunOrMoon(r, t)}${clouds(r, t)}
  <rect x="0" y="380" width="1200" height="40" fill="#1F5A32"/>
  ${Array.from({ length: 30 }, (_, i) => `<circle cx="${i * 42}" cy="${385 + between(r, -10, 6)}" r="${between(r, 18, 30)}" fill="#24663A"/>`).join("")}
  <path d="M0 420 L1200 420 L1200 800 L0 800 Z" fill="#B07A45"/>
  <path d="M0 420 L520 420 C 560 560 520 680 640 800 L0 800 Z" fill="#141414"/>
  <path d="M520 420 C 560 560 520 680 640 800" stroke="#6E4A2B" stroke-width="18" fill="none" opacity="0.6"/>
  <g transform="translate(${between(r, 650, 900)} ${between(r, 520, 600)})"><path d="M0 0 L200 0 L170 40 L30 40 Z" fill="#F4F4F4"/><rect x="50" y="-40" width="100" height="40" fill="#E85D45"/></g>`;
}

function beach(r, t) {
  return `${sky(t)}${sunOrMoon(r, t)}${clouds(r, t)}
  <rect x="0" y="420" width="1200" height="40" fill="#1F5A32"/>
  <rect x="0" y="440" width="1200" height="180" fill="${t === "sunset" ? "#5A3B2A" : "#1D1A17"}"/>
  ${t === "sunset" ? `<rect x="400" y="440" width="300" height="180" fill="#FFD27A" opacity="0.25"/>` : ""}
  ${Array.from({ length: 10 }, () => `<rect x="${between(r, 0, 1150)}" y="${between(r, 460, 600)}" width="${between(r, 40, 140)}" height="3" fill="#fff" opacity="0.25"/>`).join("")}
  <path d="M0 600 Q 600 560 1200 610 L1200 800 L0 800 Z" fill="#F0D9A8"/>
  ${Array.from({ length: 3 }, (_, i) => `<g transform="translate(${200 + i * 320 + between(r, -40, 40)} 640)"><line x1="0" y1="0" x2="0" y2="110" stroke="#6B4B32" stroke-width="6"/><path d="M-90 10 Q 0 -60 90 10 Z" fill="${pick(r, ["#E85D45", "#F2C230", "#2C6FB7", "#2F8F4E"])}"/></g>`).join("")}
  ${palm(between(r, 40, 120), 400, 1.1, night(t))}`;
}

function forest(r, t, tower = false) {
  const layer = (y, color, n, size) =>
    Array.from({ length: n }, (_, i) => `<circle cx="${(i * 1200) / (n - 1) + between(r, -30, 30)}" cy="${y + between(r, -20, 20)}" r="${size + between(r, -15, 15)}" fill="${color}"/>`).join("");
  return `${sky(t)}${sunOrMoon(r, t)}${clouds(r, t)}
  ${layer(420, "#2C6B3A", 14, 90)}<rect x="0" y="420" width="1200" height="380" fill="#2C6B3A"/>
  ${tower ? `<g transform="translate(${between(r, 800, 950)} 160)"><rect x="0" y="0" width="12" height="380" fill="#8A6A4A"/><rect x="60" y="0" width="12" height="380" fill="#8A6A4A"/>${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${i * 48}" x2="72" y2="${i * 48 + 48}" stroke="#8A6A4A" stroke-width="6"/>`).join("")}<rect x="-14" y="-12" width="100" height="16" fill="#6B4B32"/></g>` : ""}
  ${layer(540, "#1F5A32", 12, 100)}<rect x="0" y="560" width="1200" height="240" fill="#1F5A32"/>
  ${layer(660, "#174A28", 10, 110)}
  <path d="M520 800 Q 600 680 640 620 Q 680 700 760 800 Z" fill="#B38B5D"/>`;
}

function square(r, t) {
  const lamps = Array.from({ length: 4 }, (_, i) => {
    const x = 180 + i * 280 + between(r, -20, 20);
    return `<rect x="${x}" y="470" width="8" height="200" fill="#2B2B2B"/><circle cx="${x + 4}" cy="465" r="16" fill="${night(t) ? "#FFE08A" : "#F2F2F2"}"/>${night(t) ? `<circle cx="${x + 4}" cy="465" r="60" fill="#FFE08A" opacity="0.15"/>` : ""}`;
  }).join("");
  return `${sky(t)}${sunOrMoon(r, t)}${clouds(r, t)}
  <rect x="0" y="560" width="1200" height="240" fill="#86B86B"/>
  <path d="M480 800 L560 560 L640 560 L720 800 Z" fill="#E3D6BE"/>
  ${tree(between(r, 90, 200), 470, between(r, 1, 1.3), pick(r, ["#3E8E41", "#2F7D3B", "#4C9A52"]))}
  ${tree(between(r, 320, 420), 500, between(r, 0.8, 1), pick(r, ["#3E8E41", "#55A35B"]))}
  ${tree(between(r, 820, 920), 490, between(r, 0.9, 1.2), pick(r, ["#2F7D3B", "#4C9A52"]))}
  ${tree(between(r, 1020, 1130), 470, between(r, 1, 1.3), "#3E8E41")}
  ${r() > 0.5 ? `<g transform="translate(600 520)"><ellipse cx="0" cy="40" rx="120" ry="26" fill="#9FCFEA"/><rect x="-10" y="-30" width="20" height="70" fill="#E3E3E3"/><ellipse cx="0" cy="-34" rx="40" ry="10" fill="#E3E3E3"/></g>` : `<g transform="translate(600 470)"><rect x="-60" y="0" width="120" height="90" fill="#F3E3B5"/><polygon points="-80,0 0,-60 80,0" fill="#C2255C"/></g>`}
  ${Array.from({ length: 2 }, (_, i) => `<g transform="translate(${300 + i * 520} 690)"><rect x="0" y="0" width="120" height="12" fill="#8A5A3C"/><rect x="0" y="-26" width="120" height="10" fill="#8A5A3C"/><rect x="8" y="12" width="8" height="28" fill="#3A3A3A"/><rect x="104" y="12" width="8" height="28" fill="#3A3A3A"/></g>`).join("")}
  ${lamps}`;
}

function mall(r, t) {
  const accent = pick(r, ["#C2255C", "#0E7C86", "#E8590C", "#7048E8"]);
  const glass = Array.from({ length: 10 }, (_, i) => Array.from({ length: 4 }, (_, j) => `<rect x="${240 + i * 74}" y="${300 + j * 70}" width="64" height="60" fill="${windowColor(t, r)}" opacity="0.9"/>`).join("")).join("");
  return `${sky(t)}${sunOrMoon(r, t)}${clouds(r, t)}
  <rect x="0" y="610" width="1200" height="190" fill="#9A9A9A"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 160 + 30}" y="700" width="90" height="8" fill="#fff"/>`).join("")}
  <rect x="220" y="280" width="760" height="340" fill="#D7DCE0"/>
  ${glass}
  <rect x="220" y="250" width="760" height="40" fill="${accent}"/>
  <rect x="520" y="520" width="160" height="100" fill="#2B3550" opacity="0.85"/>
  ${Array.from({ length: 4 }, (_, i) => `<g transform="translate(${120 + i * 300 + between(r, -30, 30)} 640)"><rect x="0" y="0" width="${between(r, 70, 100)}" height="40" rx="10" fill="${pick(r, ["#E85D45", "#2C6FB7", "#F2C230", "#4A4A4A", "#FFFFFF"])}"/></g>`).join("")}
  ${palm(110, 380, 0.9, night(t))}${palm(1090, 380, 0.9, night(t))}`;
}

function hotel(r, t) {
  const floors = 7;
  const wins = Array.from({ length: floors }, (_, row) => Array.from({ length: 6 }, (_, i) => `<rect x="${430 + i * 58}" y="${200 + row * 56}" width="40" height="36" fill="${windowColor(t, r)}"/>`).join("")).join("");
  return `${sky(t)}${sunOrMoon(r, t)}${clouds(r, t)}
  <rect x="410" y="180" width="380" height="440" fill="${pick(r, ["#F1EDE6", "#E8E2D6", "#DCE6EA"])}"/>
  ${wins}
  <rect x="0" y="600" width="1200" height="200" fill="#E3D6BE"/>
  <rect x="140" y="640" width="560" height="110" rx="20" fill="#47B5D6"/>
  ${Array.from({ length: 6 }, () => `<path d="M${between(r, 170, 650)} ${between(r, 660, 730)} q 20 -8 40 0" stroke="#fff" stroke-width="4" fill="none" opacity="0.7"/>`).join("")}
  ${Array.from({ length: 3 }, (_, i) => `<g transform="translate(${780 + i * 120} 690)"><rect x="0" y="0" width="90" height="16" fill="#FFFFFF"/><rect x="60" y="-24" width="30" height="24" fill="#FFFFFF"/><line x1="10" y1="16" x2="10" y2="40" stroke="#888" stroke-width="5"/><line x1="80" y1="16" x2="80" y2="40" stroke="#888" stroke-width="5"/></g>`).join("")}
  ${palm(90, 380, 1.1, night(t))}${palm(1110, 400, 1, night(t))}`;
}

function room(r, t) {
  const wall = pick(r, ["#F3EDE4", "#E9EEF0", "#F6E9DC"]);
  return `<rect width="1200" height="800" fill="${wall}"/>
  <rect x="700" y="120" width="380" height="300" fill="#8BC4E3"/>
  <svg x="700" y="120" width="380" height="300" viewBox="0 0 1200 800">${t === "night" ? beach(r, "night") : waters(r, t)}</svg>
  <rect x="690" y="110" width="400" height="320" fill="none" stroke="#FFFFFF" stroke-width="20"/>
  <rect x="0" y="600" width="1200" height="200" fill="#B89B7A"/>
  <rect x="120" y="380" width="500" height="80" rx="20" fill="#7A5A3C"/>
  <rect x="120" y="450" width="520" height="170" rx="16" fill="#FFFFFF"/>
  <rect x="120" y="520" width="520" height="100" rx="16" fill="${pick(r, ["#0E7C86", "#C2255C", "#E8590C", "#2C6FB7"])}"/>
  <rect x="160" y="420" width="140" height="60" rx="24" fill="#F4F4F4"/><rect x="330" y="420" width="140" height="60" rx="24" fill="#F4F4F4"/>
  <rect x="660" y="520" width="90" height="100" fill="#7A5A3C"/><circle cx="705" cy="490" r="26" fill="#FFE9A6" opacity="${night(t) ? 1 : 0.7}"/>`;
}

// ---------------------------------------------------------------------------
// Food & drinks (top-down on a table)
// ---------------------------------------------------------------------------

function table(r) {
  const wood = pick(r, [["#8A5A3C", "#7A4E33"], ["#B4835A", "#A07450"], ["#5E4030", "#523829"]]);
  return `<rect width="1200" height="800" fill="${wood[0]}"/>${Array.from({ length: 9 }, (_, i) => `<rect x="0" y="${i * 90 + 40}" width="1200" height="4" fill="${wood[1]}"/>`).join("")}`;
}

function cutlery(x, y) {
  return `<g transform="translate(${x} ${y})"><rect x="0" y="0" width="14" height="260" rx="7" fill="#D9D9D9"/><rect x="-6" y="-60" width="26" height="70" rx="6" fill="#D9D9D9"/><rect x="60" y="-40" width="18" height="300" rx="9" fill="#D9D9D9"/></g>`;
}

function fishPlate(r) {
  return `${table(r)}
  <circle cx="560" cy="400" r="290" fill="#FFFFFF"/><circle cx="560" cy="400" r="250" fill="#F4F4F4"/>
  <g transform="translate(560 380) rotate(${between(r, -20, 20)})"><ellipse cx="0" cy="0" rx="190" ry="90" fill="#C7772E"/>${Array.from({ length: 7 }, (_, i) => `<line x1="${-130 + i * 40}" y1="-70" x2="${-110 + i * 40}" y2="70" stroke="#8E4E1B" stroke-width="7"/>`).join("")}<polygon points="180,0 260,-70 260,70" fill="#B5651F"/><circle cx="-140" cy="-20" r="10" fill="#2B2B2B"/></g>
  <ellipse cx="460" cy="560" rx="110" ry="50" fill="#FFFDF5"/><ellipse cx="680" cy="570" rx="90" ry="45" fill="#E7C27D"/>
  ${Array.from({ length: 14 }, () => `<circle cx="${between(r, 600, 760)}" cy="${between(r, 540, 600)}" r="5" fill="#C9A15A"/>`).join("")}
  <circle cx="380" cy="300" r="26" fill="#7CB342"/><circle cx="745" cy="300" r="22" fill="#F2C230"/>
  ${cutlery(920, 260)}
  <circle cx="1030" cy="150" r="70" fill="#FFE08A" opacity="0.85"/><circle cx="1030" cy="150" r="56" fill="#F2B233"/>`;
}

function breakfast(r) {
  return `${table(r)}
  <circle cx="330" cy="330" r="150" fill="#FFFFFF"/>
  <path d="M220 330 A110 110 0 0 1 440 330 Z" fill="#FFF7EA"/><path d="M220 330 A110 110 0 0 0 440 330 Z" fill="#F4EBDD"/>
  <rect x="230" y="320" width="200" height="22" fill="#F7A440"/>
  <circle cx="760" cy="300" r="110" fill="#FFFFFF"/><circle cx="760" cy="300" r="80" fill="#5A3420"/><circle cx="740" cy="285" r="20" fill="#7A4A30" opacity="0.7"/>
  <path d="M860 300 q 60 0 60 40 q 0 40 -60 40" stroke="#FFFFFF" stroke-width="20" fill="none"/>
  <circle cx="560" cy="580" r="150" fill="#FFFFFF"/>
  ${Array.from({ length: 6 }, (_, i) => `<circle cx="${480 + (i % 3) * 80}" cy="${545 + Math.floor(i / 3) * 70}" r="34" fill="#F28C1C"/><circle cx="${480 + (i % 3) * 80}" cy="${545 + Math.floor(i / 3) * 70}" r="14" fill="#5A3420"/>`).join("")}
  <path d="M900 560 q 120 -80 200 20" stroke="#F2D338" stroke-width="44" fill="none" stroke-linecap="round"/>
  <ellipse cx="170" cy="640" rx="110" ry="60" fill="#D99A4E"/><ellipse cx="170" cy="630" rx="90" ry="40" fill="#E8B46A"/>
  ${Array.from({ length: 8 }, () => `<circle cx="${between(r, 950, 1150)}" cy="${between(r, 120, 260)}" r="${between(r, 14, 22)}" fill="${pick(r, ["#E53935", "#7CB342", "#F2C230"])}"/>`).join("")}`;
}

function burger(r) {
  return `${table(r)}
  <rect x="120" y="140" width="960" height="560" rx="30" fill="#E9D3B0"/>
  <g transform="translate(470 420)">
    <path d="M-230 -20 Q 0 -260 230 -20 Z" fill="#E5A04A"/>${Array.from({ length: 12 }, () => `<ellipse cx="${between(r, -150, 150)}" cy="${between(r, -150, -50)}" rx="8" ry="4" fill="#FFF3D6"/>`).join("")}
    <rect x="-240" y="-20" width="480" height="26" rx="12" fill="#7CB342"/>
    <rect x="-230" y="6" width="460" height="34" rx="10" fill="#F2C230"/>
    <rect x="-240" y="40" width="480" height="60" rx="26" fill="#6B3B22"/>
    <rect x="-200" y="100" width="400" height="30" rx="10" fill="#F28C1C"/>
    <path d="M-230 130 L 230 130 Q 230 200 0 200 Q -230 200 -230 130 Z" fill="#E5A04A"/>
  </g>
  ${Array.from({ length: 16 }, () => `<rect x="${between(r, 760, 1020)}" y="${between(r, 220, 620)}" width="22" height="${between(r, 90, 140)}" rx="6" fill="#F2B233" transform="rotate(${between(r, -40, 40)} 880 420)"/>`).join("")}`;
}

function acai(r) {
  return `${table(r)}
  <circle cx="560" cy="420" r="300" fill="#FFFFFF"/><circle cx="560" cy="420" r="260" fill="#3B1340"/>
  <circle cx="500" cy="380" r="180" fill="#4C1A52"/>
  ${Array.from({ length: 9 }, (_, i) => `<circle cx="${400 + (i % 3) * 90 + between(r, -10, 10)}" cy="${330 + Math.floor(i / 3) * 80}" r="34" fill="#FFF2B3"/><circle cx="${400 + (i % 3) * 90}" cy="${330 + Math.floor(i / 3) * 80}" r="10" fill="#E8D26A"/>`).join("")}
  ${Array.from({ length: 40 }, () => `<rect x="${between(r, 620, 760)}" y="${between(r, 300, 560)}" width="16" height="10" rx="3" fill="#C8924A"/>`).join("")}
  <path d="M380 560 q 180 -60 360 0" stroke="#F7E7A6" stroke-width="14" fill="none" stroke-linecap="round"/>
  ${cutlery(980, 250)}`;
}

function pizza(r) {
  const tops = Array.from({ length: 22 }, () => `<circle cx="${between(r, 380, 820)}" cy="${between(r, 200, 620)}" r="${between(r, 14, 26)}" fill="${pick(r, ["#C62828", "#2E7D32", "#F9A825", "#6D4C41"])}"/>`).join("");
  return `${table(r)}
  <circle cx="600" cy="410" r="320" fill="#5E3B22"/><circle cx="600" cy="410" r="290" fill="#E8A54B"/><circle cx="600" cy="410" r="255" fill="#F6D06A"/>
  <defs><clipPath id="pz"><circle cx="600" cy="410" r="250"/></clipPath></defs><g clip-path="url(#pz)">${tops}</g>
  ${Array.from({ length: 4 }, (_, i) => `<line x1="600" y1="410" x2="${600 + 290 * Math.cos((i * Math.PI) / 4)}" y2="${410 + 290 * Math.sin((i * Math.PI) / 4)}" stroke="#C98B3A" stroke-width="5"/><line x1="600" y1="410" x2="${600 - 290 * Math.cos((i * Math.PI) / 4)}" y2="${410 - 290 * Math.sin((i * Math.PI) / 4)}" stroke="#C98B3A" stroke-width="5"/>`).join("")}`;
}

function barNight(r) {
  const bulbs = Array.from({ length: 22 }, (_, i) => `<circle cx="${i * 58}" cy="${110 + 40 * Math.sin(i / 2)}" r="9" fill="#FFE08A"/><circle cx="${i * 58}" cy="${110 + 40 * Math.sin(i / 2)}" r="26" fill="#FFE08A" opacity="0.18"/>`).join("");
  const bottles = Array.from({ length: 14 }, (_, i) => {
    const x = 150 + i * 66;
    const c = pick(r, ["#2E7D32", "#8D6E63", "#5D4037", "#1565C0", "#C62828", "#F9A825"]);
    return `<rect x="${x}" y="300" width="36" height="110" rx="8" fill="${c}"/><rect x="${x + 11}" y="270" width="14" height="36" fill="${c}"/>`;
  }).join("");
  const glasses = Array.from({ length: 4 }, (_, i) => `<g transform="translate(${260 + i * 200 + between(r, -20, 20)} 560)"><rect x="0" y="0" width="80" height="140" rx="10" fill="#F2B233" opacity="0.92"/><rect x="0" y="0" width="80" height="30" rx="10" fill="#FFFFFF"/></g>`).join("");
  return `<rect width="1200" height="800" fill="#1A1420"/>
  <path d="M0 110 Q 600 200 1200 110" stroke="#333" stroke-width="3" fill="none"/>${bulbs}
  <rect x="100" y="410" width="1000" height="14" fill="#5E4030"/>${bottles}
  <rect x="0" y="640" width="1200" height="160" fill="#6B4B32"/><rect x="0" y="630" width="1200" height="20" fill="#7A5A3C"/>
  ${glasses}`;
}

const SCENES = {
  theatre,
  palace: (r, t) => palace(r, t),
  palaceRose: (r, t) => palace(r, t, "#E9C0B0"),
  church,
  market,
  bridge,
  waters,
  beach,
  forest: (r, t) => forest(r, t),
  forestTower: (r, t) => forest(r, t, true),
  square,
  mall,
  hotel,
  room,
  fish: fishPlate,
  breakfast,
  burger,
  acai,
  pizza,
  bar: barNight,
};

export function renderScene(name, seed, time) {
  const r = makeRng(seed);
  const fn = SCENES[name];
  if (!fn) throw new Error(`Cena desconhecida: ${name}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">${fn(r, time)}</svg>`;
}

export const SCENE_NAMES = Object.keys(SCENES);
