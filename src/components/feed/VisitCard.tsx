"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, ChevronLeft, ChevronRight, Heart, Loader2, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { CATEGORY_GROUPS, formatRatingBR, groupFor } from "@/components/map/categories";
import { placeHref } from "@/lib/place";
import { VISIBILITY_LABEL, relativeTime, type FeedComment, type FeedPost } from "@/lib/feed";

type Props = {
  post: FeedPost;
  viewer: { id: string; name: string; avatar_url: string | null } | null;
  onLike: (id: string) => void;
  onDeleted: (id: string) => void;
};

/** Renders text with @mentions linked to profiles. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(@[a-zA-Z0-9_.]{2,30})/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <Link key={i} href={`/profile/${part.slice(1)}`} className="font-bold text-mt-teal-dark hover:underline">
            {part}
          </Link>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

export function VisitCard({ post, viewer, onLike, onDeleted }: Props) {
  const group = CATEGORY_GROUPS[groupFor(post.category)];
  const author = post.user?.display_name || post.user?.username || "Alguém";
  const isOwner = viewer?.id === post.user_id;

  const [photo, setPhoto] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [popping, setPopping] = useState(false);

  const [comments, setComments] = useState<FeedComment[]>(post.latest_comment ? [post.latest_comment] : []);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [allLoaded, setAllLoaded] = useState(post.comments_count <= 1);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const postUrl = `/post/${post.id}`;

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function like() {
    if (!post.is_liked) {
      setPopping(true);
      window.setTimeout(() => setPopping(false), 400);
    }
    onLike(post.id);
  }

  async function share() {
    const url = `${window.location.origin}${postUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.place_name, text: `${author} visitou ${post.place_name}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice("Link copiado");
      }
    } catch {
      /* share sheet dismissed */
    }
  }

  async function copyLink() {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${postUrl}`);
      setNotice("Link copiado");
    } catch {
      setNotice("Não foi possível copiar o link");
    }
  }

  async function save() {
    if (saved || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/places/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "quero_visitar",
          place: {
            lat: post.lat,
            lng: post.lng,
            name: post.place_name,
            place_name: post.place_name,
            category: post.category,
          },
        }),
      });
      if (res.ok) {
        setSaved(true);
        setNotice("Salvo em Quero visitar");
      } else {
        setNotice("Não foi possível salvar");
      }
    } catch {
      setNotice("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setMenuOpen(false);
    if (!window.confirm("Excluir esta visita? Essa ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(post.id);
    else setNotice("Não foi possível excluir");
  }

  async function loadAllComments() {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`);
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments ?? []);
        setCommentsCount((data.comments ?? []).length);
        setAllLoaded(true);
      }
    } finally {
      setLoadingComments(false);
    }
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((c) => [...c, data.comment]);
        setCommentsCount((n) => n + 1);
        setDraft("");
      } else {
        setNotice(data.error || "Não foi possível comentar");
      }
    } catch {
      setNotice("Erro de conexão");
    } finally {
      setSending(false);
    }
  }

  const media = post.media;
  const showTitle = post.title && post.title.trim() !== post.place_name.trim();

  return (
    <article className="overflow-hidden rounded-[20px] border border-mt-line bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 py-2.5 pl-[18px] pr-3 pt-4">
        <Link href={`/profile/${post.user?.username ?? ""}`} aria-label={`Perfil de ${author}`}>
          <PersonAvatar name={author} src={post.user?.avatar_url} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] leading-snug">
            <Link href={`/profile/${post.user?.username ?? ""}`} className="font-extrabold text-mt-ink hover:underline">
              {author}
            </Link>{" "}
            <span className="text-mt-muted">visitou</span>{" "}
            <Link
              href={post.visibility === "public" ? placeHref(post.place_name, post.lat, post.lng) : postUrl}
              className="font-extrabold text-mt-teal-dark hover:underline"
            >
              {post.place_name}
            </Link>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-mt-muted">
            <span
              className="inline-flex h-5 items-center rounded-[5px] px-1.5 font-bold"
              style={{ background: group.soft, color: group.softText }}
            >
              {group.label}
            </span>
            <time dateTime={post.created_at}>{relativeTime(post.created_at)}</time> · {VISIBILITY_LABEL[post.visibility]}
          </div>
        </div>
        {post.rating > 0 && (
          <span className="flex items-center gap-1 text-sm font-extrabold" aria-label={`Nota ${formatRatingBR(post.rating)}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8590C" stroke="#E8590C" strokeWidth={1.5} strokeLinejoin="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {formatRatingBR(post.rating)}
          </span>
        )}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Mais opções"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-mt-muted hover:bg-mt-chip"
          >
            <MoreHorizontal size={20} strokeWidth={2.4} />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-12 z-20 w-48 overflow-hidden rounded-xl border border-mt-line bg-white py-1 shadow-[0_8px_24px_rgba(20,32,43,0.15)]">
              <Link role="menuitem" href={postUrl} className="block px-4 py-2.5 text-sm font-semibold text-mt-ink hover:bg-mt-chip">
                Ver visita
              </Link>
              <button role="menuitem" type="button" onClick={copyLink} className="block w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-mt-chip">
                Copiar link
              </button>
              {isOwner && (
                <button role="menuitem" type="button" onClick={remove} className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-[#B42323] hover:bg-[#FFF0F0]">
                  Excluir visita
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photos */}
      {media.length > 0 && (
        <div className="relative h-80 bg-mt-chip" style={{ background: group.soft }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media[photo].url}
            alt={`Foto ${photo + 1} de ${media.length} em ${post.place_name}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          {media.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Foto anterior"
                disabled={photo === 0}
                onClick={() => setPhoto((p) => Math.max(0, p - 1))}
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-mt-ink disabled:opacity-0"
              >
                <ChevronLeft size={20} strokeWidth={2.4} />
              </button>
              <button
                type="button"
                aria-label="Próxima foto"
                disabled={photo === media.length - 1}
                onClick={() => setPhoto((p) => Math.min(media.length - 1, p + 1))}
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-mt-ink disabled:opacity-0"
              >
                <ChevronRight size={20} strokeWidth={2.4} />
              </button>
              <span className="absolute right-3 top-3 flex h-[26px] items-center rounded-full bg-[rgba(20,32,43,0.78)] px-2.5 text-xs font-bold text-white">
                {photo + 1}/{media.length}
              </span>
            </>
          )}
        </div>
      )}

      {/* Text + tags */}
      {(showTitle || post.description || post.tags.length > 0 || post.completeness) && (
        <div className="px-[18px] pt-3.5">
          {showTitle && <p className="text-[15px] font-extrabold">{post.title}</p>}
          {post.description && (
            <p className="mt-0.5 whitespace-pre-line text-[15px] leading-[23px]">
              <RichText text={post.description} />
            </p>
          )}
          {(post.tags.length > 0 || post.completeness) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <span key={t} className="inline-flex h-6 items-center rounded-md bg-mt-chip px-2 text-xs font-semibold text-mt-ink-2">
                  {t}
                </span>
              ))}
              {post.completeness && (
                <span className="inline-flex h-6 items-center rounded-md bg-[#FDF0E3] px-2 text-xs font-bold text-[#9A4508]">
                  {post.completeness}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-2.5 flex items-center border-t border-[#EEF0EE] px-2.5 py-1">
        <button
          type="button"
          aria-pressed={post.is_liked}
          aria-label={`${post.is_liked ? "Curtido" : "Curtir"}, ${post.likes_count} ${post.likes_count === 1 ? "curtida" : "curtidas"}`}
          onClick={like}
          disabled={!viewer}
          className={`flex h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-bold hover:bg-mt-chip disabled:hover:bg-transparent ${
            post.is_liked ? "text-[#E03131]" : "text-mt-ink-2"
          }`}
        >
          <Heart size={22} fill={post.is_liked ? "currentColor" : "none"} className={popping ? "maptrip-like-pop" : ""} aria-hidden="true" />
          {post.likes_count}
        </button>
        <button
          type="button"
          aria-label={commentsCount ? `${commentsCount} comentários` : "Comentar"}
          onClick={() => inputRef.current?.focus()}
          className="flex h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-bold text-mt-ink-2 hover:bg-mt-chip"
        >
          <MessageCircle size={22} aria-hidden="true" />
          {commentsCount || "Comentar"}
        </button>
        <button
          type="button"
          onClick={save}
          aria-pressed={saved}
          disabled={!viewer}
          className="ml-auto flex h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-bold text-mt-ink-2 hover:bg-mt-chip disabled:hover:bg-transparent"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Bookmark size={20} fill={saved ? "currentColor" : "none"} aria-hidden="true" />}
          <span className="hidden sm:inline">{saved ? "Salvo" : "Salvar"}</span>
        </button>
        <button
          type="button"
          onClick={share}
          className="flex h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-bold text-mt-ink-2 hover:bg-mt-chip"
        >
          <Share2 size={20} aria-hidden="true" />
          <span className="hidden sm:inline">Compartilhar</span>
        </button>
      </div>
      <p aria-live="polite" className={notice ? "px-[18px] pb-1 text-xs font-semibold text-mt-teal-dark" : "sr-only"}>
        {notice}
      </p>

      {/* Comments */}
      {(comments.length > 0 || viewer) && (
        <div className="flex flex-col gap-2.5 border-t border-[#EEF0EE] px-[18px] pb-4 pt-3">
          {!allLoaded && (
            <button
              type="button"
              onClick={loadAllComments}
              className="flex items-center gap-1.5 self-start text-[13px] font-bold text-mt-muted hover:text-mt-ink"
            >
              {loadingComments && <Loader2 size={14} className="animate-spin" />}
              Ver todos os {commentsCount} comentários
            </button>
          )}
          {comments.map((c) => {
            const name = c.user?.display_name || c.user?.username || "Alguém";
            return (
              <div key={c.id} className="flex gap-2.5">
                <PersonAvatar name={name} src={c.user?.avatar_url} size={32} />
                <div className="min-w-0 rounded-[14px] bg-mt-bg px-3 py-2 text-sm leading-5">
                  <Link href={`/profile/${c.user?.username ?? ""}`} className="font-extrabold text-mt-ink hover:underline">
                    {name}
                  </Link>{" "}
                  <RichText text={c.content} />
                </div>
              </div>
            );
          })}
          {viewer && (
            <form onSubmit={sendComment} className="flex items-center gap-2.5">
              <PersonAvatar name={viewer.name} src={viewer.avatar_url} size={32} />
              <label htmlFor={`comentar-${post.id}`} className="sr-only">
                Escreva um comentário
              </label>
              <input
                ref={inputRef}
                id={`comentar-${post.id}`}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                placeholder="Escreva um comentário…"
                className="h-10 min-w-0 flex-1 rounded-full border-[1.5px] border-mt-line-strong px-3.5 text-sm focus:border-mt-teal focus:outline-none"
              />
              {draft.trim() && (
                <button type="submit" disabled={sending} className="h-10 rounded-full px-3 text-sm font-bold text-mt-teal-dark hover:bg-mt-teal-soft">
                  {sending ? <Loader2 size={16} className="animate-spin" /> : "Enviar"}
                </button>
              )}
            </form>
          )}
        </div>
      )}
    </article>
  );
}
