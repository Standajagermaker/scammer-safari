"use client";

import { useEffect, useRef } from "react";

const PRAGUE_CENTER = { lat: 50.0755, lng: 14.4378 };

export default function LeafletMap({
  points = [],
  center,
  height = 260,
  zoom = 14,
  heat = false,
  title = "Map",
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let map;

    async function initMap() {
      if (!containerRef.current) return;

      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const validPoints = points
        .map((point) => ({
          ...point,
          lat: Number(point.lat),
          lng: Number(point.lng),
        }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

      const mapCenter = center && Number.isFinite(Number(center.lat)) && Number.isFinite(Number(center.lng))
        ? [Number(center.lat), Number(center.lng)]
        : validPoints.length
          ? [validPoints[0].lat, validPoints[0].lng]
          : [PRAGUE_CENTER.lat, PRAGUE_CENTER.lng];

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView(mapCenter, zoom);

      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      validPoints.forEach((point) => {
        if (heat) {
          L.circle([point.lat, point.lng], {
            radius: point.radius || 80,
            color: "#fbbf24",
            fillColor: "#fbbf24",
            fillOpacity: 0.22,
            weight: 2,
          }).addTo(map);
        } else {
          L.marker([point.lat, point.lng]).addTo(map).bindPopup(point.label || point.title || "Scam report");
        }
      });

      if (validPoints.length > 1) {
        const bounds = L.latLngBounds(validPoints.map((point) => [point.lat, point.lng]));
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
      }

      setTimeout(() => map.invalidateSize(), 150);
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [JSON.stringify(points), JSON.stringify(center), height, zoom, heat]);

  return (
    <div style={{ border: "1px solid #333", borderRadius: 16, overflow: "hidden", background: "#111" }}>
      <div ref={containerRef} aria-label={title} style={{ width: "100%", height }} />
    </div>
  );
}
