"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import type { PersonResult, UserSearchResponse } from "@/lib/people";

type Option = { kind: "person"; user: PersonResult } | { kind: "places"; q: string };

/**
 * Search box with live people suggestions (by name, @usuário or id).
 * Enter without picking a person searches places, like the old field did.
 * Follows the ARIA combobox pattern: ↑/↓ move, Enter opens, Esc closes.
 */
export function PeopleSearch({ placeholder, className = "" }: { placeholder: string; className?: string }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  const term = q.trim();
  const options: Option[] = [...people.map((user) => ({ kind: "person" as const, user })), ...(term ? [{ kind: "places" as const, q: term }] : [])];

  // Debounced search; aborts the previous request.
  useEffect(() => {
    setActive(-1);
    if (!term) {
      setPeople([]);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    const t = window.setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(term)}&limit=6`, { signal: ctrl.signal });
        const data = (await res.json().catch(() => ({}))) as Partial<UserSearchResponse> & { error?: string };
        if (!res.ok) throw new Error(data.error || "Não foi possível buscar pessoas.");
        setPeople(data.users ?? []);
        setError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setPeople([]);
          setError((e as Error).message);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [term]);

  // Close when clicking outside.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function choose(o: Option) {
    setOpen(false);
    if (o.kind === "person") {
      setQ("");
      router.push(`/profile/${o.user.username}`);
    } else router.push(`/buscar?q=${encodeURIComponent(o.q)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1));
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      } else setQ("");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (open && active >= 0 && options[active]) return choose(options[active]);
    if (term) choose({ kind: "places", q: term });
    else router.push("/buscar");
  }

  const showList = open && term.length > 0;
  const activeId = active >= 0 ? `${listId}-${active}` : undefined;

  return (
    <div ref={box} className={`relative ${className}`}>
      <form role="search" onSubmit={submit}>
        <label htmlFor={`${listId}-input`} className="sr-only">
          Buscar pessoas e lugares
        </label>
        <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-[22px] -translate-y-1/2 text-mt-muted" />
        <input
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          autoComplete="off"
          enterKeyHint="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          maxLength={50}
          className="h-11 w-full rounded-full border-[1.5px] border-mt-line bg-white pl-10 pr-10 text-[15px] placeholder:text-mt-muted focus:border-mt-teal focus:outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setOpen(false);
            }}
            aria-label="Limpar busca"
            className="absolute right-1.5 top-[22px] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-mt-muted hover:bg-mt-chip"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {showList && (
        <div className="absolute left-0 right-0 top-[50px] z-40 overflow-hidden rounded-[16px] border border-mt-line bg-white shadow-[0_12px_32px_rgba(20,32,43,0.16)]">
          <ul id={listId} role="listbox" aria-label="Sugestões" className="max-h-[60vh] overflow-y-auto py-1.5">
            {people.length > 0 && (
              <li role="presentation" className="px-4 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-mt-muted">
                Pessoas
              </li>
            )}
            {options.map((o, i) => {
              const selected = i === active;
              const base = `flex cursor-pointer items-center gap-3 px-4 py-2 ${selected ? "bg-mt-teal-soft" : "hover:bg-mt-bg"}`;
              if (o.kind === "person") {
                const u = o.user;
                const name = u.display_name || u.username;
                const relation = u.is_me ? "Você" : u.is_following && u.follows_you ? "Amigos" : u.is_following ? "Seguindo" : u.follows_you ? "Segue você" : null;
                return (
                  <li
                    key={u.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(o)}
                    onMouseEnter={() => setActive(i)}
                    className={base}
                  >
                    <PersonAvatar name={name} src={u.avatar_url} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-mt-ink">{name}</span>
                      <span className="block truncate text-xs text-mt-muted">
                        @{u.username}
                        {u.city ? ` · ${u.city}` : ""}
                      </span>
                    </span>
                    {relation && <span className="shrink-0 rounded-full bg-mt-chip px-2 py-0.5 text-[11px] font-bold text-mt-ink-2">{relation}</span>}
                  </li>
                );
              }
              return (
                <li
                  key="places"
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  onMouseEnter={() => setActive(i)}
                  className={`${base} ${people.length ? "mt-1 border-t border-mt-line pt-2.5" : ""}`}
                >
                  <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-mt-chip text-mt-teal-dark">
                    <MapPin size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    Buscar lugares por <strong>“{o.q}”</strong>
                  </span>
                </li>
              );
            })}
          </ul>
          <p aria-live="polite" className="px-4 pb-2.5 text-xs text-mt-muted">
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Buscando pessoas…
              </span>
            ) : error ? (
              error
            ) : people.length === 0 ? (
              "Ninguém encontrado com esse nome, @usuário ou ID."
            ) : (
              `${people.length} ${people.length === 1 ? "pessoa encontrada" : "pessoas encontradas"}`
            )}
          </p>
        </div>
      )}
    </div>
  );
}
