import "server-only";
import type { UserDoc } from "@/lib/db/types";

export const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
/** Usernames that would collide with routes under /api/users/* or app pages. */
export const RESERVED_USERNAMES = new Set(["me", "search", "follows", "visits", "admin", "api", "maptrip", "suporte", "configuracoes"]);
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 8;

/** Profile as the signed-in user sees it (includes email). */
export function ownProfile(u: UserDoc) {
  return {
    id: u._id.toHexString(),
    username: u.username,
    email: u.email,
    display_name: u.display_name,
    bio: u.bio,
    avatar_url: u.avatar_url,
    city: u.city,
    default_visibility: u.default_visibility ?? "public",
    has_password: !!u.password_hash,
    created_at: u.created_at.toISOString(),
  };
}

/** Profile as anyone sees it. */
export function publicProfile(u: UserDoc) {
  const { email: _email, default_visibility: _dv, has_password: _hp, ...rest } = ownProfile(u);
  return rest;
}
