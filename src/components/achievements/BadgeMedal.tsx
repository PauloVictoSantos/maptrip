import { AchievementIcon } from "./AchievementIcon";
import { LOCKED_STYLE, TIER_ORDER, TIER_STYLE, tierIndex, type BadgeState, type Tier } from "@/lib/achievements";

/** Round badge for an achievement at a given tier (or locked). Colors drive the icon via CSS. */
export function BadgeCircle({ id, tier, size = 72 }: { id: BadgeState["id"]; tier: Tier | null; size?: number }) {
  const s = tier ? TIER_STYLE[tier] : LOCKED_STYLE;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={
        {
          width: size,
          height: size,
          background: s.bg,
          color: s.ink,
          boxShadow: `inset 0 0 0 ${tier === "epico" ? 3 : 2}px ${s.ring}`,
          "--badge-accent": s.accent,
        } as React.CSSProperties
      }
    >
      {/* Locked badges show the common-tier drawing in grey. */}
      <AchievementIcon id={id} tier={tier ?? "comum"} size={Math.round(size * 0.82)} />
    </span>
  );
}

/** Badge + name + tier pips, for the achievements grid. */
export function BadgeMedal({ badge, size = 72 }: { badge: BadgeState; size?: number }) {
  const reached = tierIndex(badge.tier);
  const status = badge.tier
    ? `Nível ${TIER_STYLE[badge.tier].label.toLowerCase()} conquistado.${badge.next ? ` Próximo: ${TIER_STYLE[badge.next.tier].label.toLowerCase()}, ${badge.count} de ${badge.next.goal}.` : " Todos os níveis conquistados."}`
    : `Bloqueado, ${badge.count} de ${badge.next!.goal}.`;

  return (
    <figure className="m-0 flex w-[120px] flex-col items-center gap-2 text-center">
      <BadgeCircle id={badge.id} tier={badge.tier} size={size} />
      <figcaption className="flex flex-col items-center gap-1">
        <span className={`text-[13px] font-bold leading-4 ${badge.tier ? "text-mt-ink" : "text-mt-muted"}`}>{badge.name}</span>
        {/* Three pips: comum, raro, épico */}
        <span aria-hidden="true" className="flex gap-1">
          {TIER_ORDER.map((t, i) => (
            <span
              key={t}
              className="h-1.5 w-4 rounded-full"
              style={{ background: i <= reached ? TIER_STYLE[t].accent : "#E3E7E3" }}
            />
          ))}
        </span>
        <span className="text-[11px] font-semibold tabular-nums text-mt-muted" aria-hidden="true">
          {badge.next ? `${badge.count}/${badge.next.goal}` : "Completo"}
        </span>
        <span className="sr-only">
          {status} {badge.description}
        </span>
      </figcaption>
    </figure>
  );
}
