import { Geist } from "next/font/google";

// Brand typeface for the wordmark (see the brand guide). The rest of the app keeps its own font.
const geist = Geist({ subsets: ["latin"], weight: ["600"], display: "swap" });

// Same geometry as scripts/brand-logo.mjs ("Meridiano"): a disc cut on its meridian,
// right half slid 5u down; the place (gold dot) sits in the step the shift opens.
const LEFT = "M23 6a17 17 0 0 0 0 34Z";
const RIGHT = "M25 11a17 17 0 0 1 0 34Z";

const VARIANTS = {
  light: { left: "#123D2C", right: "#16845A", dot: "#C8A85C" }, // on light backgrounds
  dark: { left: "#F7F8F6", right: "#6FC493", dot: "#C8A85C" }, // on dark backgrounds / photos
  mono: { left: "currentColor", right: "currentColor", dot: "currentColor" },
} as const;

export type BrandVariant = keyof typeof VARIANTS;

/** The MapTrip symbol. Decorative by default; pass `title` when it stands alone. */
export function BrandMark({ size = 32, variant = "light", title, className = "" }: { size?: number; variant?: BrandVariant; title?: string; className?: string }) {
  const c = VARIANTS[variant];
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d={LEFT} fill={c.left} />
      <path d={RIGHT} fill={c.right} />
      <circle cx="28.5" cy="6.2" r="3.2" fill={c.dot} />
    </svg>
  );
}

/** Symbol + "maptrip" wordmark (horizontal lockup: gap ≈ 0.2 × symbol, name at 62.5 % of it). */
export function BrandLockup({ size = 32, variant = "light", className = "" }: { size?: number; variant?: BrandVariant; className?: string }) {
  const color = variant === "dark" ? "#FFFFFF" : variant === "mono" ? "currentColor" : "#080A09";
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: Math.round(size * 0.2) }}>
      <BrandMark size={size} variant={variant} />
      <span className={geist.className} style={{ fontSize: Math.round(size * 0.625), fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, color }}>
        maptrip
      </span>
    </span>
  );
}
