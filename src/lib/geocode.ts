// Browser-side geocoding with OpenStreetMap Nominatim (same provider as the rest of the app).

export type GeoResult = { lat: number; lng: number; name: string; label: string };

type NominatimRow = { lat: string; lon: string; display_name?: string; name?: string };

/** Up to `limit` matches; with `near`, results inside ~25 km of that point come first. */
export async function geocodeSearch(text: string, opts: { limit?: number; near?: { lat: number; lng: number } } = {}): Promise<GeoResult[]> {
  const q = text.trim();
  if (!q) return [];
  const params = new URLSearchParams({ format: "json", limit: String(opts.limit ?? 5), q });
  if (opts.near) {
    const d = 0.25;
    params.set("viewbox", [opts.near.lng - d, opts.near.lat + d, opts.near.lng + d, opts.near.lat - d].join(","));
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "Accept-Language": "pt-BR" } });
  if (!res.ok) throw new Error("Busca de endereços indisponível. Tente de novo.");
  const rows = (await res.json()) as NominatimRow[];
  return rows
    .map((r) => {
      const parts = String(r.display_name ?? q).split(", ");
      return { lat: parseFloat(r.lat), lng: parseFloat(r.lon), name: r.name || parts[0], label: parts.slice(0, 3).join(", ") };
    })
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}

/** City center, cached in localStorage (the feed uses the same cache key). */
export async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  const key = `mt:city:${city.trim().toLowerCase()}`;
  try {
    const cached = JSON.parse(localStorage.getItem(key) ?? "null");
    if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) return cached;
  } catch {
    /* storage unavailable */
  }
  const [first] = await geocodeSearch(city, { limit: 1 });
  if (!first) return null;
  try {
    localStorage.setItem(key, JSON.stringify({ lat: first.lat, lng: first.lng }));
  } catch {
    /* storage unavailable */
  }
  return { lat: first.lat, lng: first.lng };
}
