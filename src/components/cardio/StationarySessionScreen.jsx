import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, Square, Flame, Activity } from "lucide-react";
import { haptic } from "@/components/utils/haptics";
import { formatDuration, computeCalories } from "./cardioUtils";
import { getMet, getActivityIcon, DISTANCE_CAPABLE } from "./cardioConfig";
import { useDistanceUnit } from "@/components/utils/useDistanceUnit";

export default function StationarySessionScreen({ activity, userWeightKg, onEnd, onCancel }) {
  const Icon = getActivityIcon(activity);
  const met = getMet(activity);
  const weight = userWeightKg || 75;
  const { isMetric, label, toDisplay } = useDistanceUnit();
  const distanceCapable = DISTANCE_CAPABLE.includes(activity);

  const [running, setRunning] = useState(true); // start running immediately
  const [elapsed, setElapsed] = useState(0);
  const [distanceInput, setDistanceInput] = useState("");
  const [pausedDuration, setPausedDuration] = useState(0);
  const timerRef = useRef(null);
  const pauseStartRef = useRef(null);
  const startedAtRef = useRef(new Date().toISOString());

  const tick = useCallback(() => {
    setElapsed((e) => e + 1);
  }, []);

  // start timer on mount
  useEffect(() => {
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [tick]);

  const handlePauseResume = () => {
    if (running) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      pauseStartRef.current = Date.now();
      haptic.medium();
      setRunning(false);
    } else {
      if (pauseStartRef.current) {
        setPausedDuration((p) => p + (Date.now() - pauseStartRef.current) / 1000);
        pauseStartRef.current = null;
      }
      timerRef.current = setInterval(tick, 1000);
      haptic.medium();
      setRunning(true);
    }
  };

  const liveCalories = computeCalories(met, weight, elapsed);

  const handleEnd = () => {
    haptic.strong();
    clearInterval(timerRef.current);
    if (pauseStartRef.current) {
      setPausedDuration((p) => p + (Date.now() - pauseStartRef.current) / 1000);
    }
    const distanceKm =
      distanceCapable && distanceInput !== "" && Number(distanceInput) > 0
        ? isMetric
          ? Number(distanceInput)
          : Number(distanceInput) / 0.621371
        : null;
    onEnd({
      mode: "stationary",
      activity,
      durationSeconds: elapsed,
      movingTime: Math.max(0, elapsed - Math.round(pausedDuration)),
      distanceKm,
      calories: liveCalories,
      pauseCount: pausedDuration > 0 ? 1 : 0,
      startedAt: startedAtRef.current,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-2">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Stationary
          </p>
          <h2 className="text-lg font-bold leading-tight">{activity}</h2>
        </div>
        <div className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full ${running ? "bg-green-500/15" : "bg-muted"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${running ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
          <span className={`text-[11px] font-semibold ${running ? "text-green-500" : "text-muted-foreground"}`}>
            {running ? "Active" : "Paused"}
          </span>
        </div>
      </div>

      {/* Timer focal point */}
      <div className={`flex-1 flex flex-col items-center justify-center transition-opacity duration-300 ${running ? "opacity-100" : "opacity-50"}`}>
        <div className="text-[15vw] sm:text-7xl font-mono font-bold tabular-nums tracking-tight leading-none">
          {formatDuration(elapsed)}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {running ? "Session running" : "Paused"}
        </p>

        {/* Live calories */}
        <div className="flex items-center gap-2 mt-6 bg-secondary rounded-full px-4 py-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-bold tabular-nums">{liveCalories}</span>
          <span className="text-xs text-muted-foreground">kcal</span>
        </div>

        {/* Optional distance input */}
        {distanceCapable && (
          <div className="w-full max-w-xs px-6 mt-6">
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium text-center">
              Distance ({label}) — from machine
            </label>
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={distanceInput}
              onChange={(e) => setDistanceInput(e.target.value)}
              className="bg-secondary border-0 no-spinner text-center text-lg font-semibold"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-5 pb-8 space-y-3">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-14 rounded-2xl text-base font-bold gap-2"
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
        <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onCancel}>
          Cancel session
        </Button>
      </div>
    </div>
  );
}