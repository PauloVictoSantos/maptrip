import { Inter } from "next/font/google";

// Auth screens use Inter (the rest of the app keeps Plus Jakarta Sans).
const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.className} antialiased`}>{children}</div>;
}
