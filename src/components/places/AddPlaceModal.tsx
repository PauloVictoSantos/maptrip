"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { StarRating } from "@/components/ui/StarRating";
import { Spinner } from "@/components/ui/Spinner";
import type { PlaceStatus, PlaceStatusType } from "@/lib/types";

const LocationPicker = dynamic(
  () => import("@/components/post/LocationPicker").then((m) => m.LocationPicker),
  { ssr: false }
);

type Props = {
  status: PlaceStatusType;
  onClose: () => void;
  onCreated: (item: PlaceStatus) => void;
};

export function AddPlaceModal({ status, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [placeName, setPlaceName] = useState("");
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim()) return setError("Dê um nome ao lugar.");
    if (!lat || !lng) return setError("Selecione a localização no mapa.");

    setSaving(true);
    setError("");

    const res = await fetch("/api/places/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place: { lat, lng, name: name.trim(), place_name: placeName },
        status,
        rating: status === "visitado" && rating > 0 ? rating : undefined,
        notes: notes.trim() || undefined,
        visited_at: status === "visitado" ? new Date().toISOString().split("T")[0] : undefined,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Erro ao salvar.");
      return;
    }

    onCreated(data.place_status);
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">
            {status === "quero_visitar" ? "Quero visitar" : "Marcar como visitado"}
          </h2>
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

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome do lugar</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Praia da Lua"
              className="input-field"
            />
          </div>

          <LocationPicker
            lat={lat}
            lng={lng}
            placeName={placeName}
            onSelect={(la, ln, pn) => {
              setLat(la);
              setLng(ln);
              setPlaceName(pn);
              if (!name) setName(pn.split(",")[0]);
            }}
          />

          {status === "visitado" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nota</label>
                <StarRating value={rating} onChange={setRating} size={26} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Notas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="input-field resize-none"
                />
              </div>
            </>
          )}

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
            {saving ? <Spinner size={20} className="text-white" /> : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}