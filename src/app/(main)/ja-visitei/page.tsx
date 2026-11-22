"use client";

import { useEffect, useState } from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { PlaceCard } from "@/components/places/PlaceCard";
import { AddPlaceModal } from "@/components/places/AddPlaceModal";
import { Spinner } from "@/components/ui/Spinner";
import type { PlaceStatus } from "@/lib/types";

export default function JaVisiteiPage() {
  const [items, setItems] = useState<PlaceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/places?status=visitado");
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
        <h1 className="section-title">Já visitei</h1>
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
          <CheckCircle2 size={40} className="mx-auto mb-3" />
          <p>Nenhum lugar visitado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <PlaceCard key={item.id} item={item} onRemove={handleRemove} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddPlaceModal
          status="visitado"
          onClose={() => setShowAdd(false)}
          onCreated={(item: PlaceStatus) => {
            setItems((prev) => [item, ...prev]);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
} 