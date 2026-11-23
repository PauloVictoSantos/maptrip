"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { ImagePlus, Loader2, LogOut, Settings, Share2, X } from "lucide-react";
import { computeAchievements, tierIndex, TIER_STYLE } from "@/lib/achievements";
import { BadgeCircle } from "@/components/achievements/BadgeMedal";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { FollowListDialog } from "@/components/profile/FollowListDialog";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { CATEGORY_GROUPS, GROUP_ORDER, formatRatingBR, groupFor, type CategoryGroup } from "@/components/map/categories";
import { PROFILE_LEVELS, profileLevelFor } from "@/lib/points";
import { VISIBILITY_LABEL } from "@/lib/feed";
import { normalize } from "@/lib/search";
import { placeHref } from "@/lib/place";
import type { ProfileVisit } from "@/app/api/users/[username]/visits/route";

const ProfileMap = dynamic(() => import("@/components/profile/ProfileMap"), {
  ssr: false,
  loading: () => <div className="h-[460px] animate-pulse rounded-[20px] bg-mt-land motion-reduce:animate-none" />,
});

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  posts_count: number;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  follows_you?: boolean;
  is_own_profile: boolean;
};

type Tab = "mapa" | "visitas" | "fotos";

function shortDate(v: ProfileVisit) {
  const d = v.visit_date ? new Date(`${v.visit_date}T12:00:00`) : new Date(v.created_at);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "hoje";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { refresh: refreshSession, signOut } = useAuthContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [visits, setVisits] = useState<ProfileVisit[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("mapa");
  const [followBusy, setFollowBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [followList, setFollowList] = useState<"seguidores" | "seguindo" | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [pRes, vRes] = await Promise.all([fetch(`/api/users/${username}`), fetch(`/api/users/${username}/visits`)]);
      const p = await pRes.json();
      if (!pRes.ok) throw new Error(p.error || "Perfil não encontrado.");
      setProfile(p);
      const v = await vRes.json();
      setVisits(vRes.ok ? v.visits : []);
      document.title = `${p.display_name || p.username} · MapTrip`;
    } catch (e: any) {
      setError(e.message);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(t);
  }, [notice]);

  const stats = useMemo(() => {
    const list = visits ?? [];
    const places = new Set(list.map((v) => `${normalize(v.place_name)}|${v.lat.toFixed(3)},${v.lng.toFixed(3)}`));
    const byGroup = {} as Record<CategoryGroup, number>;
    for (const v of list) {
      const g = groupFor(v.category);
      byGroup[g] = (byGroup[g] ?? 0) + 1;
    }
    const points = list.reduce((s, v) => s + v.points, 0);
    // Same badges as /conquistas, most valuable first.
    const badges = computeAchievements(list)
      .badges.filter((b) => b.tier)
      .sort((a, b) => tierIndex(b.tier) - tierIndex(a.tier));

    return { places: places.size, byGroup, points, badges };
  }, [visits]);

  async function toggleFollow() {
    if (!profile) return;
    setFollowBusy(true);
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: profile.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile({
          ...profile,
          is_following: data.following,
          followers_count: profile.followers_count + (data.following ? 1 : -1),
        });
      } else setNotice(data.error || "Não foi possível seguir");
    } finally {
      setFollowBusy(false);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: profile?.display_name || profile?.username, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Link do perfil copiado");
      }
    } catch {
      /* dismissed */
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-lg font-extrabold text-mt-ink">{error}</p>
        <Link href="/feed" className="mt-4 inline-flex h-11 items-center rounded-full bg-mt-teal px-5 text-sm font-bold text-white">
          Voltar ao feed
        </Link>
      </div>
    );
  }
  if (!profile || !visits) return <ProfileSkeleton />;

  const name = profile.display_name || profile.username;
  const level = profileLevelFor(stats.points);
  const maxGroup = Math.max(1, ...Object.values(stats.byGroup));
  const photos = visits.flatMap((v) => v.photos.map((url) => ({ url, visit: v })));

  return (
    <div className="bg-mt-bg text-mt-ink">
      <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-6 md:px-6">
        {/* Header */}
        <section className="rounded-3xl border border-mt-line bg-white p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-x-7 gap-y-5">
            <PersonAvatar name={name} src={profile.avatar_url} size={112} className="border-4 border-[#F59F45]" />
            <div className="min-w-0 flex-[1_1_300px]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-[26px] font-extrabold leading-9 tracking-[-0.5px] md:text-[30px]">{name}</h1>
                <span className="inline-flex h-7 items-center rounded-full bg-[#FDF0E3] px-3 text-[13px] font-extrabold text-[#9A4508]">
                  {level.label} · {stats.points} pts
                </span>
              </div>
              <div className="mt-1 text-sm text-mt-muted">
                @{profile.username}
                {profile.city ? ` · ${profile.city}` : ""}
              </div>
              {profile.bio && <p className="mt-2.5 text-[15px] leading-[22px]">{profile.bio}</p>}
            </div>
            <dl className="flex flex-wrap gap-7">
              {[
                [visits.length, "Visitas"],
                [stats.places, "Lugares"],
                [profile.followers_count, "Seguidores"],
                [profile.following_count, "Seguindo"],
              ].map(([n, label]) => {
                const list = label === "Seguidores" ? "seguidores" : label === "Seguindo" ? "seguindo" : null;
                return (
                  <div key={label} className="flex flex-col-reverse">
                    <dt className="text-[13px] font-semibold text-mt-muted">{label}</dt>
                    <dd className="text-[22px] font-extrabold">
                      {list ? (
                        // Followers / following open the list of people.
                        <button
                          type="button"
                          onClick={() => setFollowList(list)}
                          aria-label={`Ver ${String(label).toLowerCase()} (${n})`}
                          className="rounded-lg hover:text-mt-teal-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mt-teal"
                        >
                          {n}
                        </button>
                      ) : (
                        n
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <div className="flex flex-wrap gap-2">
              {profile.is_own_profile ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="h-11 rounded-xl border-[1.5px] border-mt-line-strong px-[18px] text-sm font-bold hover:bg-mt-chip"
                >
                  Editar perfil
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={followBusy}
                  aria-pressed={profile.is_following}
                  className={`h-11 min-w-[110px] rounded-xl px-[18px] text-sm font-bold disabled:opacity-60 ${
                    profile.is_following ? "border-[1.5px] border-mt-teal text-mt-teal-dark hover:bg-mt-teal-soft" : "bg-mt-teal text-white hover:bg-mt-teal-dark"
                  }`}
                >
                  {profile.is_following
                    ? profile.follows_you
                      ? "Amigos"
                      : "Seguindo"
                    : profile.follows_you
                    ? "Seguir de volta"
                    : "Seguir"}
                </button>
              )}
              <button
                type="button"
                onClick={share}
                aria-label="Compartilhar perfil"
                className="flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] border-mt-line-strong hover:bg-mt-chip"
              >
                <Share2 size={20} />
              </button>
              {/* Settings and sign-out live here (not in the nav bars). */}
              {profile.is_own_profile && (
                <>
                  <Link
                    href="/configuracoes"
                    aria-label="Configurações"
                    title="Configurações"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] border-mt-line-strong hover:bg-mt-chip"
                  >
                    <Settings size={20} />
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-mt-line-strong px-3.5 text-sm font-bold text-[#B42323] hover:bg-[#FBEAE8]"
                  >
                    <LogOut size={18} aria-hidden="true" />
                    Sair
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="mt-5">
            <div
              role="progressbar"
              aria-label="Progresso de nível"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(level.pct * 100)}
              className="h-2.5 overflow-hidden rounded-full bg-mt-line"
            >
              <div className="h-2.5 rounded-full bg-[#E8590C]" style={{ width: `${Math.round(level.pct * 100)}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-1.5 text-[13px] font-semibold text-mt-muted">
              <span>
                {PROFILE_LEVELS.map((l, i) => (
                  <span key={l.label}>
                    {i > 0 && " → "}
                    {i === level.index ? <strong className="text-[#9A4508]">{l.label}</strong> : l.label}
                  </span>
                ))}
              </span>
              <span>{level.next ? `Faltam ${level.missing} pts para ${level.next.label}` : "Nível máximo"}</span>
            </div>
          </div>
          <p aria-live="polite" className={notice ? "mt-2 text-sm font-semibold text-mt-teal-dark" : "sr-only"}>
            {notice}
          </p>
        </section>

        {/* Tabs */}
        <div role="tablist" aria-label="Perfil" className="mt-5 flex flex-wrap gap-1 border-b border-mt-line">
          {(
            [
              ["mapa", "Mapa pessoal"],
              ["visitas", `Visitas (${visits.length})`],
              ["fotos", `Fotos (${photos.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`h-12 border-b-[3px] px-4 text-sm ${
                tab === value ? "border-mt-teal font-extrabold text-mt-teal-dark" : "border-transparent font-semibold text-mt-ink-2 hover:text-mt-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {visits.length === 0 ? (
          <div className="mt-6 rounded-[20px] border border-dashed border-mt-line-strong bg-white px-6 py-10 text-center">
            <p className="text-base font-extrabold">Nenhuma visita para mostrar</p>
            {profile.is_own_profile && (
              <Link href="/post/new" className="mt-4 inline-flex h-10 items-center rounded-full bg-mt-teal px-5 text-sm font-bold text-white">
                Registrar primeira visita
              </Link>
            )}
          </div>
        ) : tab === "mapa" ? (
          <>
            <div role="tabpanel" className="mt-5 flex flex-wrap items-start gap-6">
              <div className="min-w-0 flex-[999_1_560px]">
                <ProfileMap visits={visits} />
              </div>
              <aside className="flex flex-[1_1_300px] flex-col gap-3.5">
                <div className="rounded-[18px] border border-mt-line bg-white p-4">
                  <h2 className="mb-1.5 text-[15px] font-extrabold">Tipos de lugar visitados</h2>
                  <ul className="flex flex-col text-[13px] font-semibold">
                    {GROUP_ORDER.filter((g) => stats.byGroup[g])
                      .sort((a, b) => stats.byGroup[b] - stats.byGroup[a])
                      .map((g) => (
                        <li key={g} className="flex h-[30px] items-center gap-2.5">
                          <span className="w-[92px]">{CATEGORY_GROUPS[g].label}</span>
                          <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded bg-mt-chip">
                            <span className="block h-2" style={{ width: `${(stats.byGroup[g] / maxGroup) * 100}%`, background: CATEGORY_GROUPS[g].color }} />
                          </span>
                          <span className="w-6 text-right font-extrabold">{stats.byGroup[g]}</span>
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="rounded-[18px] border border-mt-line bg-white p-4">
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <h2 className="text-[15px] font-extrabold">Selos</h2>
                    {profile.is_own_profile && (
                      <Link href="/conquistas" className="text-[13px] font-bold text-mt-teal-dark hover:underline">
                        Ver todos
                      </Link>
                    )}
                  </div>
                  {stats.badges.length ? (
                    <ul className="grid grid-cols-3 gap-x-2 gap-y-3">
                      {stats.badges.slice(0, 6).map((b) => (
                        <li key={b.id} className="flex flex-col items-center gap-1 text-center">
                          <BadgeCircle id={b.id} tier={b.tier} size={52} />
                          <span className="text-[11px] font-bold leading-[14px]">{b.name}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: TIER_STYLE[b.tier!].ink }}>
                            {TIER_STYLE[b.tier!].label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-mt-muted">Os selos aparecem conforme as visitas são registradas.</p>
                  )}
                </div>
              </aside>
            </div>

            <div className="mt-7 flex items-center justify-between">
              <h2 className="text-[19px] font-extrabold">Visitas recentes</h2>
              {visits.length > 4 && (
                <button type="button" onClick={() => setTab("visitas")} className="h-9 px-2 text-sm font-bold text-mt-teal-dark hover:underline">
                  Ver todas as {visits.length}
                </button>
              )}
            </div>
            <VisitGrid visits={visits.slice(0, 4)} showPoints={profile.is_own_profile} />
          </>
        ) : tab === "visitas" ? (
          <div role="tabpanel">
            <VisitGrid visits={visits} showPoints={profile.is_own_profile} />
          </div>
        ) : (
          <div role="tabpanel" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {photos.length === 0 && <p className="col-span-full text-sm text-mt-muted">Nenhuma foto ainda.</p>}
            {photos.map((p, i) => (
              <Link key={i} href={`/post/${p.visit.id}`} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Foto em ${p.visit.place_name}`} loading="lazy" className="aspect-square w-full rounded-2xl bg-mt-chip object-cover" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {followList && (
        <FollowListDialog
          username={profile.username}
          name={name}
          initialTab={followList}
          counts={{ seguidores: profile.followers_count, seguindo: profile.following_count }}
          onClose={() => setFollowList(null)}
          onFollowChange={(_u, following) => {
            // On your own profile, following/unfollowing someone changes your "Seguindo" count.
            if (profile.is_own_profile) {
              setProfile((p) => (p ? { ...p, following_count: Math.max(0, p.following_count + (following ? 1 : -1)) } : p));
            }
          }}
        />
      )}

      {editing && (
        <EditProfile
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={(p) => {
            setProfile({ ...profile, ...p });
            setEditing(false);
            refreshSession();
            setNotice("Perfil atualizado");
          }}
        />
      )}
    </div>
  );
}

function VisitGrid({ visits, showPoints }: { visits: ProfileVisit[]; showPoints: boolean }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {visits.map((v) => {
        const g = CATEGORY_GROUPS[groupFor(v.category)];
        const href = v.visibility === "public" ? placeHref(v.place_name, v.lat, v.lng) : `/post/${v.id}`;
        return (
          <Link key={v.id} href={href} className="overflow-hidden rounded-[18px] border border-mt-line bg-white text-mt-ink hover:border-mt-line-strong">
            <span className="relative flex h-[130px] items-center justify-center" style={{ background: g.soft, color: g.color }}>
              {v.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.photos[0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {g.paths.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </svg>
              )}
            </span>
            <span className="block px-3.5 py-3">
              <span className="block truncate text-[15px] font-extrabold">{v.place_name}</span>
              <span className="mt-1 block text-xs text-mt-muted">
                {v.rating > 0 && <strong className="text-[#9A4508]">★ {formatRatingBR(v.rating)}</strong>}
                {v.rating > 0 && " · "}
                {shortDate(v)} · {VISIBILITY_LABEL[v.visibility]}
                {showPoints && ` · +${v.points} pts`}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function EditProfile({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: (p: Partial<Profile>) => void;
}) {
  const [form, setForm] = useState({
    display_name: profile.display_name ?? "",
    bio: profile.bio ?? "",
    city: profile.city ?? "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha uma imagem (JPG, PNG ou WebP).");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.append("file", await toAvatarBlob(file), "avatar.jpg");
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível enviar a foto.");
      setAvatarUrl(json.url);
    } catch (err: any) {
      setError(err.message || "Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, avatar_url: avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar.");
      onSaved(data.profile);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  const field = "mt-1.5 w-full rounded-[12px] border-[1.5px] border-mt-line-strong px-3.5 text-[15px] focus:border-mt-teal focus:outline-none";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(20,32,43,0.55)] p-0 sm:items-center sm:p-6" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-titulo"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="editar-titulo" className="text-lg font-extrabold">
            Editar perfil
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-full bg-mt-chip">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <span className="relative">
            <PersonAvatar name={form.display_name || profile.username} src={avatarUrl} size={80} />
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                <Loader2 size={22} className="animate-spin text-mt-teal-dark" aria-label="Enviando foto" />
              </span>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <label className="flex h-10 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-mt-teal px-4 text-sm font-bold text-mt-teal-dark focus-within:ring-2 focus-within:ring-mt-teal-soft hover:bg-mt-teal-soft">
              <ImagePlus size={16} aria-hidden="true" />
              {avatarUrl ? "Trocar foto" : "Adicionar foto"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pickAvatar} disabled={uploading} className="sr-only" />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                disabled={uploading}
                className="h-10 rounded-full px-3 text-sm font-bold text-mt-muted hover:bg-mt-chip hover:text-mt-ink"
              >
                Remover
              </button>
            )}
          </div>
        </div>
        <label className="mt-4 block text-sm font-bold">
          Nome
          <input
            autoFocus
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            maxLength={60}
            className={`${field} h-11`}
          />
        </label>
        <label className="mt-3 block text-sm font-bold">
          Cidade
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={80} className={`${field} h-11`} />
          <span className="mt-1 block text-xs font-medium text-mt-muted">Usada para centralizar o mapa e a busca. Nunca mostramos seu endereço.</span>
        </label>
        <label className="mt-3 block text-sm font-bold">
          Bio
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            maxLength={200}
            rows={3}
            className={`${field} resize-none py-2.5`}
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 text-sm font-semibold text-[#B42323]">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-full px-5 text-sm font-bold hover:bg-mt-chip">
            Cancelar
          </button>
          <button type="submit" disabled={saving || uploading} className="flex h-11 items-center gap-2 rounded-full bg-mt-teal px-6 text-sm font-bold text-white hover:bg-mt-teal-dark disabled:opacity-60">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}

/** Square-crops and shrinks a photo to at most 512×512 JPEG before upload. */
async function toAvatarBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível processar a imagem."))), "image/jpeg", 0.88)
  );
}

function ProfileSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-[1200px] px-4 pt-6 md:px-6">
      <div className="flex items-center gap-6 rounded-3xl border border-mt-line bg-white p-6">
        <span className="h-28 w-28 animate-pulse rounded-full bg-mt-chip motion-reduce:animate-none" />
        <span className="flex-1 space-y-3">
          <span className="block h-7 w-1/3 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
          <span className="block h-4 w-1/4 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
        </span>
      </div>
      <div className="mt-6 h-[460px] animate-pulse rounded-[20px] bg-mt-chip motion-reduce:animate-none" />
    </div>
  );
}
