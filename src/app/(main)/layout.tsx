import { Navbar } from "@/components/layout/Navbar";
import { AuthProvider } from "@/components/providers/AuthProvider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-surface-muted">
        <Navbar />
        <main className="pb-24 md:pb-8">{children}</main>
      </div>
    </AuthProvider>
  );
}
