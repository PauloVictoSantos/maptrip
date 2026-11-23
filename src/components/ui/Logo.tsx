import Link from "next/link";
import { BrandLockup, BrandMark } from "./BrandMark";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
};

const SYMBOL_PX = { sm: 24, md: 30, lg: 40 };

/** Brand logo linking home (horizontal lockup, or the symbol alone). */
export function Logo({ size = "md", showText = true }: LogoProps) {
  return (
    <Link href="/feed" aria-label="MapTrip, início" className="flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mt-teal">
      {showText ? <BrandLockup size={SYMBOL_PX[size]} /> : <BrandMark size={SYMBOL_PX[size]} />}
    </Link>
  );
}
