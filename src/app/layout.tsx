import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MapTrip - Rede Social de Viagens",
  description:
    "Compartilhe seus passeios, descubra novos lugares e explore o mundo através de um mapa interativo.",
  keywords: ["viagens", "mapa", "rede social", "passeios", "turismo"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
