"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useAuth, type SessionUser } from "@/hooks/useAuth";
import type { User as AppUser } from "@/lib/types";

type AuthContextType = {
  user: SessionUser | null;
  profile: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
