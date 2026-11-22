import { getInitials } from "@/lib/utils";

// Soft background / dark text pairs (AA contrast), picked by name.
const PALETTE: [string, string][] = [
  ["#CDEBEC", "#0A5F67"],
  ["#FDE3CF", "#9A4508"],
  ["#DCEFE2", "#1E6B30"],
  ["#E9E3FB", "#5A35C9"],
  ["#FBE4EE", "#9C1D4A"],
  ["#E1EEFA", "#155A9C"],
];

function pick(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function avatarColors(name: string) {
  return pick(name || "?");
}

export function PersonAvatar({
  name,
  src,
  size = 44,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [bg, fg] = pick(name || "?");
  const style = { width: size, height: size, fontSize: Math.round(size * 0.34) };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" style={style} className={`shrink-0 rounded-full object-cover ${className}`} />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, background: bg, color: fg }}
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${className}`}
    >
      {getInitials(name || "?")}
    </span>
  );
}
