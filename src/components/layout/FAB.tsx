"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function FAB() {
  return (
    <Link
      href="/post/new"
      className="fixed bottom-20 right-4 z-40 md:hidden gradient-brand flex h-14 w-14 items-center justify-center rounded-full shadow-float transition-transform duration-200 active:scale-90"
    >
      <Plus size={26} className="text-white" />
    </Link>
  );
}
