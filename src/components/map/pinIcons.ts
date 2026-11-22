import L from "leaflet";
import { CATEGORY_GROUPS, groupFor, groupIconSvg, withAlpha } from "./categories";

// Pin size grows with the rating (30px for ≤3★, up to 40px for 5★).
function pinSize(rating: number): number {
  return Math.round(30 + Math.min(Math.max(rating - 3, 0), 2) * 5);
}

export function createPinIcon(
  category: string | null,
  rating: number,
  selected = false
): L.DivIcon {
  const group = groupFor(category);
  const { color } = CATEGORY_GROUPS[group];
  const size = selected ? 52 : pinSize(rating);
  const glyph = Math.round(size * 0.46);

  const halo = selected
    ? `<span class="maptrip-pin-halo" style="background:${withAlpha(color, 0.16)};border:2px solid ${withAlpha(color, 0.35)}"></span>`
    : "";

  const shadow = selected
    ? `0 4px 12px ${withAlpha(color, 0.45)}`
    : "0 2px 6px rgba(20,32,43,0.3)";

  return L.divIcon({
    html: `<div class="maptrip-pin-body" style="width:${size}px;height:${size}px">
      ${halo}
      <div class="maptrip-pin-dot" style="background:${color};box-shadow:${shadow}">${groupIconSvg(group, glyph)}</div>
    </div>`,
    className: selected ? "maptrip-pin is-selected" : "maptrip-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Cluster icon: teal disc with a soft ring, sized by count.
export function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count < 10 ? 40 : count < 100 ? 46 : 52;
  const ring = count < 10 ? 5 : count < 100 ? 6 : 7;

  return L.divIcon({
    html: `<div class="maptrip-cluster-dot" style="width:${size}px;height:${size}px;font-size:${count < 100 ? 15 : 13}px;box-shadow:0 0 0 ${ring}px rgba(14,124,134,0.22), 0 2px 8px rgba(20,32,43,0.25)">${count}</div>`,
    className: "maptrip-cluster",
    iconSize: [size, size],
  });
}

// ---------------------------------------------------------------------------
// Avatar pins: visits by people you follow show their profile photo, ringed in
// the category color, with a small category badge.

const AVATAR_PALETTE: [string, string][] = [
  ["#CDEBEC", "#0A5F67"],
  ["#FDE3CF", "#9A4508"],
  ["#DCEFE2", "#1E6B30"],
  ["#E9E3FB", "#5A35C9"],
  ["#FBE4EE", "#9C1D4A"],
  ["#E1EEFA", "#155A9C"],
];

function escapeAttr(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]!);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function createAvatarPinIcon(
  pin: { category: string | null; avatar_url: string | null; display_name?: string; username: string },
  selected = false
): L.DivIcon {
  const group = groupFor(pin.category);
  const { color } = CATEGORY_GROUPS[group];
  const size = selected ? 58 : 44;
  const name = pin.display_name || pin.username || "?";

  let face: string;
  if (pin.avatar_url) {
    face = `<img src="${escapeAttr(pin.avatar_url)}" alt="" draggable="false" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block">`;
  } else {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    const [bg, fg] = AVATAR_PALETTE[h % AVATAR_PALETTE.length];
    face = `<span style="width:100%;height:100%;border-radius:50%;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font:800 ${Math.round(size * 0.34)}px 'Plus Jakarta Sans',system-ui,sans-serif">${escapeAttr(initials(name))}</span>`;
  }

  const halo = selected
    ? `<span class="maptrip-pin-halo" style="background:${withAlpha(color, 0.16)};border:2px solid ${withAlpha(color, 0.35)}"></span>`
    : "";
  const badge = Math.round(size * 0.42);

  return L.divIcon({
    html: `<div class="maptrip-pin-body" style="width:${size}px;height:${size}px">
      ${halo}
      <div class="maptrip-pin-dot maptrip-avatar-pin" style="background:#fff;border:3px solid ${color};box-shadow:${selected ? `0 4px 12px ${withAlpha(color, 0.45)}` : "0 2px 8px rgba(20,32,43,0.35)"};padding:2px">${face}</div>
      <span style="position:absolute;right:-4px;bottom:-4px;width:${badge}px;height:${badge}px;border-radius:50%;background:${color};border:2px solid #fff;color:#fff;display:flex;align-items:center;justify-content:center">${groupIconSvg(group, Math.round(badge * 0.6), 2.6)}</span>
    </div>`,
    className: selected ? "maptrip-pin is-selected" : "maptrip-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
