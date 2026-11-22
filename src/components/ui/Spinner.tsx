import { Loader2 } from "lucide-react";

type SpinnerProps = {
  size?: number;
  className?: string;
};

export function Spinner({ size = 24, className = "" }: SpinnerProps) {
  return (
    <Loader2
      size={size}
      className={`animate-spin text-brand-600 ${className}`}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={32} />
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    </div>
  );
}
