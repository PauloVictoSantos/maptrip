"use client";

import { useState } from "react";
import { X, MapPin } from "lucide-react";
import { StarRating } from "@/components/ui/StarRating";
import { Spinner } from "@/components/ui/Spinner";
import type { PlaceStatus } from "@/lib/types";

type Props = {
  item: PlaceStatus;
  onClose: () => void;
  onSaved: (updated: PlaceStatus) => void;
};

export function MarkVisitedModal({ item, onClose, onSaved }: Props) {
  const [rating, setRating] = useState(item.rating || 0);
  const [notes, setNotes] = useState(item.notes || "");
  const [visitedAt, setVisitedAt] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");

    const res = await fetch("/api/places/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place_id: item.place.id,
        status: "visitado",
        rating: rating > 0 ? rating : undefined,
        notes: notes.trim() || undefined,
        visited_at: visitedAt,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Erro ao salvar.");
      return;
    }

    onSaved(data.place_status);
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">Marcar como visitado</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Lugar (somente leitura — já existe) */}
          <div className="flex items-start gap-2 rounded-xl bg-gray-50 px-3.5 py-3">
            <MapPin size={16} className="text-brand-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{item.place.name}</p>
              {item.place.place_name && (
                <p className="text-xs text-gray-400 truncate">{item.place.place_name}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Quando você foi?
            </label>
            <input
              type="date"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Nota</label>
            <div className="flex items-center gap-3">
              <StarRating value={rating} onChange={setRating} size={26} />
              {rating > 0 && (
                <span className="text-sm font-semibold text-amber-600">{rating}/5</span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Como foi a experiência?
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conte como foi..."
              rows={3}
              maxLength={2000}
              className="input-field resize-none"
            />
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
            {saving ? <Spinner size={20} className="text-white" /> : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}