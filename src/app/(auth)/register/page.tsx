"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Spinner } from "@/components/ui/Spinner";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  MapPin,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    city: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  }

  function validate(): string | null {
    const username = form.username.trim().toLowerCase();

    if (username.length < 3) {
      return "Username deve ter pelo menos 3 caracteres.";
    }
    if (username.length > 30) {
      return "Username deve ter no máximo 30 caracteres.";
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return "Username: apenas letras minúsculas, números e _ são permitidos.";
    }
    if (form.password.length < 8) {
      return "Senha deve ter pelo menos 8 caracteres.";
    }
    if (form.password !== form.confirmPassword) {
      return "As senhas não coincidem.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          username: form.username.trim().toLowerCase(),
          city: form.city.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erro ao criar conta. Tente novamente.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <p className="text-gray-500">Crie sua conta e comece a explorar</p>
      </div>

      <div className="card p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Username */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Username
            </label>
            <div className="relative">
              <User
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="seu_username"
                required
                minLength={3}
                maxLength={30}
                autoComplete="username"
                className="input-field pl-11"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Letras, números e _ — sem espaços
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="input-field pl-11"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Senha
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                autoComplete="new-password"
                className="input-field pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Confirmar senha
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                placeholder="Repita a senha"
                required
                minLength={8}
                autoComplete="new-password"
                className="input-field pl-11"
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Cidade{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <MapPin
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Ex: Manaus, AM"
                className="input-field pl-11"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full !mt-6"
          >
            {loading ? (
              <Spinner size={20} className="text-white" />
            ) : (
              "Criar conta grátis"
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Já tem uma conta?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-600 hover:text-brand-700"
        >
          Faça login
        </Link>
      </p>
    </div>
  );
}
