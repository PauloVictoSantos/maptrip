import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/AuthScreen";

export const metadata: Metadata = { title: "Criar conta · MapTrip" };

export default function RegisterPage() {
  return <AuthScreen initialMode="register" />;
}
