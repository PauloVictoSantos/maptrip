"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster";
import { Check, Crosshair, Loader2, Minus, Plus, RotateCw, Star, X } from "lucide-react";
import { createAvatarPinIcon, createClusterIcon, createPinIcon } from "./pinIcons";
import {
  CATEGORY_GROUPS,
  GROUP_ORDER,
  formatRatingBR,
  groupFor,
  type CategoryGroup,
} from "./categories";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/utils";
import type { MapLayer, MapPin } from "@/lib/types";
import { placeHref } from "@/lib/place";

const DEFAULT_CENTER: L.LatLngTuple = [-3.119, -60.0217]; // Manaus
const LIST_LIMIT = 100;

const LAYER_OPTIONS: { value: MapLayer; label: string }[] = [
  { value: "mine", label: "Minhas visitas" },
  { value: "friends", label: "Amigos" },
  { value: "community", label: "Comunidade" },
];

const EMPTY_TEXT: Record<MapLayer, string> = {
  mine: "Você ainda não registrou visitas nesta área.",
  friends: "Nenhuma visita de quem você segue nesta área.",
  community: "Nenhuma visita pública nesta área.",
};

type Area = { bounds: L.LatLngBounds; center: L.LatLng };
type MoveIntent = { kind: "fit" | "select"; until: number };

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** People you follow appear with their profile photo; everyone else with the category pin. */
function pinIcon(pin: MapPin, selected: boolean) {
  return pin.following ? createAvatarPinIcon(pin, selected) : createPinIcon(pin.category, pin.rating, selected);
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

export default function MapView() {
  const { profile } = useAuthContext();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const clusterGroup = useRef<L.MarkerClusterGroup | null>(null);
  const markersById = useRef(new Map<string, L.Marker>());
  const userMarker = useRef<L.CircleMarker | null>(null);
  const moveIntent = useRef<MoveIntent | null>(null);
  const fitOnNextLoad = useRef(true);
  const selectedIdRef = useRef<string | null>(null);
  const prevSelectedId = useRef<string | null>(null);

  const [layer, setLayer] = useState<MapLayer>("community");
  const [minRating4, setMinRating4] = useState(false);
  const [group, setGroup] = useState<CategoryGroup | null>(null);
  const [typeOpen, setTypeOpen] = useState(false);

  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [areaDirty, setAreaDirty] = useState(false);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const [locating, setLocating] = useState(false);

  const pinsById = useMemo(() => new Map(pins.map((p) => [p.id, p])), [pins]);
  const selected = selectedId ? pinsById.get(selectedId) ?? null : null;

  // ---- Data -------------------------------------------------------------
  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams({ layer });
    if (group) params.set("categories", CATEGORY_GROUPS[group].categories.join(","));
    if (minRating4) params.set("minRating", "4");

    setLoading(true);
    setError("");
    fetch(`/api/map-pins?${params}`, { signal: ctrl.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Erro ao carregar o mapa.");
          setPins([]);
          return;
        }
        setPins(data.pins || []);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setError("Erro de conexão. Tente novamente.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [layer, group, minRating4]);

  // ---- Map init (once) --------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: false,
      attributionControl: false, // attribution is shown in the legend
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    const cluster = L.markerClusterGroup({
      iconCreateFunction: createClusterIcon,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    });
    map.addLayer(cluster);

    const syncArea = () => setArea({ bounds: map.getBounds(), center: map.getCenter() });

    map.on("moveend", () => {
      const intent = moveIntent.current;
      if (intent && Date.now() < intent.until) {
        if (intent.kind === "fit") {
          syncArea();
          setAreaDirty(false);
        }
        return; // "select" moves keep the current list
      }
      moveIntent.current = null;
      setAreaDirty(true);
    });
    map.on("click", () => setSelectedId(null));

    mapInstance.current = map;
    clusterGroup.current = cluster;
    syncArea();

    const markers = markersById.current;
    return () => {
      map.remove();
      mapInstance.current = null;
      clusterGroup.current = null;
      userMarker.current = null;
      markers.clear();
    };
  }, []);

  const programmaticMove = (kind: MoveIntent["kind"]) => {
    moveIntent.current = { kind, until: Date.now() + 1500 };
  };

  // ---- Markers ----------------------------------------------------------
  useEffect(() => {
    const map = mapInstance.current;
    const cluster = clusterGroup.current;
    if (!map || !cluster) return;

    cluster.clearLayers();
    markersById.current.clear();

    // Drop the selection if the selected visit was filtered out
    if (selectedIdRef.current && !pins.some((p) => p.id === selectedIdRef.current)) {
      setSelectedId(null);
    }

    const markers = pins.map((pin) => {
      const label = CATEGORY_GROUPS[groupFor(pin.category)].label.toLowerCase();
      const isSelected = pin.id === selectedIdRef.current;
      const marker = L.marker([pin.lat, pin.lng], {
        icon: pinIcon(pin, isSelected),
        title: `${pin.place_name}, ${label}, nota ${formatRatingBR(pin.rating)}${pin.following ? `, visita de ${pin.display_name || pin.username}` : ""}`,
        keyboard: true,
        zIndexOffset: isSelected ? 1000 : 0,
      });
      marker.on("click", () => setSelectedId(pin.id));
      markersById.current.set(pin.id, marker);
      return marker;
    });
    cluster.addLayers(markers);

    if (fitOnNextLoad.current && pins.length > 0) {
      fitOnNextLoad.current = false;
      programmaticMove("fit");
      if (pins.length === 1) {
        map.setView([pins[0].lat, pins[0].lng], 15);
      } else {
        map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), {
          padding: [60, 60],
          maxZoom: 15,
        });
      }
    }
  }, [pins]);

  // ---- Selection --------------------------------------------------------
  useEffect(() => {
    selectedIdRef.current = selectedId;
    const prev = prevSelectedId.current;

    if (prev && prev !== selectedId) {
      const marker = markersById.current.get(prev);
      const pin = pinsById.get(prev);
      if (marker && pin) {
        marker.setIcon(pinIcon(pin, false));
        marker.setZIndexOffset(0);
      }
    }
    if (selectedId) {
      const marker = markersById.current.get(selectedId);
      const pin = pinsById.get(selectedId);
      if (marker && pin) {
        marker.setIcon(pinIcon(pin, true));
        marker.setZIndexOffset(1000);
      }
    }
    prevSelectedId.current = selectedId;
  }, [selectedId, pinsById]);

  // Escape closes the place card
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  // Transient notices disappear on their own
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const focusPin = useCallback((id: string) => {
    setSelectedId(id);
    const marker = markersById.current.get(id);
    const map = mapInstance.current;
    const cluster = clusterGroup.current;
    if (!marker || !map || !cluster) return;
    programmaticMove("select");
    cluster.zoomToShowLayer(marker, () => {
      programmaticMove("select");
      map.panTo(marker.getLatLng(), { animate: !prefersReducedMotion() });
    });
  }, []);

  // ---- Actions ----------------------------------------------------------
  function changeLayer(next: MapLayer) {
    if (next === layer) return;
    fitOnNextLoad.current = true;
    setSelectedId(null);
    setLayer(next);
  }

  function chooseGroup(next: CategoryGroup | null) {
    setGroup((g) => (g === next ? null : next));
    setTypeOpen(false);
  }

  function searchThisArea() {
    const map = mapInstance.current;
    if (!map) return;
    setArea({ bounds: map.getBounds(), center: map.getCenter() });
    setAreaDirty(false);
  }

  function locate() {
    if (!navigator.geolocation) {
      setNotice("Seu navegador não permite obter a localização.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
        setUserLocation(latlng);
        const map = mapInstance.current;
        if (!map) return;
        if (userMarker.current) {
          userMarker.current.setLatLng(latlng);
        } else {
          userMarker.current = L.circleMarker(latlng, {
            radius: 8,
            color: "#FFFFFF",
            weight: 3,
            fillColor: "#1971C2",
            fillOpacity: 1,
            interactive: false,
          }).addTo(map);
        }
        programmaticMove("fit");
        map.setView(latlng, Math.max(map.getZoom(), 14), { animate: !prefersReducedMotion() });
      },
      () => {
        setLocating(false);
        setNotice("Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ---- Derived list -----------------------------------------------------
  const areaPins = useMemo(() => {
    const origin = userLocation ?? area?.center ?? null;
    const inArea = area ? pins.filter((p) => area.bounds.contains([p.lat, p.lng])) : pins;
    return inArea
      .map((pin) => ({ pin, distance: origin ? origin.distanceTo([pin.lat, pin.lng]) : 0 }))
      .sort((a, b) => a.distance - b.distance);
  }, [pins, area, userLocation]);

  const selectedDistance =
    selected && userLocation ? userLocation.distanceTo([selected.lat, selected.lng]) : null;

  const filterProps = {
    minRating4,
    onToggleRating: () => setMinRating4((v) => !v),
    group,
    onChooseGroup: chooseGroup,
    typeOpen,
    onToggleType: () => setTypeOpen((v) => !v),
  };

  const countLabel = `${areaPins.length} ${areaPins.length === 1 ? "visita" : "visitas"} nesta área`;

  return (
    <div className="-mb-24 flex h-[calc(100dvh-4rem)] bg-mt-bg text-mt-ink md:-mb-8">
      {/* ---------------- Sidebar (desktop) ---------------- */}
      <aside className="hidden w-[340px] shrink-0 flex-col border-r border-mt-line bg-white lg:flex">
        <div className="flex flex-col gap-4 px-5 pt-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.6px] text-mt-muted">Sua região</div>
            <h1 className="mt-0.5 text-[22px] font-extrabold tracking-[-0.3px]">
              {profile?.city || "Seu mapa"}
            </h1>
          </div>
          <LayerToggle layer={layer} onChange={changeLayer} />
          <FilterChips {...filterProps} />
          <div className="h-px bg-mt-line" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold" aria-live="polite">
              {loading ? "Carregando…" : countLabel}
            </span>
            <span className="text-xs font-semibold text-mt-muted">
              {userLocation ? "Mais próximas de você" : "Mais próximas do centro"}
            </span>
          </div>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto px-3 pb-4">
          {loading ? (
            <ListSkeleton />
          ) : areaPins.length === 0 ? (
            <div className="px-2 py-6 text-sm text-mt-muted">
              <p>{error || EMPTY_TEXT[layer]}</p>
              {!error && (
                <p className="mt-1">
                  {layer === "mine" ? (
                    <Link href="/post/new" className="font-bold text-mt-teal-dark hover:underline">
                      Registrar uma visita
                    </Link>
                  ) : (
                    "Afaste o mapa ou mude os filtros."
                  )}
                </p>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {areaPins.slice(0, LIST_LIMIT).map(({ pin, distance }) => (
                <li key={pin.id}>
                  <PlaceRow
                    pin={pin}
                    distance={userLocation ? distance : null}
                    selected={pin.id === selectedId}
                    onSelect={() => focusPin(pin.id)}
                  />
                </li>
              ))}
              {areaPins.length > LIST_LIMIT && (
                <li className="px-2 py-3 text-xs text-mt-muted">
                  Mostrando as {LIST_LIMIT} mais próximas. Aproxime o mapa para ver outras.
                </li>
              )}
            </ul>
          )}
        </div>
      </aside>

      {/* ---------------- Map ---------------- */}
      <section aria-label="Mapa interativo" className="relative isolate min-w-0 flex-1 overflow-hidden bg-mt-land">
        <div ref={mapRef} className="maptrip-map absolute inset-0" />

        {/* Top stack: mobile controls + status / "search this area" */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex flex-col items-center gap-2 lg:inset-x-auto lg:left-1/2 lg:top-4 lg:-translate-x-1/2">
          <div className="pointer-events-auto flex w-full flex-col gap-2 lg:hidden">
            <div className="rounded-full bg-white shadow-[0_2px_10px_rgba(20,32,43,0.14)]">
              <LayerToggle layer={layer} onChange={changeLayer} />
            </div>
            <FilterChips {...filterProps} floating />
          </div>

          {loading ? (
            <StatusPill>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Carregando visitas…
            </StatusPill>
          ) : error ? (
            <StatusPill tone="error">{error}</StatusPill>
          ) : areaDirty ? (
            <button
              type="button"
              onClick={searchThisArea}
              className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-mt-ink px-4 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(20,32,43,0.25)] hover:bg-black"
            >
              <RotateCw size={16} aria-hidden="true" />
              Pesquisar nesta área
            </button>
          ) : null}

          {notice && <StatusPill tone="error">{notice}</StatusPill>}

          {/* Mobile count, since the list lives in the desktop sidebar */}
          {!loading && !error && (
            <span className="pointer-events-auto rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-mt-ink-2 shadow-sm lg:hidden">
              {areaPins.length === 0 ? EMPTY_TEXT[layer] : countLabel}
            </span>
          )}
        </div>

        {/* Selected place */}
        {selected && (
          <PlaceCard
            key={selected.id}
            pin={selected}
            distance={selectedDistance}
            linkToPlace={layer === "community"}
            onClose={() => setSelectedId(null)}
          />
        )}

        {/* Legend (desktop) */}
        <div className="absolute bottom-4 left-4 z-[1000] hidden rounded-[14px] bg-white px-3 py-2.5 shadow-[0_2px_10px_rgba(20,32,43,0.14)] lg:block">
          <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-mt-muted">Legenda</div>
          <ul className="mt-1.5 flex flex-col gap-1 text-xs font-semibold">
            {GROUP_ORDER.filter((g) => g !== "outro").map((g) => (
              <li key={g} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: CATEGORY_GROUPS[g].color }} />
                {CATEGORY_GROUPS[g].label}
              </li>
            ))}
            {layer !== "mine" && (
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-mt-ink-2 bg-mt-teal-soft" />
                Foto: quem você segue
              </li>
            )}
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="h-3 w-3 rounded-full bg-mt-teal shadow-[0_0_0_3px_rgba(14,124,134,0.22)]" />
              Grupo de visitas
            </li>
          </ul>
          <Attribution className="mt-2" />
        </div>
        <Attribution className="absolute bottom-1 left-2 z-[999] rounded bg-white/85 px-1.5 py-0.5 lg:hidden" />

        {/* Map controls */}
        <div
          className={`absolute bottom-4 right-4 z-[1000] flex-col items-end gap-2 ${
            selected ? "hidden lg:flex" : "flex"
          }`}
        >
          <button
            type="button"
            onClick={locate}
            aria-label="Centralizar na minha localização"
            disabled={locating}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-mt-teal shadow-[0_2px_8px_rgba(20,32,43,0.15)] hover:bg-mt-chip disabled:opacity-70"
          >
            {locating ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={20} />}
          </button>
          <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(20,32,43,0.15)]">
            <button
              type="button"
              aria-label="Aproximar"
              onClick={() => mapInstance.current?.zoomIn()}
              className="flex h-11 w-11 items-center justify-center border-b border-mt-line text-mt-ink hover:bg-mt-chip"
            >
              <Plus size={18} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              aria-label="Afastar"
              onClick={() => mapInstance.current?.zoomOut()}
              className="flex h-11 w-11 items-center justify-center text-mt-ink hover:bg-mt-chip"
            >
              <Minus size={18} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function GroupGlyph({ group, size, strokeWidth = 2.2 }: { group: CategoryGroup; size: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {CATEGORY_GROUPS[group].paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function LayerToggle({ layer, onChange }: { layer: MapLayer; onChange: (l: MapLayer) => void }) {
  return (
    <div role="group" aria-label="Camada do mapa" className="flex gap-1 rounded-full bg-mt-chip p-1">
      {LAYER_OPTIONS.map((opt) => {
        const active = layer === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`h-9 flex-1 whitespace-nowrap rounded-full px-2 text-[13px] transition-colors ${
              active ? "bg-mt-teal font-bold text-white" : "font-semibold text-mt-ink-2 hover:bg-white/80"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

type FilterChipsProps = {
  minRating4: boolean;
  onToggleRating: () => void;
  group: CategoryGroup | null;
  onChooseGroup: (g: CategoryGroup | null) => void;
  typeOpen: boolean;
  onToggleType: () => void;
  floating?: boolean;
};

function chipClass(active: boolean, floating?: boolean) {
  return `flex h-[34px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 text-[13px] transition-colors ${
    active
      ? "border-mt-teal bg-mt-teal-soft font-bold text-mt-teal-dark"
      : "border-mt-line-strong bg-white font-semibold text-mt-ink hover:bg-mt-chip"
  } ${floating ? "shadow-sm" : ""}`;
}

function FilterChips({
  minRating4,
  onToggleRating,
  group,
  onChooseGroup,
  typeOpen,
  onToggleType,
  floating,
}: FilterChipsProps) {
  const row = floating ? "flex gap-1.5 overflow-x-auto scrollbar-hide" : "flex flex-wrap gap-1.5";
  return (
    <div className="flex flex-col gap-2">
      <div className={row}>
        <button type="button" aria-pressed={minRating4} onClick={onToggleRating} className={chipClass(minRating4, floating)}>
          {minRating4 && <Check size={13} strokeWidth={3} aria-hidden="true" />}
          Nota 4+
        </button>
        <button
          type="button"
          aria-expanded={typeOpen}
          onClick={onToggleType}
          className={chipClass(!!group, floating)}
        >
          {group && <Check size={13} strokeWidth={3} aria-hidden="true" />}
          {group ? CATEGORY_GROUPS[group].label : "Tipo"}
        </button>
        {group && (
          <button
            type="button"
            onClick={() => onChooseGroup(null)}
            aria-label={`Remover filtro ${CATEGORY_GROUPS[group].label}`}
            className={`${chipClass(false, floating)} px-2.5`}
          >
            <X size={14} strokeWidth={2.4} aria-hidden="true" />
          </button>
        )}
      </div>

      {typeOpen && (
        <div role="group" aria-label="Tipo de lugar" className={row}>
          {GROUP_ORDER.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={group === g}
              onClick={() => onChooseGroup(g)}
              className={chipClass(group === g, floating)}
            >
              <span aria-hidden="true" className="mr-0.5 h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_GROUPS[g].color }} />
              {CATEGORY_GROUPS[g].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlaceRow({
  pin,
  distance,
  selected,
  onSelect,
}: {
  pin: MapPin;
  distance: number | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const key = groupFor(pin.category);
  const g = CATEGORY_GROUPS[key];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-[14px] border-[1.5px] p-2.5 text-left transition-colors ${
        selected ? "border-mt-teal bg-mt-teal-soft" : "border-transparent hover:bg-mt-bg"
      }`}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: g.color }}
      >
        <GroupGlyph group={key} size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold">{pin.place_name}</span>
        <span className="mt-0.5 block text-xs text-mt-muted">
          {g.label} · ★ {formatRatingBR(pin.rating)}
          {distance != null && ` · ${formatDistance(distance)}`}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-mt-teal-dark">
          {pin.display_name || pin.username} esteve aqui
        </span>
      </span>
    </button>
  );
}

function PlaceCard({
  pin,
  distance,
  linkToPlace,
  onClose,
}: {
  pin: MapPin;
  distance: number | null;
  linkToPlace: boolean;
  onClose: () => void;
}) {
  const key = groupFor(pin.category);
  const g = CATEGORY_GROUPS[key];
  const author = pin.display_name || pin.username;

  return (
    <div
      role="dialog"
      aria-labelledby="map-card-title"
      className="maptrip-card-in absolute inset-x-3 bottom-3 z-[1001] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-[20px] bg-white shadow-[0_8px_28px_rgba(20,32,43,0.18)] lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-4 lg:max-h-[calc(100%-2rem)] lg:w-[360px]"
    >
      <div
        className="relative flex h-28 items-center justify-center lg:h-40"
        style={{ background: g.soft, color: g.color }}
      >
        {pin.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pin.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <GroupGlyph group={key} size={36} strokeWidth={1.6} />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel"
          className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-mt-ink shadow-sm hover:bg-mt-chip"
        >
          <X size={16} strokeWidth={2.4} />
        </button>
        {pin.media_count > 1 && (
          <span className="absolute bottom-2.5 left-2.5 flex h-6 items-center rounded-full bg-[rgba(20,32,43,0.78)] px-2 text-xs font-bold text-white">
            {pin.media_count} fotos
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-[22px] items-center rounded-md px-2 text-xs font-bold"
            style={{ background: g.soft, color: g.softText }}
          >
            {g.label}
          </span>
          {distance != null && (
            <span className="text-xs font-medium text-mt-muted">{formatDistance(distance)} de você</span>
          )}
        </div>
        <h2 id="map-card-title" className="mt-2 text-[22px] font-extrabold leading-tight tracking-[-0.3px]">
          {pin.place_name}
        </h2>
        <div className="mt-1 flex items-center gap-1 text-[13px] text-mt-muted">
          <Star size={16} fill="#E8590C" color="#E8590C" strokeWidth={1.5} aria-hidden="true" />
          <strong className="font-extrabold text-mt-ink">{formatRatingBR(pin.rating)}</strong>
          <span>· nota de {author}</span>
        </div>

        <div className="mt-3 flex gap-2.5 rounded-[14px] bg-mt-bg p-3">
          <Avatar src={pin.avatar_url} name={author} size="sm" className="shrink-0 ring-0" />
          <div className="min-w-0 text-[13px] leading-[19px]">
            <strong className="font-extrabold">{author}</strong>{" "}
            <span className="text-mt-muted">· {formatDate(pin.created_at)}</span>
            <p className="font-semibold">{pin.title}</p>
            {pin.excerpt && <p className="text-mt-ink-2">{pin.excerpt}</p>}
          </div>
        </div>

        <div className="mt-3.5 flex gap-2">
          <Link
            href={linkToPlace ? placeHref(pin.place_name, pin.lat, pin.lng) : `/post/${pin.id}`}
            className="flex h-11 flex-1 items-center justify-center rounded-full bg-mt-teal text-sm font-bold text-white hover:bg-mt-teal-dark"
          >
            {linkToPlace ? "Ver lugar" : "Ver visita"}
          </Link>
          <Link
            href={`/post/new?${new URLSearchParams({
              lat: String(pin.lat),
              lng: String(pin.lng),
              place: pin.place_name,
              ...(pin.category ? { category: pin.category } : {}),
            })}`}
            className="flex h-11 flex-[1.3] items-center justify-center rounded-full border-[1.5px] border-mt-teal text-sm font-bold text-mt-teal-dark hover:bg-mt-teal-soft"
          >
            Registrar visita aqui
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return (
    <div
      role="status"
      className={`pointer-events-auto flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold shadow-[0_4px_12px_rgba(20,32,43,0.2)] ${
        tone === "error" ? "bg-[#FFF0F0] text-[#B42323]" : "bg-white text-mt-ink"
      }`}
    >
      {children}
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul aria-hidden="true" className="flex flex-col gap-1">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 p-2.5">
          <span className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-mt-chip motion-reduce:animate-none" />
          <span className="flex-1 space-y-2">
            <span className="block h-3.5 w-2/3 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
            <span className="block h-3 w-1/2 animate-pulse rounded bg-mt-chip motion-reduce:animate-none" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Attribution({ className = "" }: { className?: string }) {
  return (
    <div className={`text-[11px] text-mt-muted ${className}`}>
      Mapa ©{" "}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="underline-offset-2 hover:underline"
      >
        OpenStreetMap
      </a>
    </div>
  );
}
