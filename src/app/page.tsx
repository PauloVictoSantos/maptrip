import { getViewerId } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { MapPin, Users, Star, ArrowRight } from "lucide-react";

export default async function HomePage() {
  if (await getViewerId()) {
    redirect("/feed");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Logo size="lg" />
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">
            Entrar
          </Link>
          <Link href="/register" className="btn-primary">
            Criar conta
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 badge-brand mb-6 px-4 py-1.5 text-sm">
            <MapPin size={14} />
            100% gratuito
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1]">
            Suas viagens no{" "}
            <span className="text-gradient">mapa do mundo</span>
          </h1>

          <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Registre seus passeios com fotos e localização, descubra lugares
            incríveis e explore o mapa interativo com experiências reais de
            viajantes.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-primary text-base px-8 py-3"
            >
              Começar agora
              <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3">
              Já tenho conta
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-24">
          <div className="card p-6 text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
              <MapPin size={24} className="text-brand-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Check-in de passeios
            </h3>
            <p className="text-sm text-gray-500">
              Registre cada lugar que visitar com fotos, avaliação e sua
              experiência pessoal.
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Star size={24} className="text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Avalie e descubra
            </h3>
            <p className="text-sm text-gray-500">
              Veja avaliações reais de outros viajantes e descubra novos
              destinos incríveis.
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Users size={24} className="text-blue-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Comunidade viajante
            </h3>
            <p className="text-sm text-gray-500">
              Conecte-se com outros exploradores, curta posts e compartilhe
              experiências.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center">
        <p className="text-sm text-gray-400">
          MapTrip — Feito com carinho para viajantes
        </p>
      </footer>
    </div>
  );
}
