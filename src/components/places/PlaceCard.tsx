"use client";

import { MapPin, Star, Trash2, CheckCircle2 } from "lucide-react";
import type { PlaceStatus } from "@/lib/types";

type PlaceCardProps = {
  item: PlaceStatus;
  onRemove: (id: string) => void;
  onMarkVisited?: (item: PlaceStatus) => void; // só usado na lista "quero visitar"
};

export function PlaceCard({ item, onRemove, onMarkVisited }: PlaceCardProps) {
  return (
    <div className="card-flat p-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{item.place.name}</h3>
        {item.place.place_name && (
          <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 truncate">
            <MapPin size={12} />
            {item.place.place_name}
          </p>
        )}
        {item.status === "visitado" && item.rating && (
          <div className="flex items-center gap-1 mt-1.5">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium text-amber-600">{item.rating}/5</span>
          </div>
        )}
        {item.notes && (
          <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{item.notes}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        {onMarkVisited && (
          <button
            onClick={() => onMarkVisited(item)}
            className="btn-icon text-brand-600"
            title="Marcar como visitado"
          >
            <CheckCircle2 size={18} />
          </button>
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="btn-icon text-gray-400 hover:text-red-500"
          title="Remover"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}