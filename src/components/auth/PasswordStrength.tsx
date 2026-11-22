"use client";

import { Check, X } from "lucide-react";
import { PASSWORD_RULES, passwordStrength } from "@/lib/password";

const LEVEL_STYLE = {
  fraca: { bar: "bg-[#D93025]", text: "text-[#B3261E]" },
  media: { bar: "bg-[#F29900]", text: "text-[#8A5300]" },
  forte: { bar: "bg-[#188038]", text: "text-[#137333]" },
} as const;

/**
 * Live strength meter + criteria checklist for a password field.
 * The bar fills by the share of criteria met (0–2 Fraca, 3–4 Média, 5 Forte).
 */
export function PasswordStrength({ password, id }: { password: string; id?: string }) {
  const s = passwordStrength(password);
  const style = LEVEL_STYLE[s.level];
  const pct = (s.count / PASSWORD_RULES.length) * 100;

  return (
    <div id={id} className="mt-2.5">
      <div className="flex items-center gap-3">
        <div
          role="meter"
          aria-label="Força da senha"
          aria-valuemin={0}
          aria-valuemax={PASSWORD_RULES.length}
          aria-valuenow={s.count}
          aria-valuetext={password ? s.label : "Nenhuma senha digitada"}
          className="h-2 flex-1 overflow-hidden rounded-full bg-[#E6E9EC]"
        >
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none ${style.bar}`}
            style={{ width: password ? `${Math.max(pct, 8)}%` : "0%" }}
          />
        </div>
        <span aria-hidden="true" className={`w-12 text-right text-xs font-semibold transition-colors duration-300 ${password ? style.text : "text-[#8A9199]"}`}>
          {password ? s.label : "—"}
        </span>
      </div>

      <ul className="mt-3 grid gap-1.5" aria-label="Critérios da senha">
        {PASSWORD_RULES.map((rule) => {
          const ok = s.met[rule.id];
          return (
            <li key={rule.id} className={`flex items-center gap-2 text-[13px] transition-colors duration-300 motion-reduce:transition-none ${ok ? "text-[#137333]" : "text-[#6B7480]"}`}>
              <span
                aria-hidden="true"
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-all duration-300 motion-reduce:transition-none ${
                  ok ? "scale-100 bg-[#188038] text-white" : "bg-[#EEF0F2] text-[#9AA1A9]"
                }`}
              >
                {ok ? <Check size={12} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
              </span>
              <span>
                {rule.label}
                <span className="sr-only">{ok ? ": atendido" : ": pendente"}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {/* Announces the level change to screen readers without reading the whole list. */}
      <p aria-live="polite" className="sr-only">
        {password ? `Senha ${s.label.toLowerCase()}, ${s.count} de ${PASSWORD_RULES.length} critérios` : ""}
      </p>
    </div>
  );
}
