import { Lock } from "lucide-react";
import { RARITY, type BadgeState } from "@/lib/achievements";

/** Round medal for a badge; locked badges are grey and show their progress. */
export function BadgeMedal({ badge, size = 72 }: { badge: BadgeState; size?: number }) {
  const r = RARITY[badge.rarity];
  const Icon = badge.icon;
  const pct = Math.round((badge.progress / badge.goal) * 100);
  return (
    <figure className="flex w-[120px] flex-col items-center gap-2 text-center">
      <span
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: badge.unlocked ? r.bg : "#EFF1EE",
          color: badge.unlocked ? r.fg : "#8A938D",
          boxShadow: `inset 0 0 0 ${badge.unlocked ? 3 : 2}px ${badge.unlocked ? r.ring : "#C9CFCA"}`,
        }}
      >
        <Icon size={Math.round(size * 0.4)} strokeWidth={1.8} aria-hidden="true" />
        {!badge.unlocked && (
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#59625C] text-white">
            <Lock size={12} aria-hidden="true" />
          </span>
        )}
      </span>
      <figcaption className="flex flex-col gap-0.5">
        <span className={`text-[13px] font-bold leading-4 ${badge.unlocked ? "text-mt-ink" : "text-mt-muted"}`}>{badge.name}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: badge.unlocked ? r.fg : "#646E68" }}>
          {badge.unlocked ? r.label : `${badge.progress}/${badge.goal}`}
        </span>
        <span className="sr-only">
          {badge.unlocked ? "Desbloqueado." : `Bloqueado, ${pct}% concluído.`} {badge.description}
        </span>
      </figcaption>
    </figure>
  );
}
