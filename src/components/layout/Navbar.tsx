"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Home, Map, PlusCircle, LogOut, Search, Settings, Luggage } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { useAuthContext } from "@/components/providers/AuthProvider";

const navItems = [
  { href: "/feed", label: "Início", icon: Home },
  { href: "/map", label: "Mapa", icon: Map },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/viagens", label: "Viagens", icon: Luggage },
  { href: "/conquistas", label: "Conquistas", icon: Award },
  { href: "/post/new", label: "Novo Post", icon: PlusCircle },
];

export function Navbar() {
  const pathname = usePathname();
  const { profile, loading, signOut } = useAuthContext();

  return (
    <>
      {/* Desktop top navbar */}
      <header className="sticky top-0 z-50 hidden md:block border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo size="md" />

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {!loading && profile && (
              <Link
                href={`/profile/${profile.username}`}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-gray-50"
              >
                <Avatar
                  src={profile.avatar_url}
                  name={profile.display_name || profile.username}
                  size="sm"
                />
                <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                  {profile.display_name || profile.username}
                </span>
              </Link>
            )}
            <Link href="/configuracoes" className="btn-icon" title="Configurações" aria-label="Configurações">
              <Settings size={18} />
            </Link>
            <button onClick={signOut} className="btn-icon" title="Sair" aria-label="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-gray-100 bg-white/90 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-center justify-around py-2 px-2">
          <Link
            href="/feed"
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all ${
              pathname === "/feed"
                ? "text-brand-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Home size={22} />
            <span>Início</span>
          </Link>

          <Link
            href="/map"
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all ${
              pathname === "/map"
                ? "text-brand-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Map size={22} />
            <span>Mapa</span>
          </Link>

          {/* Floating center button */}
          <Link
            href="/post/new"
            className="flex flex-col items-center -mt-4"
          >
            <div className="gradient-brand rounded-full p-2.5 shadow-md">
              <PlusCircle size={22} className="text-white" />
            </div>
          </Link>

          <Link
            href="/buscar"
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all ${
              pathname === "/buscar"
                ? "text-brand-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Search size={22} />
            <span>Buscar</span>
          </Link>

          {profile && (
            <Link
              href={`/profile/${profile.username}`}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all ${
                pathname.includes("/profile")
                  ? "text-brand-600"
                  : "text-gray-400"
              }`}
            >
              <Avatar
                src={profile.avatar_url}
                name={profile.display_name || profile.username}
                size="sm"
              />
              <span>Perfil</span>
            </Link>
          )}

          <button
            onClick={signOut}
            className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-all"
          >
            <LogOut size={22} />
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </>
  );
}
