"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Home, Luggage, Map, PlusCircle, Search, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { useAuthContext } from "@/components/providers/AuthProvider";

// Settings and "Sair" are on the user's own profile page, not in the bars.
const navItems = [
  { href: "/feed", label: "Início", icon: Home },
  { href: "/map", label: "Mapa", icon: Map },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/viagens", label: "Viagens", icon: Luggage },
  { href: "/conquistas", label: "Conquistas", icon: Award },
  { href: "/post/new", label: "Novo Post", icon: PlusCircle },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MobileItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-all ${
        active ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      <Icon size={22} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { profile, loading } = useAuthContext();

  return (
    <>
      {/* Desktop top navbar */}
      <header className="sticky top-0 z-50 hidden md:block border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo size="md" />

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    active ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {!loading && profile && (
            <Link
              href={`/profile/${profile.username}`}
              className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-gray-50"
            >
              <Avatar src={profile.avatar_url} name={profile.display_name || profile.username} size="sm" />
              <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">{profile.display_name || profile.username}</span>
            </Link>
          )}
        </div>
      </header>

      {/* Mobile bottom navbar */}
      <nav aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-gray-100 bg-white/90 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-2">
          <MobileItem href="/feed" label="Início" icon={Home} active={isActive(pathname, "/feed")} />
          <MobileItem href="/map" label="Mapa" icon={Map} active={isActive(pathname, "/map")} />

          {/* Floating center button */}
          <Link href="/post/new" aria-label="Registrar visita" className="-mt-4 flex flex-1 flex-col items-center">
            <div className="gradient-brand rounded-full p-2.5 shadow-md">
              <PlusCircle size={22} className="text-white" aria-hidden="true" />
            </div>
          </Link>

          <MobileItem href="/viagens" label="Viagens" icon={Luggage} active={isActive(pathname, "/viagens")} />
          <MobileItem href="/buscar" label="Buscar" icon={Search} active={isActive(pathname, "/buscar")} />

          {profile && (
            <Link
              href={`/profile/${profile.username}`}
              aria-current={pathname === `/profile/${profile.username}` ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-all ${
                pathname.startsWith("/profile") || pathname === "/configuracoes" ? "text-brand-600" : "text-gray-400"
              }`}
            >
              <Avatar src={profile.avatar_url} name={profile.display_name || profile.username} size="sm" />
              <span>Perfil</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
