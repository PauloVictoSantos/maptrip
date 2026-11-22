"use client";

import { useMemo, useState } from "react";
import { Check, X as XIcon, Sparkles, ChevronDown } from "lucide-react";
import { getQuestionsForCategory } from "@/lib/questions";

type Props = {
  category: string | null;
  answers: Record<string, string>;
  onChange: (key: string, value: string) => void;
};

export function PlaceQuestionnaire({ category, answers, onChange }: Props) {
  const questions = useMemo(() => getQuestionsForCategory(category), [category]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (questions.length === 0) return null;

  const answeredCount = questions.filter((q) => answers[q.key] !== undefined).length;
  const total = questions.length;
  const pct = Math.round((answeredCount / total) * 100);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
      {/* Header, Maps-style "Contribute" banner */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Sparkles size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-gray-900 leading-tight">
            Perguntas rápidas sobre o local
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Ajude outras pessoas com respostas rápidas. Opcional.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs font-semibold text-emerald-600">
            {answeredCount}/{total}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-gray-50">
        <div
          className="h-full bg-emerald-500 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Question list */}
      <ul className="divide-y divide-gray-50">
        {questions.map((q) => {
          const answered = answers[q.key] !== undefined;
          const isCollapsed = collapsed[q.key];

          return (
            <li key={q.key} className="px-4 py-3.5">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [q.key]: !prev[q.key] }))
                }
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span
                  className={`text-sm font-medium leading-snug ${
                    answered ? "text-gray-500" : "text-gray-900"
                  }`}
                >
                  {q.label}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {answered && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    className={`text-gray-300 transition-transform ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                  />
                </span>
              </button>

              {!isCollapsed && (
                <div className="mt-3">
                  {q.type === "boolean" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onChange(q.key, "sim")}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2 text-sm font-medium transition-all active:scale-[0.97] ${
                          answers[q.key] === "sim"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <Check size={15} />
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange(q.key, "nao")}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2 text-sm font-medium transition-all active:scale-[0.97] ${
                          answers[q.key] === "nao"
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <XIcon size={15} />
                        Não
                      </button>
                    </div>
                  )}

                  {q.type === "scale_1_5" && (
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => onChange(q.key, String(n))}
                          className={`flex h-9 flex-1 items-center justify-center rounded-full border text-sm font-semibold transition-all active:scale-[0.97] ${
                            answers[q.key] === String(n)
                              ? "border-emerald-400 bg-emerald-600 text-white"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === "choice" && q.choices && (
                    <div className="flex flex-wrap gap-1.5">
                      {q.choices.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => onChange(q.key, c.value)}
                          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all active:scale-[0.97] ${
                            answers[q.key] === c.value
                              ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}