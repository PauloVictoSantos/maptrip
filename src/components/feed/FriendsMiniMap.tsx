"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { avatarColors } from "@/components/ui/PersonAvatar";
import { getInitials } from "@/lib/utils";
import type { SidebarResponse } from "@/lib/feed";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]!);
}

/** Small, non-interactive map with the latest visit of each friend this week. */
export default function FriendsMiniMap({ friends }: { friends: SidebarResponse["friendsOnMap"] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || friends.length === 0) return;
    const map = L.map(ref.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    for (const f of friends) {
      const name = f.user.display_name || f.user.username;
      const [bg, fg] = avatarColors(name);
      const inner = f.user.avatar_url
        ? `<img src="${escapeHtml(f.user.avatar_url)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
        : escapeHtml(getInitials(name));
      L.marker([f.lat, f.lng], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: "maptrip-pin",
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          html: `<div style="width:30px;height:30px;box-sizing:border-box;border-radius:50%;border:2px solid #fff;background:${bg};color:${fg};font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(20,32,43,.25)">${inner}</div>`,
        }),
      }).addTo(map);
    }

    if (friends.length === 1) map.setView([friends[0].lat, friends[0].lng], 13);
    else map.fitBounds(L.latLngBounds(friends.map((f) => [f.lat, f.lng])), { padding: [24, 24], maxZoom: 14 });

    return () => {
      map.remove();
    };
  }, [friends]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`Mapa com ${friends.length} amigos: ${friends
        .map((f) => `${f.user.display_name || f.user.username} em ${f.place_name}`)
        .join("; ")}`}
      className="maptrip-map h-[180px] bg-mt-land"
    />
  );
}
