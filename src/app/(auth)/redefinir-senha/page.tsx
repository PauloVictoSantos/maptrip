"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { HeroPanel, OFFLINE, readApi } from "@/components/auth/AuthScreen";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { passwordStrength } from "@/lib/password";

// /redefinir-senha?token=… — opened from the e-mail link.
export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "Nova senha · MapTrip";
    const fromUrl = new URLSearchParams(window.location.search).get("token");
    // Updater keeps the first value: dev StrictMode runs this twice, after the URL was cleaned.
    setToken((prev) => prev ?? fromUrl ?? "");
    // Drop the token from the address bar/history once read.
    if (fromUrl) window.history.replaceState(null, "", "/redefinir-senha");
  }, []);

  const strong = passwordStrength(password).level === "forte";
  const matches = confirm.length > 0 && confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setConfirmTouched(true);
    if (!strong || !matches) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const { ok, error: message } = await readApi(res);
      if (ok) setDone(true);
      else setError(message);
    } catch {
      setError(OFFLINE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F7F8FA] md:h-[100dvh] md:flex-row">
      <HeroPanel />
      <main className="flex flex-1 items-start justify-center overflow-y-auto px-5 py-8 sm:px-8 md:w-1/2 md:items-center md:py-12">
        <div className="auth-swap w-full max-w-[420px]">
          {token === null ? (
            <Loader2 className="animate-spin text-[#8A9199]" aria-label="Carregando" />
          ) : done ? (
            <>
              <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E3F4F1] text-[#137333]">
                <CheckCircle2 size={28} aria-hidden="true" />
              </span>
              <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#111827]">Senha alterada</h1>
              <p role="status" className="mt-2 text-[15px] text-[#5B6470]">
                Pronto! Agora entre com a sua nova senha.
              </p>
              <Link
                href="/login"
                className="mt-8 flex h-12 w-full items-center justify-center rounded-[10px] bg-mt-teal text-[15px] font-semibold text-white hover:bg-mt-teal-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mt-teal/30"
              >
                Ir para o login
              </Link>
            </>
          ) : !token ? (
            <>
              <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#111827]">Link inválido</h1>
              <p className="mt-2 text-[15px] text-[#5B6470]">Abra o link que enviamos por e-mail ou peça um novo.</p>
              <Link href="/login?modo=redefinir" className="mt-8 inline-block font-semibold text-mt-teal-dark hover:underline">
                Pedir um novo link
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#111827]">Crie uma nova senha</h1>
              <p className="mb-8 mt-2 text-[15px] text-[#5B6470]">Escolha uma senha forte que você não usa em outros sites.</p>
              <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                <div>
                  <AuthField
                    id="nova-senha"
                    label="Nova senha"
                    icon={Lock}
                    password
                    autoComplete="new-password"
                    maxLength={200}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    describedBy="nova-senha-forca"
                  />
                  <PasswordStrength password={password} id="nova-senha-forca" />
                </div>
                <AuthField
                  id="nova-senha-confirmar"
                  label="Confirmar nova senha"
                  icon={Lock}
                  password
                  autoComplete="new-password"
                  maxLength={200}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onBlur={() => setConfirmTouched(true)}
                  error={confirmTouched && confirm && !matches ? "As senhas não são iguais." : undefined}
                />
                {error && (
                  <p role="alert" className="rounded-[10px] border border-[#F4C7C3] bg-[#FCEEEE] px-4 py-3 text-sm font-medium text-[#8C1D18]">
                    {error}{" "}
                    <Link href="/login?modo=redefinir" className="font-semibold underline">
                      Pedir novo link
                    </Link>
                  </p>
                )}
                <button
                  type="submit"
                  disabled={!strong || !matches || loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-mt-teal text-[15px] font-semibold text-white transition-colors hover:bg-mt-teal-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mt-teal/30 disabled:cursor-not-allowed disabled:bg-[#9FC7CB]"
                >
                  {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                  Salvar nova senha
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
