"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createPinIcon } from "@/components/map/pinIcons";

export default function PlaceMiniMap({ lat, lng, category, label }: { lat: number; lng: number; category: string | null; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    L.marker([lat, lng], { icon: createPinIcon(category, 5, false), interactive: false, keyboard: false }).addTo(map);
    return () => {
      map.remove();
    };
  }, [lat, lng, category]);
  return <div ref={ref} role="img" aria-label={`Mapa: ${label}`} className="maptrip-map h-[180px] bg-mt-land" />;
}
