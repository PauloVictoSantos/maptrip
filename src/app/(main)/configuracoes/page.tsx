"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Download, Globe, Loader2, Lock, Users } from "lucide-react";
import { useAuthContext } from "@/components/providers/AuthProvider";

/** Same rule as MIN_PASSWORD in lib/auth/account.ts (server-only). */
const MIN_PASSWORD_LENGTH = 8;

type Visibility = "public" | "friends" | "private";

const SECTIONS = [
  ["conta", "Conta e perfil"],
  ["privacidade", "Privacidade"],
  ["senha", "Senha"],
  ["dados", "Seus dados (LGPD)"],
] as const;

const VISIBILITY_OPTIONS: { value: Visibility; label: string; description: string; icon: typeof Globe }[] = [
  { value: "public", label: "Todos", description: "Qualquer pessoa no MapTrip.", icon: Globe },
  { value: "friends", label: "Amigos", description: "Quem você segue e te segue de volta.", icon: Users },
  { value: "private", label: "Só eu", description: "Seu diário fica privado.", icon: Lock },
];

const field =
  "mt-1.5 h-11 w-full rounded-[12px] border-[1.5px] border-mt-line-strong bg-white px-3.5 text-[15px] focus:border-mt-teal focus:outline-none";
const card = "scroll-mt-24 rounded-[20px] border border-mt-line bg-white p-6";

function Status({ text, error }: { text: string; error?: boolean }) {
  return (
    <p role={error ? "alert" : "status"} className={text ? `text-sm font-semibold ${error ? "text-[#B42323]" : "text-mt-teal-dark"}` : "sr-only"}>
      {text}
    </p>
  );
}

export default function SettingsPage() {
  const { profile, refresh } = useAuthContext();
  const [active, setActive] = useState<string>("conta");

  useEffect(() => {
    document.title = "Configurações · MapTrip";
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    SECTIONS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex justify-center py-20 text-mt-muted">
        <Loader2 className="animate-spin" aria-label="Carregando" />
      </div>
    );
  }

  return (
    <div className="bg-mt-bg text-mt-ink">
      <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 md:px-6">
        <h1 className="text-[30px] font-extrabold tracking-[-0.5px] md:text-[34px]">Configurações</h1>
        <div className="mt-6 flex flex-wrap items-start gap-10">
          <nav aria-label="Seções das configurações" className="sticky top-24 flex min-w-[200px] flex-[0_1_220px] flex-col gap-0.5">
            {SECTIONS.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={active === id ? "true" : undefined}
                className={`rounded-[10px] px-3 py-2.5 text-sm ${active === id ? "bg-mt-chip font-extrabold text-mt-ink" : "text-mt-ink-2 hover:bg-white"}`}
              >
                {label}
              </a>
            ))}
          </nav>
          <main className="flex min-w-0 max-w-[720px] flex-[999_1_480px] flex-col gap-8">
            <AccountSection profile={profile} onSaved={refresh} />
            <PrivacySection initial={profile.default_visibility ?? "public"} onSaved={refresh} />
            <PasswordSection />
            <DataSection username={profile.username} />
          </main>
        </div>
      </div>
    </div>
  );
}

function AccountSection({
  profile,
  onSaved,
}: {
  profile: { username: string; email: string; display_name: string | null; city: string | null; bio: string | null };
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({ display_name: profile.display_name ?? "", city: profile.city ?? "", bio: profile.bio ?? "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", error: false });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: "", error: false });
    try {
      const res = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar.");
      await onSaved();
      setMsg({ text: "Perfil salvo.", error: false });
    } catch (err) {
      setMsg({ text: (err as Error).message, error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="conta" aria-labelledby="conta-t" className={card}>
      <h2 id="conta-t" className="text-xl font-extrabold">
        Conta e perfil
      </h2>
      <p className="mt-1 text-sm text-mt-muted">
        @{profile.username} · {profile.email}. A foto de perfil é trocada em{" "}
        <Link href={`/profile/${profile.username}`} className="font-bold text-mt-teal-dark underline">
          Editar perfil
        </Link>
        .
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <label className="text-sm font-bold">
          Nome
          <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} maxLength={60} className={field} />
        </label>
        <label className="text-sm font-bold">
          Cidade
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={80} className={field} />
          <span className="mt-1 block text-xs font-medium text-mt-muted">Centraliza o mapa e define a aba da cidade no Início e o ranking.</span>
        </label>
        <label className="text-sm font-bold">
          Bio
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            maxLength={200}
            rows={3}
            className={`${field} h-auto resize-none py-2.5`}
          />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="flex h-11 items-center gap-2 rounded-full bg-mt-teal px-6 text-sm font-bold text-white hover:bg-mt-teal-dark disabled:opacity-60">
            {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            Salvar
          </button>
          <Status {...msg} />
        </div>
      </form>
    </section>
  );
}

function PrivacySection({ initial, onSaved }: { initial: Visibility; onSaved: () => Promise<void> }) {
  const [value, setValue] = useState<Visibility>(initial);
  const [msg, setMsg] = useState({ text: "", error: false });

  async function choose(v: Visibility) {
    const prev = value;
    setValue(v);
    setMsg({ text: "", error: false });
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_visibility: v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar.");
      await onSaved();
      setMsg({ text: "Preferência salva. Vale para as próximas visitas.", error: false });
    } catch (err) {
      setValue(prev);
      setMsg({ text: (err as Error).message, error: true });
    }
  }

  return (
    <section id="privacidade" aria-labelledby="priv-t" className={card}>
      <h2 id="priv-t" className="text-xl font-extrabold">
        Privacidade
      </h2>
      <fieldset className="mt-4">
        <legend className="text-sm font-bold">Quem vê minhas novas visitas</legend>
        <p className="mt-0.5 text-xs text-mt-muted">Você ainda pode mudar em cada visita. Visitas já publicadas não mudam.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {VISIBILITY_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-[14px] border-[1.5px] p-3.5 focus-within:ring-2 focus-within:ring-mt-teal-soft ${
                value === o.value ? "border-mt-teal bg-mt-teal-soft" : "border-mt-line hover:border-mt-line-strong"
              }`}
            >
              <input type="radio" name="visibilidade" value={o.value} checked={value === o.value} onChange={() => choose(o.value)} className="sr-only" />
              <o.icon size={18} aria-hidden="true" className={value === o.value ? "text-mt-teal-dark" : "text-mt-ink-2"} />
              <span className="text-sm font-extrabold">{o.label}</span>
              <span className="text-xs text-mt-muted">{o.description}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-3">
        <Status {...msg} />
      </div>
      <ul className="mt-5 flex flex-col gap-3 border-t border-mt-line pt-4 text-sm">
        <li>
          <strong>Mapa de amigos:</strong> quem você segue vê só a sua última visita da semana, e só se ela for pública ou para amigos.
        </li>
        <li className="flex gap-2 rounded-xl bg-[#FCF3E0] p-3 text-[#6B4500]">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <strong>Localização nas fotos:</strong> o MapTrip ainda não remove os dados de GPS das fotos enviadas. Até isso mudar, evite publicar fotos tiradas na
            sua casa.
          </span>
        </li>
      </ul>
    </section>
  );
}

function PasswordSection() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", error: false });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setMsg({ text: "A confirmação não bate com a nova senha.", error: true });
      return;
    }
    setSaving(true);
    setMsg({ text: "", error: false });
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: form.current, new_password: form.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível trocar a senha.");
      setForm({ current: "", next: "", confirm: "" });
      setMsg({ text: "Senha alterada.", error: false });
    } catch (err) {
      setMsg({ text: (err as Error).message, error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="senha" aria-labelledby="senha-t" className={card}>
      <h2 id="senha-t" className="text-xl font-extrabold">
        Senha
      </h2>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-bold">
          Senha atual
          <input type="password" autoComplete="current-password" required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} className={field} />
        </label>
        <label className="text-sm font-bold">
          Nova senha
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={form.next}
            onChange={(e) => setForm({ ...form, next: e.target.value })}
            className={field}
          />
        </label>
        <label className="text-sm font-bold">
          Confirmar
          <input type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className={field} />
        </label>
        <div className="flex items-center gap-3 sm:col-span-3">
          <button type="submit" disabled={saving} className="flex h-11 items-center gap-2 rounded-full bg-mt-teal px-6 text-sm font-bold text-white hover:bg-mt-teal-dark disabled:opacity-60">
            {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            Trocar senha
          </button>
          <span className="text-xs text-mt-muted">Mínimo de {MIN_PASSWORD_LENGTH} caracteres.</span>
          <Status {...msg} />
        </div>
      </form>
    </section>
  );
}

function DataSection({ username }: { username: string }) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/users/me", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível excluir a conta.");
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <section id="dados" aria-labelledby="dados-t" className={card}>
      <h2 id="dados-t" className="text-xl font-extrabold">
        Seus dados (LGPD)
      </h2>
      <p className="mt-1 text-sm text-mt-muted">Baixe uma cópia de tudo que você publicou ou exclua sua conta de vez.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="/api/users/me/export"
          download={`maptrip-${username}.json`}
          className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-mt-line-strong px-5 text-sm font-bold hover:bg-mt-chip"
        >
          <Download size={16} aria-hidden="true" />
          Exportar meus dados
        </a>
        <button
          type="button"
          onClick={() => setConfirming((v) => !v)}
          aria-expanded={confirming}
          className="flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-[#B42323] hover:bg-[#FBEAE8]"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          Excluir conta
        </button>
      </div>
      {confirming && (
        <form onSubmit={remove} className="mt-4 rounded-[14px] border-[1.5px] border-[#C2362F] bg-[#FBEAE8] p-4">
          <p className="text-sm font-bold text-[#7A1F1A]">Isso apaga para sempre suas visitas, fotos, comentários, curtidas, seguidores e viagens.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">
              Digite <span className="font-mono">{username}</span> para confirmar
              <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={field} />
            </label>
            <label className="text-sm font-bold">
              Sua senha
              <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            </label>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-[#B42323]">
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={busy || typed.trim().toLowerCase() !== username || !password}
              className="flex h-11 items-center gap-2 rounded-full bg-[#C2362F] px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              Excluir minha conta
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="h-11 rounded-full px-5 text-sm font-bold hover:bg-white/60">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
