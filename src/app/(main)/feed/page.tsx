"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BedDouble,
  Compass,
  Luggage,
  Trophy,
  Bookmark,
  Camera,
  CheckCircle2,
  Coffee,
  Home,
  Landmark,
  Loader2,
  Map,
  MapPin,
  Search,
  ShoppingBag,
  Trees,
  User,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { VisitCard } from "@/components/feed/VisitCard";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { CATEGORY_GROUPS, formatRatingBR, groupFor } from "@/components/map/categories";
import { POST_CATEGORIES } from "@/lib/types";
import { haversineKm } from "@/lib/search";
import { placeHref } from "@/lib/place";
import {
  FEED_FILTERS,
  type FeedFilterId,
  type FeedPost,
  type FeedResponse,
  type FeedTab,
  type SidebarResponse,
  type TrendingPlace,
} from "@/lib/feed";

const FriendsMiniMap = dynamic(() => import("@/components/feed/FriendsMiniMap"), {
  ssr: false,
  loading: () => <div className="h-[180px] animate-pulse bg-mt-land motion-reduce:animate-none" />,
});

type Center = { lat: number; lng: number };
type CityState = { status: "none" | "loading" | "ready" | "failed"; center: Center | null };

const FILTER_ICONS: Record<FeedFilterId, LucideIcon | null> = {
  todos: null,
  comer: Utensils,
  bares: Wine,
  cafes: Coffee,
  museus: Landmark,
  natureza: Trees,
  hoteis: BedDouble,
  compras: ShoppingBag,
};

/** Geocodes the profile city once (Nominatim) and caches it in localStorage. */
function useCityCenter(city: string | null | undefined, authReady: boolean): CityState {
  const [state, setState] = useState<CityState>({ status: "loading", center: null });
  useEffect(() => {
    if (!authReady) return;
    const name = city?.trim();
    if (!name) {
      setState({ status: "none", center: null });
      return;
    }
    const key = `mt:city:${name.toLowerCase()}`;
    try {
      const cached = JSON.parse(localStorage.getItem(key) ?? "null");
      if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
        setState({ status: "ready", center: { lat: cached.lat, lng: cached.lng } });
        return;
      }
    } catch {
      /* storage unavailable */
    }
    let alive = true;
    setState({ status: "loading", center: null });
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(name)}`, {
      headers: { "Accept-Language": "pt-BR" },
    })
      .then((r) => r.json())
      .then((list) => {
        if (!alive) return;
        const lat = parseFloat(list?.[0]?.lat);
        const lng = parseFloat(list?.[0]?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("not found");
        try {
          localStorage.setItem(key, JSON.stringify({ lat, lng }));
        } catch {
          /* storage unavailable */
        }
        setState({ status: "ready", center: { lat, lng } });
      })
      .catch(() => alive && setState({ status: "failed", center: null }));
    return () => {
      alive = false;
    };
  }, [city, authReady]);
  return state;
}

function formatKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString("pt-BR", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

export default function FeedPage() {
  const { profile, user, loading: authLoading } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  const city = useCityCenter(profile?.city, !authLoading);
  const cityName = profile?.city?.split(",")[0].trim() || "";
  const near = city.center ? `${city.center.lat.toFixed(4)},${city.center.lng.toFixed(4)}` : null;

  const [tab, setTab] = useState<FeedTab>("friends");
  const [filter, setFilter] = useState<FeedFilterId>("todos");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [sidebar, setSidebar] = useState<SidebarResponse | null>(null);
  const [followState, setFollowState] = useState<Record<string, "following" | "busy">>({});
  const sentinel = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const viewer = profile
    ? { id: profile.id, name: profile.display_name || profile.username, avatar_url: profile.avatar_url }
    : null;

  // ---- Feed --------------------------------------------------------------
  const loadPage = useCallback(
    async (reset: boolean) => {
      const id = ++requestId.current;
      reset ? setLoading(true) : setLoadingMore(true);
      setError("");
      try {
        const params = new URLSearchParams({ tab, limit: "10" });
        if (filter !== "todos") params.set("filter", filter);
        if (tab === "city" && near) params.set("near", near);
        if (!reset && cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/feed?${params}`);
        const data = await res.json();
        if (id !== requestId.current) return; // a newer request (tab switch) won
        if (!res.ok) throw new Error(data.error || "Erro ao carregar o feed.");
        const page = data as FeedResponse;
        setPosts((prev) => (reset ? page.posts : [...prev, ...page.posts.filter((p) => !prev.some((x) => x.id === p.id))]));
        setCursor(page.nextCursor);
        setHasMore(!!page.nextCursor);
      } catch (err: any) {
        if (id === requestId.current) setError(err?.message || "Erro de conexão.");
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [tab, cursor, filter, near]
  );

  // The city tab only exists while the city could be located.
  const cityTab = city.status === "ready" && cityName;
  useEffect(() => {
    if (tab === "city" && (city.status === "none" || city.status === "failed")) setTab("friends");
  }, [tab, city.status]);

  useEffect(() => {
    if (tab === "city" && !near) return; // wait for the city center
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filter, near]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) loadPage(false);
      },
      { rootMargin: "600px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, loadPage]);

  // ---- Sidebar -----------------------------------------------------------
  useEffect(() => {
    if (city.status === "loading") return; // "Em alta perto de você" needs the city first
    const qs = near ? `?near=${near}` : "";
    fetch(`/api/feed/sidebar${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSidebar(d))
      .catch(() => undefined);
  }, [user?.id, city.status, near]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar");
  }

  // ---- Actions -----------------------------------------------------------
  function toggleLikeLocal(id: string) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, is_liked: !p.is_liked, likes_count: p.likes_count + (p.is_liked ? -1 : 1) } : p
      )
    );
  }

  async function handleLike(id: string) {
    toggleLikeLocal(id); // optimistic
    try {
      const res = await fetch(`/api/posts/${id}/like`, { method: "POST" });
      if (!res.ok) toggleLikeLocal(id);
    } catch {
      toggleLikeLocal(id);
    }
  }

  async function follow(userId: string) {
    setFollowState((s) => ({ ...s, [userId]: "busy" }));
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      setFollowState((s) => {
        const next = { ...s };
        if (res.ok && data.following) next[userId] = "following";
        else delete next[userId];
        return next;
      });
      if (res.ok && tab === "friends") loadPage(true);
    } catch {
      setFollowState((s) => {
        const next = { ...s };
        delete next[userId];
        return next;
      });
    }
  }

  const name = profile?.display_name || profile?.username || "";
  const nav = [
    { href: "/feed", label: "Início", icon: Home },
    { href: "/map", label: "Mapa", icon: Map },
    { href: "/buscar", label: "Buscar lugares", icon: Search },
    { href: "/quero-visitar", label: "Quero visitar", icon: Bookmark },
    { href: "/ja-visitei", label: "Já visitei", icon: CheckCircle2 },
    { href: "/viagens", label: "Viagens", icon: Luggage },
    { href: "/destino", label: "Destinos", icon: Compass },
    { href: "/conquistas", label: "Conquistas", icon: Award },
    { href: "/ranking", label: "Ranking", icon: Trophy },
    ...(profile ? [{ href: `/profile/${profile.username}`, label: "Perfil", icon: User }] : []),
  ];

  return (
    <div className="bg-mt-bg text-mt-ink">
      <div className="mx-auto flex max-w-[1240px] items-start gap-6 px-4 py-6 md:px-6">
        {/* ---------------- Left column ---------------- */}
        <aside className="sticky top-[88px] hidden w-[240px] shrink-0 flex-col gap-3 lg:flex">
          {profile && (
            <Link href={`/profile/${profile.username}`} className="block rounded-[18px] border border-mt-line bg-white p-4 text-mt-ink hover:border-mt-line-strong">
              <span className="flex items-center gap-2.5">
                <PersonAvatar name={name} src={profile.avatar_url} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-extrabold">{name}</span>
                  <span className="block truncate text-xs text-mt-muted">
                    @{profile.username}
                    {profile.city ? ` · ${profile.city}` : ""}
                  </span>
                </span>
              </span>
              {sidebar?.me && (
                <span className="mt-3 grid grid-cols-3 gap-1 text-center">
                  {[
                    [sidebar.me.posts_count, "visitas"],
                    [sidebar.me.followers_count, "seguidores"],
                    [sidebar.me.following_count, "seguindo"],
                  ].map(([n, label]) => (
                    <span key={label} className="rounded-xl bg-mt-bg py-2">
                      <span className="block text-[15px] font-extrabold">{n}</span>
                      <span className="block text-[11px] font-semibold text-mt-muted">{label}</span>
                    </span>
                  ))}
                </span>
              )}
            </Link>
          )}
          <nav aria-label="Seções" className="flex flex-col rounded-[18px] border border-mt-line bg-white p-2">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm ${
                    active ? "bg-mt-teal-soft font-extrabold text-mt-teal-dark" : "font-semibold text-mt-ink-2 hover:bg-mt-bg"
                  }`}
                >
                  <item.icon size={20} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* ---------------- Feed ---------------- */}
        <main className="mx-auto flex min-w-0 max-w-[680px] flex-1 flex-col gap-4">
          {/* Page header */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-extrabold tracking-[-0.3px]">Início</h1>
            <form role="search" onSubmit={submitSearch} className="relative min-w-[200px] flex-1">
              <label htmlFor="feed-search" className="sr-only">
                Buscar lugares
              </label>
              <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mt-muted" />
              <input
                id="feed-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={cityName ? `Buscar lugares em ${cityName}` : "Buscar lugares e cidades"}
                maxLength={120}
                className="h-11 w-full rounded-full border-[1.5px] border-mt-line bg-white pl-10 pr-4 text-[15px] placeholder:text-mt-muted focus:border-mt-teal focus:outline-none"
              />
            </form>
          </div>

          {/* Composer */}
          <div className="flex items-center gap-3 rounded-[18px] border border-mt-line bg-white px-4 py-3.5">
            <PersonAvatar name={name || "Você"} src={profile?.avatar_url} className="hidden sm:flex" />
            <Link
              href="/post/new"
              className="flex h-11 min-w-0 flex-1 items-center rounded-full bg-mt-chip px-4 text-[15px] font-medium text-mt-muted hover:bg-mt-line"
            >
              <span className="truncate">Onde você esteve hoje?</span>
            </Link>
            <Link href="/post/new" className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-mt-teal-dark hover:bg-mt-teal-soft">
              <Camera size={18} strokeWidth={2.2} aria-hidden="true" />
              <span className="hidden sm:inline">Fotos</span>
              <span className="sr-only sm:hidden">Registrar com fotos</span>
            </Link>
            <Link href="/map" className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-mt-teal-dark hover:bg-mt-teal-soft">
              <MapPin size={18} strokeWidth={2.2} aria-hidden="true" />
              <span className="hidden sm:inline">No mapa</span>
              <span className="sr-only sm:hidden">Abrir mapa</span>
            </Link>
          </div>

          {/* Tabs */}
          <div role="group" aria-label="Feed" className="flex gap-1 self-start rounded-full bg-[#E9ECEA] p-1">
            {(
              [
                ["friends", "Amigos"],
                ["discover", "Descobrir"],
                ...(cityTab ? ([["city", cityName]] as const) : []),
              ] as [FeedTab, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
                className={`h-10 rounded-full px-[22px] text-sm ${
                  tab === value
                    ? "bg-white font-extrabold text-mt-teal-dark shadow-[0_1px_3px_rgba(20,32,43,0.12)]"
                    : "font-semibold text-mt-ink-2 hover:bg-white/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Category chips */}
          <div role="group" aria-label="Categorias" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {FEED_FILTERS.map((f) => {
              const Icon = FILTER_ICONS[f.id];
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.id)}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-[13px] ${
                    active
                      ? "border-mt-teal bg-mt-teal-soft font-extrabold text-mt-teal-dark"
                      : "border-mt-line bg-white font-semibold text-mt-ink-2 hover:border-mt-line-strong"
                  }`}
                >
                  {Icon && <Icon size={15} strokeWidth={2.2} aria-hidden="true" />}
                  {f.label}
                </button>
              );
            })}
          </div>

          {error && (
            <div role="alert" className="rounded-xl bg-[#FFF0F0] px-4 py-3 text-sm font-semibold text-[#B42323]">
              {error}{" "}
              <button type="button" onClick={() => loadPage(true)} className="underline">
                Tentar novamente
              </button>
            </div>
          )}

          {loading ? (
            <FeedSkeleton />
          ) : posts.length === 0 && !error ? (
            <div className="rounded-[20px] border border-dashed border-mt-line-strong bg-white px-6 py-10 text-center">
              {filter !== "todos" ? (
                <>
                  <p className="text-base font-extrabold">
                    Nenhuma visita em {FEED_FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} por aqui
                  </p>
                  <p className="mt-1 text-sm text-mt-muted">Tente outra categoria ou veja todas as visitas.</p>
                  <button
                    type="button"
                    onClick={() => setFilter("todos")}
                    className="mt-4 h-10 rounded-full border-[1.5px] border-mt-teal px-5 text-sm font-bold text-mt-teal-dark hover:bg-mt-teal-soft"
                  >
                    Ver tudo
                  </button>
                </>
              ) : tab === "city" ? (
                <>
                  <p className="text-base font-extrabold">Nenhuma visita pública em {cityName} ainda</p>
                  <p className="mt-1 text-sm text-mt-muted">Registre um lugar da sua cidade e seja a primeira pessoa a aparecer aqui.</p>
                </>
              ) : tab === "friends" ? (
                <>
                  <p className="text-base font-extrabold">Nada por aqui ainda</p>
                  <p className="mt-1 text-sm text-mt-muted">
                    Siga pessoas para ver as visitas delas, ou registre a sua primeira.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTab("discover")}
                      className="h-10 rounded-full border-[1.5px] border-mt-teal px-5 text-sm font-bold text-mt-teal-dark hover:bg-mt-teal-soft"
                    >
                      Ver Descobrir
                    </button>
                    <Link href="/post/new" className="flex h-10 items-center rounded-full bg-mt-teal px-5 text-sm font-bold text-white hover:bg-mt-teal-dark">
                      Registrar visita
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-base font-extrabold">Nenhuma visita pública ainda</p>
                  <p className="mt-1 text-sm text-mt-muted">Seja a primeira pessoa a compartilhar um lugar.</p>
                </>
              )}
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <VisitCard
                  key={post.id}
                  post={post}
                  viewer={viewer}
                  onLike={handleLike}
                  onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                />
              ))}
              <div ref={sentinel} />
              {loadingMore && (
                <div className="flex justify-center py-4 text-mt-muted">
                  <Loader2 size={22} className="animate-spin" aria-label="Carregando mais visitas" />
                </div>
              )}
              {hasMore && !loadingMore && (
                <button
                  type="button"
                  onClick={() => loadPage(false)}
                  className="mx-auto h-11 rounded-full border-[1.5px] border-mt-line-strong bg-white px-6 text-sm font-bold hover:bg-mt-chip"
                >
                  Carregar mais
                </button>
              )}
              {!hasMore && posts.length > 3 && (
                <p className="py-2 text-center text-xs font-semibold text-mt-muted">Você viu tudo por enquanto.</p>
              )}
            </>
          )}
        </main>

        {/* ---------------- Right column ---------------- */}
        <aside className="sticky top-[88px] hidden w-[300px] shrink-0 flex-col gap-3 xl:flex">
          <div className="overflow-hidden rounded-[18px] border border-mt-line bg-white">
            <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5">
              <h2 className="text-[15px] font-extrabold">Amigos no mapa</h2>
              <Link href="/map" className="py-1.5 text-[13px] font-bold text-mt-teal-dark hover:underline">
                Abrir mapa
              </Link>
            </div>
            {sidebar && sidebar.friendsOnMap.length > 0 && <FriendsMiniMap friends={sidebar.friendsOnMap} />}
            <p className="px-4 pb-3.5 pt-2.5 text-[13px] text-mt-muted">
              {!sidebar
                ? "Carregando…"
                : sidebar.friendsOnMap.length === 0
                ? "Ninguém que você segue registrou visitas esta semana."
                : `${sidebar.friendsOnMap.length} ${
                    sidebar.friendsOnMap.length === 1 ? "amigo registrou" : "amigos registraram"
                  } visitas esta semana`}
              {sidebar && sidebar.friendsOnMap.length > 0 && (
                <span className="mt-1 block text-xs">Mostra a última visita de cada pessoa, só do que ela compartilha com você.</span>
              )}
            </p>
          </div>

          {sidebar && sidebar.trending.length > 0 && (
            <div className="rounded-[18px] border border-mt-line bg-white px-4 py-3.5">
              <h2 className="mb-2.5 text-[15px] font-extrabold">{near ? "Em alta perto de você" : "Em alta esta semana"}</h2>
              <ol className="flex flex-col gap-2.5">
                {sidebar.trending.map((t) => (
                  <li key={t.post_id}>
                    <TrendingCard place={t} center={city.center} />
                  </li>
                ))}
              </ol>
            </div>
          )}

          {sidebar && sidebar.suggestions.length > 0 && (
            <div className="rounded-[18px] border border-mt-line bg-white px-4 py-3.5">
              <h2 className="mb-2 text-[15px] font-extrabold">Sugestões para seguir</h2>
              {sidebar.suggestions.map((s, i) => {
                const sName = s.user.display_name || s.user.username;
                const state = followState[s.user.id];
                return (
                  <div key={s.user.id} className={`flex items-center gap-2.5 py-2 ${i ? "border-t border-[#EEF0EE]" : ""}`}>
                    <Link href={`/profile/${s.user.username}`} aria-label={`Perfil de ${sName}`}>
                      <PersonAvatar name={sName} src={s.user.avatar_url} size={40} />
                    </Link>
                    <span className="min-w-0 flex-1">
                      <Link href={`/profile/${s.user.username}`} className="block truncate text-sm font-bold text-mt-ink hover:underline">
                        {sName}
                      </Link>
                      <span className="block truncate text-xs text-mt-muted">
                        {s.mutual > 0
                          ? `Seguido por ${s.mutual} ${s.mutual === 1 ? "pessoa" : "pessoas"} que você segue`
                          : `${s.posts_count} ${s.posts_count === 1 ? "visita pública" : "visitas públicas"}`}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => follow(s.user.id)}
                      disabled={state === "busy"}
                      aria-pressed={state === "following"}
                      className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-bold disabled:opacity-60 ${
                        state === "following"
                          ? "border-[1.5px] border-mt-teal bg-white text-mt-teal-dark"
                          : "bg-mt-teal text-white hover:bg-mt-teal-dark"
                      }`}
                    >
                      {state === "following" ? "Seguindo" : "Seguir"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(POST_CATEGORIES.map((c) => [c.value, c.label]));

function TrendingCard({ place, center }: { place: TrendingPlace; center: Center | null }) {
  const g = CATEGORY_GROUPS[groupFor(place.category)];
  const km = center ? haversineKm(center.lat, center.lng, place.lat, place.lng) : null;
  const details = [
    place.category ? CATEGORY_LABEL[place.category] ?? g.label : null,
    `${place.visits} ${place.visits === 1 ? "visita" : "visitas"} esta semana`,
    km != null ? formatKm(km) : null,
  ].filter(Boolean);
  return (
    <Link
      href={placeHref(place.place_name, place.lat, place.lng)}
      className="flex items-center gap-3 rounded-[14px] p-1 text-mt-ink hover:bg-mt-bg"
    >
      <span
        className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl"
        style={{ background: g.soft, color: g.color }}
      >
        {place.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.photo_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {g.paths.map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{place.place_name}</span>
        {place.rating > 0 && (
          <span className="block text-xs font-bold text-[#9A4508]">
            <span aria-hidden="true">★ </span>
            <span className="sr-only">Nota </span>
            {formatRatingBR(place.rating)}
          </span>
        )}
        <span className="block truncate text-xs text-mt-muted">{details.join(" · ")}</span>
      </span>
    </Link>
  );
}

function FeedSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      {[0, 1].map((i) => (
        <div key={i} className="overflow-hidden rounded-[20px] border border-mt-line bg-white">
          <div className="flex items-center gap-3 p-4">
            <span className="h-11 w-11 animate-pulse rounded-full bg-mt-chip motion-reduce:animate-none" />
            <span className="flex-1 space-y-2">
              <span className="block h-3.5 w-1/2 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
              <span className="block h-3 w-1/3 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
            </span>
          </div>
          <div className="h-64 animate-pulse bg-mt-chip motion-reduce:animate-none" />
          <div className="space-y-2 p-4">
            <span className="block h-3 w-5/6 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
            <span className="block h-3 w-2/3 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
