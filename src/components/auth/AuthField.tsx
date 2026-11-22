"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  /** Renders the show/hide toggle and switches between password and text. */
  password?: boolean;
  /** Extra element ids for aria-describedby (e.g. the strength meter). */
  describedBy?: string;
};

/** Labelled input with a left icon, focus highlight and an inline error message. */
export function AuthField({ id, label, icon: Icon, error, password, describedBy, className = "", ...input }: Props) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-erro`;
  const describe = [error ? errorId : null, describedBy].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#1F2933]">
        {label}
      </label>
      <div className="relative">
        <Icon
          size={18}
          aria-hidden="true"
          className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${error ? "text-[#B3261E]" : "text-[#8A9199]"}`}
        />
        <input
          id={id}
          {...input}
          type={password ? (visible ? "text" : "password") : input.type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describe}
          className={`h-12 w-full rounded-[10px] border bg-white pl-11 text-[15px] text-[#1F2933] shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#9AA1A9] ${
            password ? "pr-12" : "pr-4"
          } ${
            error
              ? "border-[#D93025] focus:border-[#D93025] focus:ring-4 focus:ring-[#D93025]/15"
              : "border-[#D5DAE0] hover:border-[#B9C0C8] focus:border-mt-teal focus:ring-4 focus:ring-mt-teal/15"
          }`}
        />
        {password && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visible}
            aria-controls={id}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6B7480] transition-colors hover:bg-[#F1F3F5] hover:text-[#1F2933] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mt-teal"
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-[13px] font-medium text-[#B3261E]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Official multicolor Google "G" mark. */
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
