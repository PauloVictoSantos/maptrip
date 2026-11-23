"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Search, X } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import type { FollowListResponse, FollowListUser } from "@/lib/follows";

type Tab = FollowListResponse["type"];

/**
 * Modal with a user's followers / following. Each row links to the person's profile
 * and has a follow button reflecting the viewer's own relation to that person.
 */
export function FollowListDialog({
  username,
  name,
  initialTab,
  counts,
  onClose,
  onFollowChange,
}: {
  username: string;
  name: string;
  initialTab: Tab;
  counts: { seguidores: number; seguindo: number };
  onClose: () => void;
  /** Called after the viewer follows/unfollows someone from the list. */
  onFollowChange?: (user: FollowListUser, following: boolean) => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [users, setUsers] = useState<FollowListUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const request = useRef(0);

  const load = useCallback(
    async (reset: boolean, after: string | null) => {
      const id = ++request.current;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ type: tab, limit: "30" });
        if (!reset && after) params.set("cursor", after);
        const res = await fetch(`/api/users/${username}/follows?${params}`);
        const data = (await res.json().catch(() => ({}))) as Partial<FollowListResponse> & { error?: string };
        if (id !== request.current) return;
        if (!res.ok) throw new Error(data.error || "Não foi possível carregar a lista.");
        setUsers((prev) => (reset ? data.users ?? [] : [...prev, ...(data.users ?? []).filter((u) => !prev.some((p) => p.id === u.id))]));
        setCursor(data.nextCursor ?? null);
      } catch (e) {
        if (id === request.current) setError((e as Error).message);
      } finally {
        if (id === request.current) setLoading(false);
      }
    },
    [tab, username]
  );

  useEffect(() => {
    setUsers([]);
    setCursor(null);
    setQuery("");
    load(true, null);
  }, [load]);

  // Escape closes; focus starts inside the dialog and returns to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [onClose]);

  async function toggle(u: FollowListUser) {
    setBusy((b) => ({ ...b, [u.id]: true }));
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, is_following: data.following } : x)));
        onFollowChange?.(u, data.following);
      }
    } finally {
      setBusy((b) => ({ ...b, [u.id]: false }));
    }
  }

  const q = query.trim().toLowerCase();
  const shown = q ? users.filter((u) => u.username.includes(q) || (u.display_name ?? "").toLowerCase().includes(q)) : users;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(20,32,43,0.55)] sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl bg-white outline-none sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <h2 id="follow-title" className="truncate text-lg font-extrabold text-mt-ink">
            {name}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mt-chip">
            <X size={18} />
          </button>
        </div>

        <div role="tablist" aria-label="Lista" className="flex border-b border-mt-line px-3">
          {(
            [
              ["seguidores", `Seguidores (${counts.seguidores})`],
              ["seguindo", `Seguindo (${counts.seguindo})`],
            ] as [Tab, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={tab === v}
              onClick={() => setTab(v)}
              className={`h-11 flex-1 border-b-[3px] text-sm ${tab === v ? "border-mt-teal font-extrabold text-mt-teal-dark" : "border-transparent font-semibold text-mt-ink-2"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {users.length > 8 && (
          <div className="relative px-5 pt-3">
            <label htmlFor="follow-q" className="sr-only">
              Filtrar pessoas
            </label>
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-8 top-1/2 mt-1.5 -translate-y-1/2 text-mt-muted" />
            <input
              id="follow-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar por nome ou @usuário"
              className="h-10 w-full rounded-full border-[1.5px] border-mt-line bg-mt-bg pl-9 pr-4 text-sm focus:border-mt-teal focus:outline-none"
            />
          </div>
        )}

        <div role="tabpanel" className="min-h-[200px] flex-1 overflow-y-auto px-5 py-2">
          {error && (
            <p role="alert" className="py-6 text-center text-sm font-semibold text-[#B42323]">
              {error}{" "}
              <button type="button" onClick={() => load(true, null)} className="underline">
                Tentar de novo
              </button>
            </p>
          )}
          {!loading && !error && users.length === 0 && (
            <p className="py-10 text-center text-sm text-mt-muted">{tab === "seguidores" ? "Ninguém segue este perfil ainda." : "Este perfil ainda não segue ninguém."}</p>
          )}
          {q && shown.length === 0 && users.length > 0 && <p className="py-6 text-center text-sm text-mt-muted">Ninguém com esse nome na lista carregada.</p>}
          <ul>
            {shown.map((u) => {
              const uName = u.display_name || u.username;
              return (
                <li key={u.id} className="flex items-center gap-3 border-b border-mt-line py-2.5 last:border-b-0">
                  <Link href={`/profile/${u.username}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-mt-ink hover:opacity-80">
                    <PersonAvatar name={uName} src={u.avatar_url} size={44} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{uName}</span>
                      <span className="block truncate text-xs text-mt-muted">
                        @{u.username}
                        {u.follows_you && !u.is_me && " · segue você"}
                      </span>
                    </span>
                  </Link>
                  {u.is_me ? (
                    <span className="shrink-0 text-xs font-bold text-mt-muted">Você</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(u)}
                      disabled={busy[u.id]}
                      aria-pressed={u.is_following}
                      aria-label={`${u.is_following ? "Deixar de seguir" : "Seguir"} ${uName}`}
                      className={`h-9 min-w-[96px] shrink-0 rounded-full px-3.5 text-[13px] font-bold disabled:opacity-60 ${
                        u.is_following ? "border-[1.5px] border-mt-line-strong text-mt-ink hover:bg-mt-chip" : "bg-mt-teal text-white hover:bg-mt-teal-dark"
                      }`}
                    >
                      {u.is_following ? (u.follows_you ? "Amigos" : "Seguindo") : u.follows_you ? "Seguir de volta" : "Seguir"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {loading && (
            <div className="flex justify-center py-5 text-mt-muted">
              <Loader2 className="animate-spin" aria-label="Carregando" />
            </div>
          )}
          {!loading && cursor && (
            <button type="button" onClick={() => load(false, cursor)} className="mx-auto my-3 block h-10 rounded-full border-[1.5px] border-mt-line-strong px-5 text-sm font-bold hover:bg-mt-chip">
              Carregar mais
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
