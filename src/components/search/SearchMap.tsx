"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Minus, Plus } from "lucide-react";
import { CATEGORY_GROUPS, groupFor } from "@/components/map/categories";
import type { BBox, SearchResult } from "@/lib/search";

type Props = {
  results: SearchResult[];
  highlightedId: string | null;
  onPinClick: (id: string) => void;
  center: { lat: number; lng: number; radiusKm: number } | null;
  /** When true the results follow the map (bbox mode) — don't refit on new results. */
  followMap: boolean;
  autoUpdate: boolean;
  onAutoUpdateChange: (v: boolean) => void;
  onUserMove: (bbox: BBox) => void;
};

const DEFAULT_CENTER: L.LatLngTuple = [-3.119, -60.0217];

function rankIcon(rank: number, color: string, highlighted: boolean) {
  const size = highlighted ? 44 : 34;
  return L.divIcon({
    className: "maptrip-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div class="maptrip-rank${highlighted ? " is-highlighted" : ""}" style="width:${size}px;height:${size}px;background:${
      highlighted ? "#14202B" : color
    };font-size:${highlighted ? 15 : 13}px">${rank}</div>`,
  });
}

export default function SearchMap({
  results,
  highlightedId,
  onPinClick,
  center,
  followMap,
  autoUpdate,
  onAutoUpdateChange,
  onUserMove,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const circle = useRef<L.Circle | null>(null);
  const markers = useRef(new Map<string, { marker: L.Marker; rank: number; color: string }>());
  const programmaticUntil = useRef(0);
  const autoUpdateRef = useRef(autoUpdate);
  const onUserMoveRef = useRef(onUserMove);
  autoUpdateRef.current = autoUpdate;
  onUserMoveRef.current = onUserMove;

  useEffect(() => {
    if (!mapRef.current || map.current) return;
    const m = L.map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(m);
    layer.current = L.layerGroup().addTo(m);

    let debounce: number | undefined;
    m.on("moveend", () => {
      if (Date.now() < programmaticUntil.current || !autoUpdateRef.current) return;
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        const b = m.getBounds();
        onUserMoveRef.current([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
      }, 400);
    });

    map.current = m;
    const markerMap = markers.current;
    return () => {
      window.clearTimeout(debounce);
      m.remove();
      map.current = null;
      layer.current = null;
      circle.current = null;
      markerMap.clear();
    };
  }, []);

  // Radius circle
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    circle.current?.remove();
    circle.current = null;
    if (center && !followMap) {
      circle.current = L.circle([center.lat, center.lng], {
        radius: center.radiusKm * 1000,
        color: "#0E7C86",
        weight: 1.5,
        fillColor: "#0E7C86",
        fillOpacity: 0.05,
        interactive: false,
      }).addTo(m);
    }
  }, [center, followMap]);

  // Result pins
  useEffect(() => {
    const m = map.current;
    const group = layer.current;
    if (!m || !group) return;
    group.clearLayers();
    markers.current.clear();

    results.forEach((r, i) => {
      const color = CATEGORY_GROUPS[groupFor(r.category)].color;
      const marker = L.marker([r.lat, r.lng], {
        icon: rankIcon(i + 1, color, r.id === highlightedId),
        title: `${i + 1}. ${r.place_name}`,
        keyboard: true,
        zIndexOffset: r.id === highlightedId ? 1000 : 0,
      });
      marker.on("click", () => onPinClick(r.id));
      marker.addTo(group);
      markers.current.set(r.id, { marker, rank: i + 1, color });
    });

    if (followMap) return;
    const points: L.LatLngExpression[] = results.map((r) => [r.lat, r.lng]);
    programmaticUntil.current = Date.now() + 1200;
    if (circle.current) {
      m.fitBounds(circle.current.getBounds(), { padding: [24, 24] });
    } else if (points.length > 1) {
      m.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
    } else if (points.length === 1) {
      m.setView(points[0], 15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, followMap]);

  // Highlight without rebuilding pins
  const prevHighlight = useRef<string | null>(null);
  useEffect(() => {
    const swap = (id: string | null, on: boolean) => {
      const entry = id ? markers.current.get(id) : null;
      if (!entry) return;
      entry.marker.setIcon(rankIcon(entry.rank, entry.color, on));
      entry.marker.setZIndexOffset(on ? 1000 : 0);
    };
    if (prevHighlight.current !== highlightedId) swap(prevHighlight.current, false);
    swap(highlightedId, true);
    prevHighlight.current = highlightedId;
  }, [highlightedId]);

  return (
    <div className="relative isolate h-full w-full bg-mt-land">
      <div ref={mapRef} className="maptrip-map absolute inset-0" />

      <label className="absolute left-4 top-4 z-[1000] flex h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-3.5 text-[13px] font-bold shadow-[0_2px_8px_rgba(20,32,43,0.15)]">
        <input
          type="checkbox"
          checked={autoUpdate}
          onChange={(e) => onAutoUpdateChange(e.target.checked)}
          className="h-4 w-4 accent-mt-teal"
        />
        Atualizar ao mover o mapa
      </label>

      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(20,32,43,0.15)]">
        <button
          type="button"
          aria-label="Aproximar"
          onClick={() => map.current?.zoomIn()}
          className="flex h-11 w-11 items-center justify-center border-b border-mt-line hover:bg-mt-chip"
        >
          <Plus size={18} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          aria-label="Afastar"
          onClick={() => map.current?.zoomOut()}
          className="flex h-11 w-11 items-center justify-center hover:bg-mt-chip"
        >
          <Minus size={18} strokeWidth={2.4} />
        </button>
      </div>

      <span className="absolute bottom-4 left-4 z-[1000] rounded-md bg-white/90 px-2 py-1 text-[11px] text-mt-ink-2">
        Mapa ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="hover:underline">
          OpenStreetMap
        </a>
      </span>
    </div>
  );
}
