import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/AuthScreen";

export const metadata: Metadata = { title: "Entrar · MapTrip" };

// /login — also serves the reset screen (?modo=redefinir); switching screens doesn't reload.
export default function LoginPage() {
  return <AuthScreen initialMode="login" />;
}
