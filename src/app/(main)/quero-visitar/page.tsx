"use client";

import { useEffect, useState } from "react";
import { Plus, MapPinned } from "lucide-react";
import { PlaceCard } from "@/components/places/PlaceCard";
import { AddPlaceModal } from "@/components/places/AddPlaceModal";
import { MarkVisitedModal } from "@/components/places/MarkVisitedModal";
import { Spinner } from "@/components/ui/Spinner";
import type { PlaceStatus } from "@/lib/types";

export default function QueroVisitarPage() {
  const [items, setItems] = useState<PlaceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toVisit, setToVisit] = useState<PlaceStatus | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/places?status=quero_visitar");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRemove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/places/status?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-4 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">Quero visitar</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2">
          <Plus size={18} />
          Adicionar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size={28} />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MapPinned size={40} className="mx-auto mb-3" />
          <p>Você ainda não adicionou nenhum lugar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <PlaceCard
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onMarkVisited={(i) => setToVisit(i)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddPlaceModal
          status="quero_visitar"
          onClose={() => setShowAdd(false)}
          onCreated={(item) => {
            setItems((prev) => [item, ...prev]);
            setShowAdd(false);
          }}
        />
      )}

      {toVisit && (
        <MarkVisitedModal
          item={toVisit}
          onClose={() => setToVisit(null)}
          onSaved={() => {
            setItems((prev) => prev.filter((i) => i.id !== toVisit.id));
            setToVisit(null);
          }}
        />
      )}
    </div>
  );
}