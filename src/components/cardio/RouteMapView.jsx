import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Free dark basemap (Esri Dark Gray Canvas) — no API key required.
// Note: Esri uses {z}/{y}/{x} tile order (y before x), no retina/subdomain tokens.
const DARK_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";

// Inner component that imperatively controls the map (follow / fitBounds)
function MapController({ points, follow, fit }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    if (fit && points.length >= 1) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    } else if (follow) {
      const last = points[points.length - 1];
      map.panTo([last.lat, last.lng], { animate: true });
    }
  }, [points, follow, fit, map]);
  return null;
}

export default function RouteMapView({
  points = [],
  follow = false,
  fit = false,
  interactive = true,
  color = "#2196F3",
  className = "",
}) {
  const latlngs = points.map((p) => [p.lat, p.lng]);
  const center = latlngs.length ? latlngs[0] : [0, 0];

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ height: "100%", width: "100%", background: "#0a0a0a" }}
      scrollWheelZoom={interactive}
      zoomControl={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      className={className}
    >
      <TileLayer
        url={DARK_TILES}
        maxZoom={16}
        attribution='&copy; Esri, DeLorme, NAVTEQ'
      />
      <MapController points={points} follow={follow} fit={fit} />
      {latlngs.length >= 2 && (
        <Polyline
          positions={latlngs}
          pathOptions={{ color, weight: 4, opacity: 0.9, lineCap: "round" }}
        />
      )}
      {latlngs.length >= 1 && (
        <CircleMarker
          center={latlngs[latlngs.length - 1]}
          radius={6}
          pathOptions={{ color, fillColor: color, fillOpacity: 1 }}
        />
      )}
      {latlngs.length >= 1 && (
        <CircleMarker
          center={latlngs[0]}
          radius={5}
          pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1 }}
        />
      )}
    </MapContainer>
  );
}