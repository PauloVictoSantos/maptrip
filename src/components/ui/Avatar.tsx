import Image from "next/image";
import { getInitials } from "@/lib/utils";

type AvatarProps = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-lg",
};

const pixelMap = { sm: 32, md: 40, lg: 56, xl: 80 };

export function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        unoptimized={src.startsWith("/api/")}
        alt={name}
        width={pixelMap[size]}
        height={pixelMap[size]}
        className={`${sizeMap[size]} rounded-full object-cover ring-2 ring-white ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ring-2 ring-white ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
