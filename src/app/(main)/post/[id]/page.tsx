"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, ChevronLeft, Heart, Loader2, MapPin, MessageCircle, Send, Share2, Trash2 } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { CATEGORY_GROUPS, formatRatingBR, groupFor } from "@/components/map/categories";
import { POST_CATEGORIES } from "@/lib/types";
import { VISIBILITY_LABEL, relativeTime, type FeedUser } from "@/lib/feed";
import { placeHref } from "@/lib/place";

type PostComment = { id: string; content: string; created_at: string; user: FeedUser | null };
type PostDetail = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  rating: number;
  lat: number;
  lng: number;
  place_name: string;
  category: string | null;
  visibility: "public" | "friends" | "private";
  visit_date: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked: boolean;
  media: { id: string; url: string }[];
  tags: string[];
  record_level: string;
  user: (FeedUser & { city: string | null }) | null;
  comments: PostComment[];
};

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(POST_CATEGORIES.map((c) => [c.value, c.label]));

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthContext();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Publicação não encontrada.");
        setPost(d);
        document.title = `${d.place_name.split(",")[0]} · MapTrip`;
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(t);
  }, [notice]);

  // Arrow keys move through the photos.
  useEffect(() => {
    const n = post?.media.length ?? 0;
    if (n < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea")) return;
      if (e.key === "ArrowRight") setPhoto((p) => (p + 1) % n);
      if (e.key === "ArrowLeft") setPhoto((p) => (p - 1 + n) % n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [post?.media.length]);

  function back() {
    if (window.history.length > 1) router.back();
    else router.push("/feed");
  }

  async function toggleLike() {
    if (!post) return;
    const flip = (p: PostDetail): PostDetail => ({ ...p, is_liked: !p.is_liked, likes_count: p.likes_count + (p.is_liked ? -1 : 1) });
    setPost(flip(post));
    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" }).catch(() => null);
    if (!res?.ok) setPost((p) => (p ? flip(p) : p));
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!post || !content) return;
    setSending(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível comentar.");
      setPost((p) => (p ? { ...p, comments: [...p.comments, data.comment], comments_count: p.comments_count + 1 } : p));
      setText("");
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function remove() {
    if (!post || !confirm("Excluir esta visita? Fotos, comentários e curtidas também serão apagados.")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) router.push("/feed");
    else setNotice("Não foi possível excluir.");
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: post?.place_name, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setNotice("Link copiado");
      }
    } catch {
      /* dismissed */
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-lg font-extrabold text-mt-ink">{error}</p>
        <p className="mt-1 text-sm text-mt-muted">Ela pode ter sido excluída ou ser visível só para amigos.</p>
        <Link href="/feed" className="mt-4 inline-flex h-11 items-center rounded-full bg-mt-teal px-5 text-sm font-bold text-white">
          Voltar ao início
        </Link>
      </div>
    );
  }
  if (!post) {
    return (
      <div aria-hidden="true" className="mx-auto flex max-w-[1200px] flex-wrap gap-8 px-4 pt-6 md:px-6">
        <div className="h-[560px] flex-[3_1_480px] animate-pulse rounded-[20px] bg-mt-chip motion-reduce:animate-none" />
        <div className="h-[400px] flex-[2_1_360px] animate-pulse rounded-[20px] bg-mt-chip motion-reduce:animate-none" />
      </div>
    );
  }

  const author = post.user;
  const authorName = author?.display_name || author?.username || "Alguém";
  const g = CATEGORY_GROUPS[groupFor(post.category)];
  const [placeTitle, ...placeRest] = post.place_name.split(",").map((s) => s.trim());
  const isOwner = profile?.id === post.user_id;
  const me = profile ? profile.display_name || profile.username : "";
  const current = post.media[photo];

  return (
    <div className="bg-mt-bg text-mt-ink">
      <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-6 md:px-6">
        <div className="flex items-center gap-2">
          <button type="button" onClick={back} aria-label="Voltar" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-mt-chip">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-xl font-extrabold">Publicação</h1>
        </div>

        <div className="mt-5 flex flex-wrap items-start gap-8">
          {/* ---- Photos ---- */}
          {post.media.length > 0 && (
            <section aria-label="Fotos da publicação" className="flex min-w-0 flex-[3_1_480px] flex-col gap-2">
              <figure className="relative overflow-hidden rounded-[20px] bg-mt-chip">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.url}
                  alt={`Foto ${photo + 1} de ${post.media.length} em ${placeTitle}`}
                  className="h-[min(560px,70vh)] w-full object-cover"
                />
                {post.media.length > 1 && (
                  <figcaption className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white">
                    {photo + 1}/{post.media.length}
                  </figcaption>
                )}
              </figure>
              {post.media.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {post.media.map((m, i) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPhoto(i)}
                      aria-label={`Ver foto ${i + 1}`}
                      aria-current={i === photo ? "true" : undefined}
                      className={`overflow-hidden rounded-[10px] ${i === photo ? "outline outline-2 outline-offset-2 outline-mt-teal" : "opacity-80 hover:opacity-100"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt="" loading="lazy" className="h-[88px] w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ---- Post + comments ---- */}
          <div className={`flex min-w-0 flex-col gap-4 ${post.media.length ? "flex-[2_1_360px]" : "mx-auto max-w-[680px] flex-1"}`}>
            <article className="rounded-[20px] border border-mt-line bg-white p-5">
              <header className="flex items-center gap-3">
                <Link href={`/profile/${author?.username}`} aria-label={`Perfil de ${authorName}`}>
                  <PersonAvatar name={authorName} src={author?.avatar_url} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${author?.username}`} className="block truncate text-[15px] font-extrabold text-mt-ink hover:underline">
                    {authorName}
                  </Link>
                  <span className="block text-xs text-mt-muted">
                    {relativeTime(post.created_at)} · {VISIBILITY_LABEL[post.visibility]}
                  </span>
                </div>
                {isOwner && (
                  <button type="button" onClick={remove} aria-label="Excluir visita" className="flex h-10 w-10 items-center justify-center rounded-full text-mt-muted hover:bg-[#FBEAE8] hover:text-[#B42323]">
                    <Trash2 size={18} />
                  </button>
                )}
              </header>

              <Link
                href={post.visibility === "public" ? placeHref(post.place_name, post.lat, post.lng) : `/map`}
                className="mt-4 flex items-center gap-3 rounded-[14px] border border-mt-line p-3 text-mt-ink hover:border-mt-line-strong"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: g.soft, color: g.color }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {g.paths.map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold">{placeTitle}</span>
                  <span className="block truncate text-xs text-mt-muted">
                    {[post.category ? CATEGORY_LABEL[post.category] : null, placeRest.join(", ") || null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {post.rating > 0 && (
                  <span className="shrink-0 text-sm font-extrabold text-[#9A4508]">
                    <span aria-hidden="true">★ </span>
                    <span className="sr-only">Nota </span>
                    {formatRatingBR(post.rating)}
                  </span>
                )}
              </Link>

              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="inline-flex h-7 items-center rounded-full bg-mt-chip px-2.5 text-mt-ink-2">Registro {post.record_level.toLowerCase()}</span>
                {post.visit_date && (
                  <span className="inline-flex h-7 items-center gap-1 rounded-full bg-mt-chip px-2.5 text-mt-ink-2">
                    <Calendar size={13} aria-hidden="true" />
                    {new Date(`${post.visit_date}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                )}
              </div>

              {post.description && <p className="mt-3 whitespace-pre-line text-[15px] leading-[22px]">{post.description}</p>}

              {post.tags.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {post.tags.map((t) => (
                    <li key={t} className="rounded-full bg-mt-teal-soft px-2.5 py-1 text-xs font-bold text-mt-teal-dark">
                      {t}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex items-center gap-1 border-t border-mt-line pt-3">
                <button
                  type="button"
                  onClick={toggleLike}
                  aria-pressed={post.is_liked}
                  className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold ${post.is_liked ? "text-[#C2362F]" : "text-mt-ink-2 hover:bg-mt-chip"}`}
                >
                  <Heart size={19} className={post.is_liked ? "fill-[#C2362F]" : ""} aria-hidden="true" />
                  {post.likes_count}
                  <span className="sr-only">{post.likes_count === 1 ? "curtida" : "curtidas"}</span>
                </button>
                <a href="#comentar" className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-mt-ink-2 hover:bg-mt-chip">
                  <MessageCircle size={19} aria-hidden="true" />
                  {post.comments_count}
                  <span className="sr-only">comentários</span>
                </a>
                <button type="button" onClick={share} className="ml-auto flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-mt-ink-2 hover:bg-mt-chip">
                  <Share2 size={18} aria-hidden="true" />
                  Compartilhar
                </button>
              </div>
              <p aria-live="polite" className={notice ? "mt-2 text-sm font-semibold text-mt-teal-dark" : "sr-only"}>
                {notice}
              </p>
            </article>

            <h2 className="mt-2 text-[17px] font-extrabold">
              {post.comments.length} {post.comments.length === 1 ? "comentário" : "comentários"}
            </h2>
            {post.comments.length === 0 && <p className="text-sm text-mt-muted">Ninguém comentou ainda. Tem alguma dica sobre o lugar?</p>}
            <ul className="flex flex-col gap-3">
              {post.comments.map((c) => {
                const cName = c.user?.display_name || c.user?.username || "Alguém";
                const isAuthor = c.user?.id === post.user_id;
                return (
                  <li key={c.id} className="flex gap-3">
                    <Link href={`/profile/${c.user?.username}`} aria-label={`Perfil de ${cName}`} className="shrink-0">
                      <PersonAvatar name={cName} src={c.user?.avatar_url} size={36} />
                    </Link>
                    <div className="min-w-0 flex-1 rounded-[14px] bg-white px-3.5 py-2.5 ring-1 ring-mt-line">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <Link href={`/profile/${c.user?.username}`} className="text-sm font-extrabold text-mt-ink hover:underline">
                          {cName}
                        </Link>
                        {isAuthor && <span className="rounded-full bg-mt-chip px-2 text-[11px] font-bold text-mt-ink-2">Autor</span>}
                        <span className="text-xs text-mt-muted">{relativeTime(c.created_at)}</span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-line break-words text-sm">{c.content}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <form id="comentar" onSubmit={sendComment} className="flex items-center gap-2 border-t border-mt-line pt-3">
              <PersonAvatar name={me || "Você"} src={profile?.avatar_url} size={36} className="hidden shrink-0 sm:flex" />
              <label htmlFor="comment-input" className="sr-only">
                Escreva um comentário
              </label>
              <input
                id="comment-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                placeholder={me ? `Comentar como ${me}` : "Escreva um comentário"}
                className="h-11 min-w-0 flex-1 rounded-full border-[1.5px] border-mt-line-strong bg-white px-4 text-[15px] focus:border-mt-teal focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#080A09] px-4 text-sm font-bold text-white hover:bg-[#202522] disabled:opacity-50"
              >
                {sending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                Enviar
              </button>
            </form>
            {post.visibility === "private" && (
              <p className="flex items-center gap-1.5 text-xs text-mt-muted">
                <MapPin size={13} aria-hidden="true" />
                Visita privada: só você vê esta página.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
