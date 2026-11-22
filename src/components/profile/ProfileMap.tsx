"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Pause, Play } from "lucide-react";
import { CATEGORY_GROUPS, groupFor } from "@/components/map/categories";
import type { ProfileVisit } from "@/app/api/users/[username]/visits/route";

const DEFAULT_CENTER: L.LatLngTuple = [-3.119, -60.0217];

function visitDate(v: ProfileVisit) {
  return v.visit_date ? new Date(`${v.visit_date}T12:00:00`) : new Date(v.created_at);
}

export default function ProfileMap({ visits }: { visits: ProfileVisit[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const heatLayer = useRef<L.LayerGroup | null>(null);
  const pinLayer = useRef<L.LayerGroup | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const [heat, setHeat] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState("");

  const sorted = [...visits].sort((a, b) => visitDate(a).getTime() - visitDate(b).getTime());

  function pin(v: ProfileVisit) {
    return L.circleMarker([v.lat, v.lng], {
      radius: 9,
      color: "#FFFFFF",
      weight: 3,
      fillColor: CATEGORY_GROUPS[groupFor(v.category)].color,
      fillOpacity: 1,
    }).bindTooltip(v.place_name, { direction: "top", offset: [0, -8] });
  }

  function drawAll() {
    pinLayer.current?.clearLayers();
    visits.forEach((v) => pinLayer.current?.addLayer(pin(v)));
  }

  // Init
  useEffect(() => {
    if (!ref.current || map.current) return;
    const m = L.map(ref.current, { center: DEFAULT_CENTER, zoom: 11, zoomControl: true, attributionControl: false, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(m);
    heatLayer.current = L.layerGroup().addTo(m);
    pinLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      window.clearInterval(timer.current);
      m.remove();
      map.current = null;
    };
  }, []);

  // Data
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    heatLayer.current?.clearLayers();
    // Soft overlapping discs approximate a heat map without a plugin.
    for (const v of visits) {
      heatLayer.current?.addLayer(
        L.circleMarker([v.lat, v.lng], { radius: 38, stroke: false, fillColor: "#E8590C", fillOpacity: 0.14, interactive: false })
      );
    }
    drawAll();
    if (visits.length === 1) m.setView([visits[0].lat, visits[0].lng], 14);
    else if (visits.length > 1) m.fitBounds(L.latLngBounds(visits.map((v) => [v.lat, v.lng])), { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits]);

  useEffect(() => {
    const m = map.current;
    if (!m || !heatLayer.current) return;
    if (heat) heatLayer.current.addTo(m);
    else heatLayer.current.remove();
  }, [heat]);

  function stop() {
    window.clearInterval(timer.current);
    setPlaying(false);
    setCaption("");
    drawAll();
  }

  function play() {
    if (playing) return stop();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const layer = pinLayer.current;
    if (!layer || sorted.length === 0) return;
    layer.clearLayers();
    const line = L.polyline([], { color: "#14202B", weight: 2, opacity: 0.6, dashArray: "4 6" }).addTo(layer);

    if (reduce) {
      sorted.forEach((v) => {
        layer.addLayer(pin(v));
        line.addLatLng([v.lat, v.lng]);
      });
      return;
    }

    setPlaying(true);
    let i = 0;
    const step = () => {
      const v = sorted[i];
      layer.addLayer(pin(v));
      line.addLatLng([v.lat, v.lng]);
      setCaption(`${visitDate(v).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })} · ${v.place_name}`);
      i++;
      if (i >= sorted.length) {
        window.clearInterval(timer.current);
        setPlaying(false);
      }
    };
    step();
    timer.current = window.setInterval(step, 700);
  }

  return (
    <div className="relative isolate h-[460px] overflow-hidden rounded-[20px] bg-mt-land">
      <div
        ref={ref}
        role="img"
        aria-label={`Mapa pessoal com ${visits.length} visitas`}
        className="maptrip-map absolute inset-0"
      />
      <div className="absolute left-3.5 top-3.5 z-[1000] ml-12 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={heat}
          onClick={() => setHeat((h) => !h)}
          className={`flex h-[38px] items-center rounded-full px-3.5 text-[13px] font-bold shadow-[0_1px_4px_rgba(20,32,43,0.15)] ${
            heat ? "bg-mt-ink text-white" : "bg-white text-mt-ink"
          }`}
        >
          Mapa de calor
        </button>
        <button
          type="button"
          onClick={play}
          disabled={visits.length < 2}
          className="flex h-[38px] items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-bold text-mt-ink shadow-[0_1px_4px_rgba(20,32,43,0.15)] disabled:opacity-50"
        >
          {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {playing ? "Parar" : "Linha do tempo das viagens"}
        </button>
      </div>
      {caption && (
        <div aria-live="polite" className="absolute bottom-3.5 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-mt-ink px-4 py-2 text-[13px] font-bold text-white">
          {caption}
        </div>
      )}
      <span className="absolute bottom-3.5 right-3.5 z-[1000] rounded-md bg-white/90 px-2 py-1 text-[11px] text-mt-ink-2">
        Mapa ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="hover:underline">
          OpenStreetMap
        </a>
      </span>
    </div>
  );
}
