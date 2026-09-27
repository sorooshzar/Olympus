import React from "react";
import { formatPace } from "./cardioUtils";

// Color-codes splits: faster than average = green, slower = red.
export default function SplitsList({ splits = [], avgPaceSecKm = 0, isMetric = true }) {
  if (!splits.length) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        No splits recorded for this session.
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {splits.map((s, i) => {
        const faster = avgPaceSecKm > 0 && s.pace < avgPaceSecKm;
        const slower = avgPaceSecKm > 0 && s.pace > avgPaceSecKm;
        const color = faster ? "text-green-500" : slower ? "text-red-400" : "text-foreground";
        return (
          <div
            key={i}
            className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold">
                {i + 1}
              </div>
              <span className="text-sm font-medium">
                Split {i + 1}
              </span>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold tabular-nums ${color}`}>
                {formatPace(s.pace, isMetric)}
                <span className="text-[10px] text-muted-foreground font-normal ml-0.5">
                  /{isMetric ? "km" : "mi"}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {Math.floor(s.duration / 60)}:{String(s.duration % 60).padStart(2, "0")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}