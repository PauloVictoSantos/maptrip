"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, MapPin, Calendar } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StarRating } from "@/components/ui/StarRating";
import { formatDate } from "@/lib/utils";
import type { Post } from "@/lib/types";

type PostCardProps = {
  post: Post;
  onLike?: (postId: string) => void;
};

export function PostCard({ post, onLike }: PostCardProps) {
  const thumbnail = post.media?.[0]?.url;

  return (
    <article className="card overflow-hidden">
      {/* Image */}
      {thumbnail && (
        <Link href={`/post/${post.id}`} className="block relative aspect-[4/3] overflow-hidden">
          <Image
            src={thumbnail}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
          {post.category && (
            <span className="absolute top-3 left-3 badge-brand backdrop-blur-sm">
              {post.category}
            </span>
          )}
        </Link>
      )}

      {/* Content */}
      <div className="p-4">
        {/* User row */}
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/profile/${post.user?.username}`}>
            <Avatar
              src={post.user?.avatar_url}
              name={post.user?.display_name || post.user?.username || "U"}
              size="sm"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              href={`/profile/${post.user?.username}`}
              className="text-sm font-semibold text-gray-900 hover:text-brand-600 transition-colors"
            >
              {post.user?.display_name || post.user?.username}
            </Link>
            <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
          </div>
          <StarRating value={post.rating} readonly size={14} />
        </div>

        {/* Title & description */}
        <Link href={`/post/${post.id}`}>
          <h3 className="text-base font-bold text-gray-900 mb-1 hover:text-brand-600 transition-colors">
            {post.title}
          </h3>
        </Link>
        {post.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
            {post.description}
          </p>
        )}

        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <MapPin size={13} />
          <span className="truncate">{post.place_name}</span>
          {post.visit_date && (
            <>
              <span className="mx-1">·</span>
              <Calendar size={13} />
              <span>
                {new Date(post.visit_date).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-50">
          <button
            onClick={() => onLike?.(post.id)}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              post.is_liked
                ? "text-red-500"
                : "text-gray-400 hover:text-red-500"
            }`}
          >
            <Heart
              size={18}
              className={post.is_liked ? "fill-red-500" : ""}
            />
            <span>{post.likes_count || 0}</span>
          </button>

          <Link
            href={`/post/${post.id}`}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-600 transition-colors"
          >
            <MessageCircle size={18} />
            <span>{post.comments_count || 0}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
