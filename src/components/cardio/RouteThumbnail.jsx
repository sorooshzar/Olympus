import React, { useMemo } from "react";

// Lightweight decimated polyline SVG of a GPS route, colored by activity.
// Avoids loading Leaflet tiles in list rows.
export default function RouteThumbnail({ points = [], color = "#FF5722", className = "" }) {
  const path = useMemo(() => {
    if (!points || points.length < 2) return null;
    const n = points.length;
    const maxPts = 48;
    const step = Math.max(1, Math.floor(n / maxPts));
    const sampled = points.filter((_, i) => i % step === 0);
    if (sampled.length < 2) sampled.push(points[n - 1]);

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of sampled) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
    const latRange = maxLat - minLat || 1e-6;
    const lngRange = maxLng - minLng || 1e-6;
    const pad = 8;
    const size = 100;
    const inner = size - pad * 2;
    const xy = sampled.map((p) => {
      const x = pad + ((p.lng - minLng) / lngRange) * inner;
      const y = pad + ((maxLat - p.lat) / latRange) * inner;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return xy.join(" ");
  }, [points]);

  if (!path) return null;

  return (
    <svg viewBox="0 0 100 100" className={className} preserveAspectRatio="none">
      <polyline
        points={path}
        fill="none"
        stroke={color}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </svg>
  );
}