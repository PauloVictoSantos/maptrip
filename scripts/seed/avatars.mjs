// Illustrated profile portraits (SVG) for the seed people.

const SKIN = ["#F2D0B3", "#E0AC82", "#C68A5E", "#9C6644", "#7A4B2E"];
const HAIR = ["#1F1712", "#3B2A20", "#5A3B26", "#8A5A2B", "#2B2B2B"];

// key → look
export const LOOKS = {
  caio: { bg: "#CDEBEC", skin: 2, hair: 0, style: "short", shirt: "#0E7C86", glasses: true, beard: true },
  bia: { bg: "#FDE3CF", skin: 1, hair: 2, style: "long", shirt: "#E8590C" },
  rafa: { bg: "#DCEFE2", skin: 3, hair: 0, style: "short", shirt: "#2F7D3B", beard: true },
  marina: { bg: "#E9E3FB", skin: 0, hair: 3, style: "bun", shirt: "#7048E8" },
  joao: { bg: "#E1EEFA", skin: 1, hair: 1, style: "short", shirt: "#1971C2" },
  larissa: { bg: "#FBE4EE", skin: 4, hair: 0, style: "curly", shirt: "#C2255C" },
  thiago: { bg: "#FDF0E3", skin: 2, hair: 4, style: "buzz", shirt: "#F2B233" },
  fernanda: { bg: "#E3F3F3", skin: 0, hair: 1, style: "bob", shirt: "#14202B" },
  gabriel: { bg: "#F1F3F1", skin: 3, hair: 0, style: "curlyShort", shirt: "#5A35C9" },
  carol: { bg: "#E6F4EA", skin: 2, hair: 1, style: "ponytail", shirt: "#0A5F67", glasses: true },
};

function hairBack(style, color) {
  switch (style) {
    case "long":
      return `<path d="M110 190 Q 100 330 130 380 L 270 380 Q 300 330 290 190 Z" fill="${color}"/>`;
    case "curly":
      return Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return `<circle cx="${200 + 112 * Math.cos(a)}" cy="${200 + 112 * Math.sin(a) + 20}" r="44" fill="${color}"/>`;
      }).join("");
    case "ponytail":
      return `<path d="M270 170 Q 330 220 300 330 Q 290 260 260 230 Z" fill="${color}"/>`;
    case "bob":
      return `<path d="M115 180 Q 110 290 140 300 L 260 300 Q 290 290 285 180 Z" fill="${color}"/>`;
    default:
      return "";
  }
}

function hairFront(style, color) {
  switch (style) {
    case "short":
      return `<path d="M122 190 Q 125 105 200 100 Q 275 105 278 190 Q 255 140 200 145 Q 150 142 122 190 Z" fill="${color}"/>`;
    case "buzz":
      return `<path d="M128 180 Q 135 112 200 108 Q 265 112 272 180 Q 240 150 200 150 Q 160 150 128 180 Z" fill="${color}" opacity="0.9"/>`;
    case "curlyShort":
      return Array.from({ length: 9 }, (_, i) => `<circle cx="${135 + i * 16}" cy="${135 - Math.sin((i / 8) * Math.PI) * 30}" r="24" fill="${color}"/>`).join("");
    case "bun":
      return `<circle cx="200" cy="85" r="38" fill="${color}"/><path d="M122 190 Q 120 105 200 102 Q 280 105 278 190 Q 250 135 200 138 Q 150 135 122 190 Z" fill="${color}"/>`;
    case "long":
    case "bob":
    case "ponytail":
      return `<path d="M120 200 Q 118 100 200 98 Q 282 100 280 200 Q 270 140 200 138 Q 140 140 120 200 Z" fill="${color}"/>`;
    case "curly":
      return Array.from({ length: 8 }, (_, i) => `<circle cx="${130 + i * 20}" cy="${128 - Math.sin((i / 7) * Math.PI) * 26}" r="26" fill="${color}"/>`).join("");
    default:
      return "";
  }
}

export function renderAvatar(key) {
  const look = LOOKS[key];
  if (!look) throw new Error(`Sem visual para ${key}`);
  const skin = SKIN[look.skin];
  const hair = HAIR[look.hair];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="${look.bg}"/>
  ${hairBack(look.style, hair)}
  <path d="M70 400 Q 80 300 200 290 Q 320 300 330 400 Z" fill="${look.shirt}"/>
  <rect x="175" y="250" width="50" height="50" rx="20" fill="${skin}"/>
  <ellipse cx="200" cy="195" rx="78" ry="90" fill="${skin}"/>
  <ellipse cx="122" cy="200" rx="12" ry="18" fill="${skin}"/><ellipse cx="278" cy="200" rx="12" ry="18" fill="${skin}"/>
  ${hairFront(look.style, hair)}
  <circle cx="172" cy="200" r="8" fill="#1F1712"/><circle cx="228" cy="200" r="8" fill="#1F1712"/>
  <path d="M160 178 q 12 -8 24 0 M216 178 q 12 -8 24 0" stroke="${hair}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M175 240 Q 200 262 225 240" stroke="#7A3B2E" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="155" cy="228" r="10" fill="#E85D75" opacity="0.18"/><circle cx="245" cy="228" r="10" fill="#E85D75" opacity="0.18"/>
  ${look.beard ? `<path d="M128 215 Q 135 290 200 292 Q 265 290 272 215 Q 255 258 200 262 Q 145 258 128 215 Z" fill="${hair}" opacity="0.85"/><path d="M178 244 Q 200 256 222 244" stroke="#F4E3D3" stroke-width="5" fill="none" stroke-linecap="round"/>` : ""}
  ${look.glasses ? `<g fill="none" stroke="#1F1712" stroke-width="5"><circle cx="172" cy="200" r="22"/><circle cx="228" cy="200" r="22"/><line x1="194" y1="200" x2="206" y2="200"/></g>` : ""}
</svg>`;
}
