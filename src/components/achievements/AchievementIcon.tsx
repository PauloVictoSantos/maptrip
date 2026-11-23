import { ACHIEVEMENT_ICONS, type AchievementIconId, type AchievementTier } from "./achievementIcons";

/**
 * Achievement symbol (no outer circle — the badge around it is up to the caller).
 * Colors come from CSS: line = `color` (currentColor), highlight = `--badge-accent`.
 *
 *   <span style={{ color: "#123D2C", ["--badge-accent" as string]: "#C8A85C" }}>
 *     <AchievementIcon id="guia-da-cidade" tier="epico" size={48} />
 *   </span>
 *
 * The markup comes from a generated, static module (scripts/achievement-icons.mjs) — never user input.
 */
export function AchievementIcon({
  id,
  tier,
  size = 48,
  title,
  className,
}: {
  id: AchievementIconId;
  tier: AchievementTier;
  size?: number;
  title?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: ACHIEVEMENT_ICONS[id][tier] }}
    />
  );
}
