import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Flame, MapPin } from "lucide-react";
import { haptic } from "@/components/utils/haptics";
import {
  formatDuration,
  computeCalories,
  haversineKm,
  computeSplits,
  formatPace,
} from "./cardioUtils";
import { getMet, getActivityIcon, getActivityColor } from "./cardioConfig";
import { useDistanceUnit } from "@/components/utils/useDistanceUnit";
import RouteMapView from "./RouteMapView";

const MIN_POINT_INTERVAL_MS = 2000; // throttle: one point per ~2s
const MIN_POINT_DISTANCE_M = 5; // ...or 5m moved

export default function MobileSessionScreen({ activity, userWeightKg, onEnd, onCancel }) {
  const Icon = getActivityIcon(activity);
  const color = getActivityColor(activity);
  const met = getMet(activity);
  const weight = userWeightKg || 75;
  const { isMetric, label, toDisplay } = useDistanceUnit();

  const [gpsStatus, setGpsStatus] = useState("requesting"); // requesting | active | denied | unavailable
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [routePoints, setRoutePoints] = useState([]);
  const [pausedDuration, setPausedDuration] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);

  const timerRef = useRef(null);
  const watchRef = useRef(null);
  const lastPointRef = useRef(null);
  const lastPointTimeRef = useRef(0);
  const pauseStartRef = useRef(null);
  const wakeLockRef = useRef(null);
  const startedAtRef = useRef(new Date().toISOString());
  const distanceRef = useRef(0);
  const routeRef = useRef([]);

  const tick = useCallback(() => setElapsed((e) => e + 1), []);

  // Request wake lock
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* silently ignore */
    }
  };
  const releaseWakeLock = async () => {
    try {
      await wakeLockRef.current?.release();
      wakeLockRef.current = null;
    } catch {
      /* ignore */
    }
  };

  // Start the wall-clock timer
  useEffect(() => {
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [tick]);

  // Start GPS
  const startGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      return;
    }
    setGpsStatus("requesting");
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus("active");
        const now = Date.now();
        const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const last = lastPointRef.current;
        const moved = last ? haversineKm(last, coord) * 1000 : Infinity;
        const timeOk = now - lastPointTimeRef.current >= MIN_POINT_INTERVAL_MS;
        const distOk = moved >= MIN_POINT_DISTANCE_M;
        if (last && (!timeOk || !distOk)) return; // throttle

        const point = { ...coord, timestamp: new Date(now).toISOString() };
        lastPointRef.current = coord;
        lastPointTimeRef.current = now;

        if (last) {
          const d = haversineKm(last, coord);
          distanceRef.current = +(distanceRef.current + d).toFixed(4);
          setDistanceKm(distanceRef.current);
        }
        routeRef.current = [...routeRef.current, point];
        setRoutePoints(routeRef.current);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsStatus("denied");
        else setGpsStatus("unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  };

  useEffect(() => {
    requestWakeLock();
    startGPS();
    return () => {
      clearInterval(timerRef.current);
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      releaseWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-acquire wake lock if page becomes visible again (wake locks auto-release on hide)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && running) requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [running]);

  const handlePauseResume = () => {
    if (running) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      pauseStartRef.current = Date.now();
      haptic.medium();
      setRunning(false);
    } else {
      if (pauseStartRef.current) {
        setPausedDuration((p) => p + (Date.now() - pauseStartRef.current) / 1000);
        pauseStartRef.current = null;
      }
      setPauseCount((c) => c + 1);
      // reset last point so the gap creates a jump (no phantom distance across pause)
      lastPointRef.current = null;
      lastPointTimeRef.current = Date.now();
      timerRef.current = setInterval(tick, 1000);
      startGPS();
      haptic.medium();
      setRunning(true);
    }
  };

  const movingTime = Math.max(0, elapsed - Math.round(pausedDuration));
  const liveCalories = computeCalories(met, weight, movingTime);
  const avgPaceSecKm = distanceKm > 0 ? movingTime / distanceKm : 0;
  // current pace from last two points
  const currentPaceSecKm = (() => {
    if (routePoints.length < 2) return 0;
    const a = routePoints[routePoints.length - 2];
    const b = routePoints[routePoints.length - 1];
    const d = haversineKm(a, b);
    if (d < 0.001) return 0;
    const t = (new Date(b.timestamp) - new Date(a.timestamp)) / 1000;
    return t / d;
  })();

  const handleEnd = () => {
    haptic.strong();
    clearInterval(timerRef.current);
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    if (pauseStartRef.current) {
      setPausedDuration((p) => p + (Date.now() - pauseStartRef.current) / 1000);
    }
    releaseWakeLock();
    const finalMovingTime = Math.max(0, elapsed - Math.round(pausedDuration));
    const splitInterval = isMetric ? 1.0 : 1.609344;
    const splits = computeSplits(routeRef.current, splitInterval);
    onEnd({
      mode: "mobile",
      activity,
      durationSeconds: elapsed,
      movingTime: finalMovingTime,
      distanceKm: +distanceRef.current.toFixed(4),
      calories: computeCalories(met, weight, finalMovingTime),
      routePoints: routeRef.current,
      splits,
      pauseCount,
      avgPaceSecKm,
      startedAt: startedAtRef.current,
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Map background */}
      <div className="absolute inset-0">
        <RouteMapView points={routePoints} follow={running} interactive={false} color={color} />
      </div>

      {/* Dim overlay when paused */}
      {!running && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}

      {/* GPS status banner */}
      {(gpsStatus === "requesting" || gpsStatus === "denied" || gpsStatus === "unavailable") && (
        <div className="absolute top-0 left-0 right-0 pt-[calc(env(safe-area-inset-top)+0.75rem)] px-4 z-[500]">
          <div className="bg-card/90 backdrop-blur-md rounded-2xl border border-border p-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 flex-shrink-0" style={{ color }} />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {gpsStatus === "requesting" && "Acquiring GPS signal…"}
                {gpsStatus === "denied" && "Location permission denied"}
                {gpsStatus === "unavailable" && "GPS unavailable on this device"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {gpsStatus === "requesting"
                  ? "Make sure you're outdoors or near a window."
                  : "Distance won't be tracked. You can still record time and calories."}
              </p>
            </div>
            {(gpsStatus === "denied" || gpsStatus === "unavailable") && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setGpsStatus("requesting");
                  startGPS();
                }}
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Top header */}
      <div className="absolute top-0 left-0 right-0 pt-[calc(env(safe-area-inset-top)+0.75rem)] px-4 z-[400]">
        <div className="flex items-center gap-3 bg-card/80 backdrop-blur-md rounded-2xl border border-border p-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}1F` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium leading-none">
              Mobile
            </p>
            <h2 className="text-base font-bold leading-tight truncate">{activity}</h2>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${running ? "bg-green-500/15" : "bg-muted"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${running && gpsStatus === "active" ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
            <span className={`text-[11px] font-semibold ${running && gpsStatus === "active" ? "text-green-500" : "text-muted-foreground"}`}>
              {running && gpsStatus === "active" ? "GPS" : "Paused"}
            </span>
          </div>
        </div>
      </div>

      {/* Floating stats card */}
      <div className="absolute left-3 right-3 top-[calc(env(safe-area-inset-top)+5.5rem)] z-[400]">
        <div className="bg-card/75 backdrop-blur-md rounded-2xl border border-border/70 p-3.5 grid grid-cols-3 gap-1">
          <StatCell label="Time" value={formatDuration(elapsed)} />
          <StatCell label="Distance" value={`${toDisplay(distanceKm).toFixed(2)} ${label}`} color={color} />
          <StatCell label="Calories" value={`${liveCalories}`} unit="kcal" color="#FF5722" />
          <StatCell label="Pace" value={currentPaceSecKm ? formatPace(currentPaceSecKm, isMetric) : "--"} unit={`/${label}`} color={color} />
          <StatCell label="Avg Pace" value={avgPaceSecKm ? formatPace(avgPaceSecKm, isMetric) : "--"} unit={`/${label}`} color={color} />
          <StatCell label="Moving" value={formatDuration(movingTime)} />
        </div>
      </div>

      {/* Controls bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 pb-[calc(env(safe-area-inset-bottom)+1rem)] px-4 z-[400]">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-14 rounded-2xl text-base font-bold gap-2 bg-card/80 backdrop-blur-md"
            onClick={handlePauseResume}
          >
            {running ? (
              <>
                <Pause className="w-5 h-5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5" /> Resume
              </>
            )}
          </Button>
          <Button
            className="flex-1 h-14 rounded-2xl text-base font-bold gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={handleEnd}
          >
            <Square className="w-4 h-4" /> End
          </Button>
        </div>
        <Button variant="ghost" className="w-full text-muted-foreground text-xs mt-2" onClick={onCancel}>
          Cancel session
        </Button>
      </div>
    </div>
  );
}

function StatCell({ label, value, unit, color }) {
  return (
    <div className="text-center">
      <p className="text-base font-bold tabular-nums leading-none" style={color ? { color } : undefined}>
        {value}
        {unit && <span className="text-[10px] text-muted-foreground font-normal ml-0.5">{unit}</span>}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}