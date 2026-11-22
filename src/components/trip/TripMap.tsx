"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createPinIcon } from "@/components/map/pinIcons";

export type TripMapPoint = { id: string; lat: number; lng: number; name: string; category: string | null; rating?: number };

function stopIcon(index: number, done: boolean) {
  const bg = done ? "#59625C" : "#16845A";
  return L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${bg};color:#fff;border:2px solid #fff;box-shadow:0 2px 6px rgba(8,10,9,.3);display:flex;align-items:center;justify-content:center;font:700 13px/1 system-ui,sans-serif">${index}</div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/**
 * Interactive map of a list of places.
 * `route` numbers the points in order and joins them with a line (trip day);
 * otherwise each point is a category pin (destination page).
 */
export default function TripMap({
  points,
  center,
  route = false,
  doneIds = [],
  height = 420,
  label,
  onSelect,
}: {
  points: TripMapPoint[];
  center: { lat: number; lng: number };
  route?: boolean;
  doneIds?: string[];
  height?: number;
  label: string;
  onSelect?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { center: [center.lat, center.lng], zoom: 13, scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const latlngs = points.map((p) => L.latLng(p.lat, p.lng));
    if (route && latlngs.length > 1) {
      L.polyline(latlngs, { color: "#FFFFFF", weight: 7, opacity: 0.9 }).addTo(layer);
      L.polyline(latlngs, { color: "#16845A", weight: 4, dashArray: "1 8", lineCap: "round" }).addTo(layer);
    }
    points.forEach((p, i) => {
      const marker = L.marker([p.lat, p.lng], {
        icon: route ? stopIcon(i + 1, doneIds.includes(p.id)) : createPinIcon(p.category, p.rating ?? 4, false),
        title: route ? `Parada ${i + 1}, ${p.name}` : p.name,
        alt: route ? `Parada ${i + 1}, ${p.name}` : p.name,
        keyboard: true,
      }).addTo(layer);
      marker.on("click", () => onSelectRef.current?.(p.id));
    });
    if (latlngs.length > 1) map.fitBounds(L.latLngBounds(latlngs), { padding: [36, 36], maxZoom: 15 });
    else if (latlngs.length === 1) map.setView(latlngs[0], 15);
    else map.setView([center.lat, center.lng], 12);
  }, [points, route, doneIds, center.lat, center.lng]);

  return (
    <div className="isolate overflow-hidden rounded-[20px] border border-mt-line">
      <div ref={ref} role="region" aria-label={label} className="maptrip-map bg-mt-land" style={{ height }} />
    </div>
  );
}
