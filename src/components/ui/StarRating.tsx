"use client";

import { Star } from "lucide-react";
import { useState } from "react";

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readonly?: boolean;
};

export function StarRating({
  value,
  onChange,
  size = 18,
  readonly = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = readonly
          ? star <= Math.round(value)
          : star <= (hoverValue || value);

        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            onMouseLeave={() => !readonly && setHoverValue(0)}
            className={`transition-transform duration-100 ${
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
            }`}
          >
            <Star
              size={size}
              className={
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-gray-300"
              }
            />
          </button>
        );
      })}
    </div>
  );
}
