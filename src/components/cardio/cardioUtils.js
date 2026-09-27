// Pure utility functions for the Cardio feature.

// Haversine distance between two {lat,lng}-ish coords, returns km.
export function haversineKm(c1, c2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(c2.lat - c1.lat);
  const dLng = toRad(c2.lng - c1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(c1.lat)) * Math.cos(toRad(c2.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Total distance of a route_points array (km).
export function routeDistanceKm(points) {
  if (!points || points.length < 2) return 0;
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += haversineKm(points[i - 1], points[i]);
  }
  return d;
}

// calories = MET * bodyweightKg * durationHours
export function computeCalories(met, weightKg, durationSeconds) {
  if (!met || !weightKg || !durationSeconds) return 0;
  return Math.round(met * weightKg * (durationSeconds / 3600));
}

// Format seconds as MM:SS or HH:MM:SS
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// Format minutes (float) as "Xm" or "Xh Ym"
export function formatTotalMins(mins) {
  if (!mins) return "0m";
  if (mins < 60) return `${Math.round(mins)}m`;
  return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
}

// Format pace seconds-per-km as "M:SS" with unit label
export function formatPace(secPerKm, isMetric = true) {
  if (!secPerKm || !isFinite(secPerKm)) return "--";
  const val = isMetric ? secPerKm : secPerKm * 1.609344; // sec/mi
  const m = Math.floor(val / 60);
  const s = Math.round(val % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Compute per-unit splits from route_points.
// splitIntervalKm: 1.0 for km splits, 1.609344 for mile splits.
// Returns array of { distance (km), duration (sec), pace (sec/km), segment_index }.
export function computeSplits(points, splitIntervalKm = 1.0) {
  if (!points || points.length < 2) return [];
  const splits = [];
  let accumulated = 0; // km since last split boundary
  let segmentStartTs = new Date(points[0].timestamp).getTime();
  let segmentIndex = 0;

  for (let i = 1; i < points.length; i++) {
    const d = haversineKm(points[i - 1], points[i]);
    accumulated += d;
    if (accumulated >= splitIntervalKm) {
      const endTs = new Date(points[i].timestamp).getTime();
      const duration = (endTs - segmentStartTs) / 1000;
      const segDist = splitIntervalKm;
      splits.push({
        distance: +segDist.toFixed(3),
        duration: Math.round(duration),
        pace: Math.round(duration / segDist),
        segment_index: segmentIndex,
      });
      segmentIndex++;
      accumulated -= splitIntervalKm;
      segmentStartTs = endTs;
    }
  }
  return splits;
}

// Build a friendly date/time header from a CardioLog record
export function sessionDateTime(log) {
  if (!log) return "";
  try {
    const d = log.started_at ? new Date(log.started_at) : new Date(log.date);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return log.date || "";
  }
}