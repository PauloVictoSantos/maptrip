// Completeness points for a visit (spec §7). Pure function so the server can
// reuse it when points start being stored.

export const MIN_COMMENT_CHARS = 20;

export type PointsInput = {
  imageCount: number;
  comment: string;
  category: string | null | undefined;
  answeredCount: number;
};

export type PointsBreakdown = {
  base: number;
  photos: number;
  comment: number;
  type: number;
  details: number;
  total: number;
};

export function computePoints({ imageCount, comment, category, answeredCount }: PointsInput): PointsBreakdown {
  const base = 10; // place + rating + visibility
  const photos = imageCount > 0 ? Math.min(5 + 2 * (imageCount - 1), 15) : 0;
  const commentPts = comment.trim().length >= MIN_COMMENT_CHARS ? 5 : 0;
  const type = category ? 3 : 0;
  const details = Math.min(answeredCount * 3, 37);
  return {
    base,
    photos,
    comment: commentPts,
    type,
    details,
    total: base + photos + commentPts + type + details,
  };
}

export const LEVELS = [
  { min: 0, label: "Básico" },
  { min: 25, label: "Bom" },
  { min: 40, label: "Completo" },
  { min: 60, label: "Guia local" },
] as const;

/** The meter is full at the top level. */
export const LEVEL_MAX = 60;

export function levelFor(total: number) {
  let index = 0;
  LEVELS.forEach((l, i) => {
    if (total >= l.min) index = i;
  });
  const next = LEVELS[index + 1] ?? null;
  return { label: LEVELS[index].label, next, missing: next ? next.min - total : 0 };
}

/** Profile levels, fed by the sum of visit points. */
export const PROFILE_LEVELS = [
  { min: 0, label: "Explorador" },
  { min: 200, label: "Viajante" },
  { min: 600, label: "Guia" },
] as const;

export function profileLevelFor(total: number) {
  let index = 0;
  PROFILE_LEVELS.forEach((l, i) => {
    if (total >= l.min) index = i;
  });
  const current = PROFILE_LEVELS[index];
  const next = PROFILE_LEVELS[index + 1] ?? null;
  const pct = next ? (total - current.min) / (next.min - current.min) : 1;
  return { index, label: current.label, next, missing: next ? next.min - total : 0, pct };
}
