"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  MapPin,
  Calendar,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StarRating } from "@/components/ui/StarRating";
import { Spinner, PageLoader } from "@/components/ui/Spinner";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { formatDate } from "@/lib/utils";
import type { Post, Comment } from "@/lib/types";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    async function fetchPost() {
      const res = await fetch(`/api/posts/${postId}`);
      if (!res.ok) {
        router.push("/feed");
        return;
      }
      const data = await res.json();
      setPost(data);
      setComments(data.comments || []);
      setLoading(false);
    }
    fetchPost();
  }, [postId, router]);

  async function handleLike() {
    if (!post) return;

    setPost({
      ...post,
      is_liked: !post.is_liked,
      likes_count: post.is_liked
        ? post.likes_count - 1
        : post.likes_count + 1,
    });

    await fetch(`/api/posts/${postId}/like`, { method: "POST" });
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSendingComment(true);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText.trim() }),
    });

    if (res.ok) {
      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setCommentText("");
    }
    setSendingComment(false);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este post?")) return;

    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/feed");
      router.refresh();
    }
  }

  if (loading || !post) return <PageLoader />;

  const mediaList = post.media || [];
  const isOwner = user?.id === post.user_id;

  return (
    <div className="mx-auto max-w-xl px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="btn-icon">
          <ArrowLeft size={20} />
        </button>
        <h1 className="section-title flex-1 truncate">{post.title}</h1>
        {isOwner && (
          <button
            onClick={handleDelete}
            className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"
            title="Excluir post"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Image gallery */}
      {mediaList.length > 0 && (
        <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
          <Image
            src={mediaList[imageIndex]?.url}
            alt={`${post.title} - foto ${imageIndex + 1}`}
            fill
            className="object-cover"
            priority
          />

          {mediaList.length > 1 && (
            <>
              <button
                onClick={() =>
                  setImageIndex(
                    (prev) => (prev - 1 + mediaList.length) % mediaList.length
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() =>
                  setImageIndex((prev) => (prev + 1) % mediaList.length)
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
              >
                <ChevronRight size={18} />
              </button>

              {/* Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {mediaList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === imageIndex
                        ? "w-4 bg-white"
                        : "w-1.5 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {post.category && (
            <span className="absolute top-3 left-3 badge-brand backdrop-blur-sm">
              {post.category}
            </span>
          )}
        </div>
      )}

      {/* Post content card */}
      <div className="card p-5 mb-4">
        {/* Author row */}
        <div className="flex items-center gap-3 mb-4">
          <Link href={`/profile/${post.user?.username}`}>
            <Avatar
              src={post.user?.avatar_url}
              name={post.user?.display_name || post.user?.username || "U"}
              size="md"
            />
          </Link>
          <div className="flex-1">
            <Link
              href={`/profile/${post.user?.username}`}
              className="text-sm font-semibold text-gray-900 hover:text-brand-600"
            >
              {post.user?.display_name || post.user?.username}
            </Link>
            <p className="text-xs text-gray-400">
              @{post.user?.username} · {formatDate(post.created_at)}
            </p>
          </div>
          <StarRating value={post.rating} readonly size={18} />
        </div>

        {/* Description */}
        {post.description && (
          <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
            {post.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <MapPin size={13} />
            {post.place_name}
          </span>
          {post.visit_date && (
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {new Date(post.visit_date).toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-5 pt-3 border-t border-gray-100">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              post.is_liked
                ? "text-red-500"
                : "text-gray-400 hover:text-red-500"
            }`}
          >
            <Heart
              size={20}
              className={post.is_liked ? "fill-red-500" : ""}
            />
            {post.likes_count || 0} curtida{post.likes_count !== 1 ? "s" : ""}
          </button>
        </div>
      </div>

      {/* Comments section */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Comentários ({comments.length})
        </h3>

        {/* Comments list */}
        {comments.length > 0 && (
          <div className="space-y-4 mb-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Link href={`/profile/${comment.user?.username}`}>
                  <Avatar
                    src={comment.user?.avatar_url}
                    name={
                      comment.user?.display_name ||
                      comment.user?.username ||
                      "U"
                    }
                    size="sm"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={`/profile/${comment.user?.username}`}
                      className="text-sm font-semibold text-gray-900 hover:text-brand-600"
                    >
                      {comment.user?.display_name || comment.user?.username}
                    </Link>
                    <span className="text-xs text-gray-400">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {comments.length === 0 && (
          <p className="text-sm text-gray-400 mb-4">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        )}

        {/* Comment form */}
        <form onSubmit={handleComment} className="flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Escreva um comentário..."
            maxLength={500}
            className="input-field flex-1 text-sm"
          />
          <button
            type="submit"
            disabled={sendingComment || !commentText.trim()}
            className="btn-primary px-3"
          >
            {sendingComment ? (
              <Spinner size={16} className="text-white" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
