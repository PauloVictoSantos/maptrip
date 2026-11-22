// Password policy shared by the forms (live checklist) and the API (enforcement).

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

export const PASSWORD_RULES = [
  { id: "length", label: `Mínimo de ${PASSWORD_MIN} caracteres`, test: (p: string) => p.length >= PASSWORD_MIN },
  { id: "upper", label: "Pelo menos 1 letra maiúscula", test: (p: string) => /\p{Lu}/u.test(p) },
  { id: "lower", label: "Pelo menos 1 letra minúscula", test: (p: string) => /\p{Ll}/u.test(p) },
  { id: "digit", label: "Pelo menos 1 número", test: (p: string) => /\d/.test(p) },
  // Any symbol counts; the label shows the most common ones.
  { id: "special", label: "Pelo menos 1 caractere especial (!@#$%&*)", test: (p: string) => /[^\p{L}\p{N}\s]/u.test(p) },
] as const;

export type PasswordStrength = { met: Record<string, boolean>; count: number; level: "fraca" | "media" | "forte"; label: string };

/** 0–2 criteria = Fraca, 3–4 = Média, 5 = Forte. */
export function passwordStrength(p: string): PasswordStrength {
  const met = Object.fromEntries(PASSWORD_RULES.map((r) => [r.id, r.test(p)]));
  const count = Object.values(met).filter(Boolean).length;
  const level = count === PASSWORD_RULES.length ? "forte" : count >= 3 ? "media" : "fraca";
  return { met, count, level, label: level === "forte" ? "Forte" : level === "media" ? "Média" : "Fraca" };
}

/** Error message for the API, or null when the password satisfies every rule. */
export function passwordPolicyError(p: unknown): string | null {
  if (typeof p !== "string" || p.length > PASSWORD_MAX) return "Senha inválida.";
  const missing = PASSWORD_RULES.filter((r) => !r.test(p)).map((r) => r.label.toLowerCase());
  return missing.length ? `A senha precisa de: ${missing.join("; ")}.` : null;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
