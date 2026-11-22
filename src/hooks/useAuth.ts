"use client";

import { useCallback, useEffect, useState } from "react";
import type { User as AppUser } from "@/lib/types";

export type SessionUser = { id: string; email: string };

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      setUser(data.user ?? null);
      setProfile(data.profile ?? null);
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    // Hard redirect clears all client state
    window.location.href = "/login";
  }, []);

  return { user, profile, loading, signOut, refresh };
}
