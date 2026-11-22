"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Crosshair } from "lucide-react";

type LocationPickerProps = {
  lat: number | null;
  lng: number | null;
  placeName: string;
  onSelect: (lat: number, lng: number, placeName: string) => void;
};

const pinIcon = L.divIcon({
  html: `<div style="
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #22c55e, #15803d);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 3px 12px rgba(0,0,0,0.25);
    display: flex; align-items: center; justify-content: center;
  ">
    <svg style="transform: rotate(45deg);" width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3" fill="white"/>
    </svg>
  </div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

export function LocationPicker({
  lat,
  lng,
  placeName,
  onSelect,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const defaultLat = lat || -3.119;
    const defaultLng = lng || -60.0217;

    const map = L.map(mapRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    // If there's already a location, place marker
    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    }

    // Click on map to set location
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;

      // Move or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng], {
          icon: pinIcon,
        }).addTo(map);
      }

      // Reverse geocode to get place name
      const name = await reverseGeocode(clickLat, clickLng);
      onSelect(clickLat, clickLng, name);
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reverseGeocode(
    lat: number,
    lng: number
  ): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "pt-BR" } }
      );
      const data = await res.json();
      if (data.display_name) {
        // Return a cleaner name: first 2-3 parts
        const parts = data.display_name.split(", ");
        return parts.slice(0, 3).join(", ");
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstance.current) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`,
        { headers: { "Accept-Language": "pt-BR" } }
      );
      const results = await res.json();

      if (results.length > 0) {
        const { lat: rLat, lon: rLng, display_name } = results[0];
        const numLat = parseFloat(rLat);
        const numLng = parseFloat(rLng);

        mapInstance.current.flyTo([numLat, numLng], 16, {
          duration: 1.2,
        });

        if (markerRef.current) {
          markerRef.current.setLatLng([numLat, numLng]);
        } else {
          markerRef.current = L.marker([numLat, numLng], {
            icon: pinIcon,
          }).addTo(mapInstance.current);
        }

        const cleanName = display_name.split(", ").slice(0, 3).join(", ");
        onSelect(numLat, numLng, cleanName);
      }
    } catch {
      // Search failed silently
    }
    setSearching(false);
  }

  async function handleUseMyLocation() {
    if (!navigator.geolocation || !mapInstance.current) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        mapInstance.current?.flyTo([latitude, longitude], 16, {
          duration: 1.2,
        });

        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        } else if (mapInstance.current) {
          markerRef.current = L.marker([latitude, longitude], {
            icon: pinIcon,
          }).addTo(mapInstance.current);
        }

        const name = await reverseGeocode(latitude, longitude);
        onSelect(latitude, longitude, name);
      },
      () => {
        // Permission denied or error - ignore silently
      }
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Localização <span className="text-red-400">*</span>
      </label>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar endereço ou local..."
            className="input-field pl-9 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="btn-secondary text-sm px-3"
        >
          {searching ? "..." : "Buscar"}
        </button>
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="btn-icon"
          title="Usar minha localização"
        >
          <Crosshair size={18} />
        </button>
      </form>

      {/* Map */}
      <div
        ref={mapRef}
        className="h-56 w-full rounded-xl border border-gray-200 overflow-hidden"
      />

      {/* Selected location feedback */}
      {lat && lng && (
        <div className="flex items-center gap-2 text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2">
          <MapPin size={14} />
          <span className="truncate">{placeName}</span>
          <span className="ml-auto text-xs text-brand-500 shrink-0">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
        </div>
      )}

      {!lat && !lng && (
        <p className="text-xs text-gray-400">
          Clique no mapa ou busque um endereço para selecionar a localização.
        </p>
      )}
    </div>
  );
}
