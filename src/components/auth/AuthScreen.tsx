"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Lock, Mail, MailCheck, MapPin, User } from "lucide-react";
import { AuthField, GoogleIcon } from "./AuthField";
import { PasswordStrength } from "./PasswordStrength";
import { EMAIL_PATTERN, passwordStrength } from "@/lib/password";

export type AuthMode = "login" | "register" | "reset";

// Placeholder hero photo (Unsplash license). Swap for a brand photo when available.
const HERO_IMAGE = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=65";

const PATHS: Record<AuthMode, string> = { login: "/login", register: "/register", reset: "/login?modo=redefinir" };

const OAUTH_ERRORS: Record<string, string> = {
  google_indisponivel: "O login com Google ainda não foi configurado neste servidor. Use e-mail e senha.",
  google_cancelado: "Você cancelou o login com o Google.",
  google_falhou: "Não foi possível entrar com o Google. Tente de novo.",
  google_conta_existente: "Já existe uma conta com esse e-mail. Entre com sua senha ou use “Esqueci minha senha”.",
  muitas_tentativas: "Muitas tentativas seguidas. Aguarde alguns minutos.",
};

/** Only same-site relative paths are allowed as post-login destinations (no open redirect). */
function safeNext(): string {
  const raw = new URLSearchParams(window.location.search).get("next") || "/feed";
  return raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/feed";
}

function emailError(value: string): string {
  if (!value.trim()) return "Informe seu e-mail.";
  return EMAIL_PATTERN.test(value.trim()) ? "" : "Digite um e-mail válido, como nome@exemplo.com.";
}

// ---------------------------------------------------------------------------

export function AuthScreen({ initialMode }: { initialMode: Exclude<AuthMode, "reset"> }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(""); // shared so switching screens keeps what was typed
  const [banner, setBanner] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // ?modo=redefinir opens the reset screen; ?erro= shows OAuth errors.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("modo") === "redefinir") setMode("reset");
    const err = sp.get("erro");
    if (err) setBanner(OAUTH_ERRORS[err] ?? "Algo deu errado. Tente de novo.");
  }, []);

  // Switch screens without reloading; keep ?next and move focus to the new heading.
  function go(next: AuthMode) {
    setBanner("");
    setMode(next);
    const sp = new URLSearchParams(window.location.search);
    const keep = sp.get("next");
    const base = PATHS[next];
    const url = keep ? `${base}${base.includes("?") ? "&" : "?"}next=${encodeURIComponent(keep)}` : base;
    window.history.replaceState(null, "", url);
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    document.title = `${mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Redefinir senha"} · MapTrip`;
  }, [mode]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F7F8FA] md:h-[100dvh] md:flex-row">
      <HeroPanel />

      {/* ---- Form column ---- */}
      <main className="flex flex-1 items-start justify-center overflow-y-auto px-5 py-8 sm:px-8 md:w-1/2 md:items-center md:py-12">
        <div className="w-full max-w-[420px]">
          {banner && (
            <p role="alert" className="mb-6 rounded-[10px] border border-[#F4C7C3] bg-[#FCEEEE] px-4 py-3 text-sm font-medium text-[#8C1D18]">
              {banner}
            </p>
          )}
          {/* key → remounts with the enter animation on every switch */}
          <div key={mode} className="auth-swap">
            {mode === "login" && <LoginForm email={email} setEmail={setEmail} go={go} headingRef={headingRef} />}
            {mode === "register" && <RegisterForm email={email} setEmail={setEmail} go={go} headingRef={headingRef} />}
            {mode === "reset" && <ResetRequestForm email={email} setEmail={setEmail} go={go} headingRef={headingRef} />}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Left half on desktop; a short banner on phones. */
export function HeroPanel() {
  return (
    <aside className="relative h-40 shrink-0 overflow-hidden bg-[#0B3B40] sm:h-48 md:h-auto md:w-1/2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#04181A]/85 via-[#04181A]/25 to-[#04181A]/45" />
      <div className="relative flex h-full flex-col justify-between p-5 text-white sm:p-8 md:p-12">
        <a href="/" className="flex w-fit items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="MapTrip, página inicial">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
            <MapPin size={22} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight">MapTrip</span>
        </a>
        <div className="hidden md:block">
          <p className="max-w-[460px] text-[34px] font-semibold leading-[1.15] tracking-[-0.02em] lg:text-[40px]">Cada lugar que você visita vira uma história no mapa.</p>
          <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-white/80">
            Registre suas visitas, descubra lugares com quem você segue e planeje a próxima viagem com seus amigos.
          </p>
          <p className="mt-10 text-xs text-white/55">Foto: Unsplash</p>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Shared bits

type FormProps = {
  email: string;
  setEmail: (v: string) => void;
  go: (m: AuthMode) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
};

function Heading({ headingRef, title, subtitle }: { headingRef: FormProps["headingRef"]; title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h1 ref={headingRef} tabIndex={-1} className="text-[28px] font-semibold tracking-[-0.02em] text-[#111827] outline-none">
        {title}
      </h1>
      <p className="mt-2 text-[15px] text-[#5B6470]">{subtitle}</p>
    </div>
  );
}

function PrimaryButton({ children, loading, disabled, describedBy }: { children: React.ReactNode; loading?: boolean; disabled?: boolean; describedBy?: string }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      aria-describedby={describedBy}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-mt-teal text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.08),0_4px_12px_rgba(14,124,134,0.25)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-mt-teal-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mt-teal/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#9FC7CB] disabled:shadow-none"
    >
      {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

function GoogleButton({ label }: { label: string }) {
  // Full navigation (not fetch): Google's consent screen needs a top-level redirect.
  function start(e: React.MouseEvent<HTMLAnchorElement>) {
    e.currentTarget.href = `/api/auth/google?next=${encodeURIComponent(safeNext())}`;
  }
  return (
    <a
      href="/api/auth/google"
      onClick={start}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-[#D5DAE0] bg-white text-[15px] font-medium text-[#1F2933] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:bg-[#F7F8FA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mt-teal/25"
    >
      <GoogleIcon />
      {label}
    </a>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4" role="separator" aria-label="ou">
      <span className="h-px flex-1 bg-[#E1E5EA]" />
      <span aria-hidden="true" className="text-xs font-medium uppercase tracking-[0.08em] text-[#8A9199]">
        ou
      </span>
      <span className="h-px flex-1 bg-[#E1E5EA]" />
    </div>
  );
}

function LinkButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded font-semibold text-mt-teal-dark underline-offset-4 transition-colors hover:text-[#063F45] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mt-teal"
    >
      {children}
    </button>
  );
}

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[10px] border border-[#F4C7C3] bg-[#FCEEEE] px-4 py-3 text-sm font-medium text-[#8C1D18]">
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Entrar

function LoginForm({ email, setEmail, go, headingRef }: FormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = { email: emailError(email) || undefined, password: password ? undefined : "Informe sua senha." };
    setErrors(next);
    setFormError("");
    if (next.email || next.password) {
      document.getElementById(next.email ? "login-email" : "login-senha")?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, remember }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível entrar.");
      router.replace(safeNext());
      router.refresh();
    } catch (err) {
      setFormError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <>
      <Heading headingRef={headingRef} title="Bem-vindo de volta" subtitle="Entre para ver o mapa e as visitas de quem você segue." />
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <AuthField
          id="login-email"
          label="E-mail"
          icon={Mail}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nome@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email && setErrors((p) => ({ ...p, email: emailError(email) || undefined }))}
          error={errors.email}
        />
        <AuthField
          id="login-senha"
          label="Senha"
          icon={Lock}
          password
          autoComplete="current-password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-[#3D4651]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-[#B9C0C8] accent-mt-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mt-teal focus-visible:ring-offset-2"
            />
            Lembrar de mim
          </label>
          <LinkButton onClick={() => go("reset")}>Esqueci minha senha</LinkButton>
        </div>
        <FormError message={formError} />
        <PrimaryButton loading={loading}>Entrar</PrimaryButton>
      </form>
      <Divider />
      <GoogleButton label="Continuar com o Google" />
      <p className="mt-8 text-center text-sm text-[#5B6470]">
        Não tem conta? <LinkButton onClick={() => go("register")}>Cadastre-se</LinkButton>
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Cadastrar

function RegisterForm({ email, setEmail, go, headingRef }: FormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; confirm?: boolean }>({});
  const [serverErrors, setServerErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);
  const allRules = strength.level === "forte";
  const matches = confirm.length > 0 && confirm === password;
  const canSubmit = allRules && matches;

  const nameError = touched.name && name.trim().length < 2 ? "Informe seu nome completo." : serverErrors.name;
  const mailError = (touched.email && emailError(email)) || serverErrors.email;
  const confirmError = touched.confirm && confirm && !matches ? "As senhas não são iguais." : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, confirm: true });
    setFormError("");
    if (name.trim().length < 2 || emailError(email) || !canSubmit) {
      const first = name.trim().length < 2 ? "cad-nome" : emailError(email) ? "cad-email" : "cad-senha";
      document.getElementById(first)?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.field && ["name", "email", "password"].includes(data.field)) setServerErrors({ [data.field]: data.error });
        else setFormError(data.error || "Não foi possível criar a conta.");
        setLoading(false);
        return;
      }
      router.replace(safeNext());
      router.refresh();
    } catch {
      setFormError("Sem conexão. Tente de novo.");
      setLoading(false);
    }
  }

  return (
    <>
      <Heading headingRef={headingRef} title="Crie sua conta" subtitle="Leva menos de um minuto. Você escolhe quem vê cada visita." />
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <AuthField
          id="cad-nome"
          label="Nome completo"
          icon={User}
          autoComplete="name"
          placeholder="Como você quer aparecer"
          maxLength={60}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setServerErrors((p) => ({ ...p, name: undefined }));
          }}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          error={nameError}
        />
        <AuthField
          id="cad-email"
          label="E-mail"
          icon={Mail}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nome@exemplo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setServerErrors((p) => ({ ...p, email: undefined }));
          }}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={mailError || undefined}
        />
        <div>
          <AuthField
            id="cad-senha"
            label="Senha"
            icon={Lock}
            password
            autoComplete="new-password"
            placeholder="Crie uma senha forte"
            maxLength={200}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setServerErrors((p) => ({ ...p, password: undefined }));
            }}
            error={serverErrors.password}
            describedBy="cad-senha-forca"
          />
          <PasswordStrength password={password} id="cad-senha-forca" />
        </div>
        <AuthField
          id="cad-confirmar"
          label="Confirmar senha"
          icon={Lock}
          password
          autoComplete="new-password"
          placeholder="Digite a senha de novo"
          maxLength={200}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          error={confirmError}
        />
        <FormError message={formError} />
        <PrimaryButton loading={loading} disabled={!canSubmit} describedBy="cad-requisitos">
          Criar conta
        </PrimaryButton>
        <p id="cad-requisitos" className={canSubmit ? "sr-only" : "-mt-2 text-center text-xs text-[#6B7480]"}>
          {canSubmit ? "Tudo certo para criar a conta." : !allRules ? "Cumpra todos os critérios da senha para continuar." : "Confirme a senha para continuar."}
        </p>
      </form>
      <Divider />
      <GoogleButton label="Cadastrar com o Google" />
      <p className="mt-8 text-center text-sm text-[#5B6470]">
        Já tem conta? <LinkButton onClick={() => go("login")}>Entrar</LinkButton>
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Redefinir senha (pedido do link)

function ResetRequestForm({ email, setEmail, go, headingRef }: FormProps) {
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = emailError(email);
    setError(err);
    setFormError("");
    if (err) {
      document.getElementById("reset-email")?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível enviar o link.");
      setSentTo(email.trim());
    } catch (e2) {
      setFormError((e2 as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <div className="auth-swap">
        <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E3F4F1] text-[#137333]">
          <MailCheck size={28} aria-hidden="true" />
        </span>
        <Heading
          headingRef={headingRef}
          title="Verifique seu e-mail"
          subtitle={`Se existir uma conta com ${sentTo}, enviamos um link para criar uma nova senha. Ele vale por 60 minutos.`}
        />
        <p role="status" className="sr-only">
          Link de redefinição enviado.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => go("login")}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-mt-teal text-[15px] font-semibold text-white transition-colors hover:bg-mt-teal-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mt-teal/30"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Voltar para o login
          </button>
          <p className="text-center text-sm text-[#5B6470]">
            Não chegou? Confira o spam ou <LinkButton onClick={() => setSentTo("")}>envie de novo</LinkButton>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Heading headingRef={headingRef} title="Redefinir senha" subtitle="Informe o e-mail da sua conta e enviaremos um link para você criar uma nova senha." />
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <AuthField
          id="reset-email"
          label="E-mail"
          icon={Mail}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nome@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email && setError(emailError(email))}
          error={error || undefined}
        />
        <FormError message={formError} />
        <PrimaryButton loading={loading}>Enviar link de redefinição</PrimaryButton>
      </form>
      <p className="mt-8 text-center text-sm">
        <button
          type="button"
          onClick={() => go("login")}
          className="inline-flex items-center gap-1.5 rounded font-semibold text-mt-teal-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mt-teal"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para o login
        </button>
      </p>
    </>
  );
}
