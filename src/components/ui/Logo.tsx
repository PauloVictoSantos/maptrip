import { MapPin } from "lucide-react";
import Link from "next/link";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
};

export function Logo({ size = "md", showText = true }: LogoProps) {
  const iconSizes = { sm: 20, md: 24, lg: 32 };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

  return (
    <Link href="/feed" className="flex items-center gap-2 group">
      <div className="relative">
        <div className="gradient-brand rounded-xl p-1.5 shadow-sm transition-transform duration-200 group-hover:scale-105">
          <MapPin
            size={iconSizes[size]}
            className="text-white"
            strokeWidth={2.5}
          />
        </div>
      </div>
      {showText && (
        <span
          className={`${textSizes[size]} font-extrabold tracking-tight text-gray-900`}
        >
          Map<span className="text-gradient">Trip</span>
        </span>
      )}
    </Link>
  );
}
