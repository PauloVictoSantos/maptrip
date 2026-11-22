"use client";

import dynamic from "next/dynamic";

// Leaflet must be loaded client-side only (no SSR)
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-surface-subtle">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <p className="text-sm text-gray-500">Carregando mapa...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  return <MapView />;
}
