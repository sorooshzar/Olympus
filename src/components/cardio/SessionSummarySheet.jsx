import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Flame, Clock, Activity, TrendingUp, Check } from "lucide-react";
import { formatDuration, formatTotalMins } from "./cardioUtils";
import { useDistanceUnit } from "@/components/utils/useDistanceUnit";

export default function SessionSummarySheet({ open, summary, onSave, onDiscard }) {
  const { isMetric, label, toDisplay } = useDistanceUnit();
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [distance, setDistance] = useState("");

  useEffect(() => {
    if (open && summary) {
      setCalories(summary.calories != null ? String(summary.calories) : "");
      setNotes(summary.notes || "");
      setDistance(
        summary.distanceKm != null
          ? String(toDisplay(summary.distanceKm).toFixed(2))
          : ""
      );
    }
  }, [open, summary]);

  if (!summary) return null;

  const handleSave = () => {
    onSave({
      ...summary,
      calories: calories !== "" ? Number(calories) : summary.calories,
      notes: notes.trim() || null,
      distanceKm:
        distance !== "" && Number(distance) > 0
          ? (isMetric ? Number(distance) : Number(distance) / 0.621371)
          : summary.distanceKm,
    });
  };

  const statTiles = [
    {
      label: "Duration",
      value: formatDuration(summary.durationSeconds),
      icon: Clock,
    },
    {
      label: "Calories",
      value: `${summary.calories ?? 0} kcal`,
      icon: Flame,
    },
  ];
  if (summary.distanceKm != null && summary.mode === "mobile") {
    statTiles.splice(1, 0, {
      label: "Distance",
      value: `${toDisplay(summary.distanceKm).toFixed(2)} ${label}`,
      icon: TrendingUp,
    });
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-border p-6 pb-8 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight">Session Complete</h3>
                <p className="text-xs text-muted-foreground">{summary.activity}</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {statTiles.map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.label} className="bg-secondary rounded-xl p-3.5">
                    <Icon className="w-4 h-4 text-primary mb-1.5" />
                    <p className="text-lg font-bold leading-none">{t.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{t.label}</p>
                  </div>
                );
              })}
            </div>

            {summary.mode === "mobile" && summary.movingTime != null && (
              <div className="bg-secondary/60 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Moving Time</span>
                <span className="text-sm font-semibold">
                  {formatDuration(summary.movingTime)}
                </span>
              </div>
            )}

            {/* Editable calories */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                Calories (kcal) — editable
              </label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder={String(summary.calories ?? 0)}
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="bg-secondary border-0 no-spinner"
              />
            </div>

            {/* Editable distance (mobile) */}
            {summary.mode === "mobile" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                  Distance ({label}) — editable
                </label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="bg-secondary border-0 no-spinner"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                Notes — optional
              </label>
              <Input
                placeholder="How did it feel?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-secondary border-0"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={onDiscard}>
                Discard
              </Button>
              <Button className="flex-1 gap-1.5" onClick={handleSave}>
                <Check className="w-4 h-4" /> Save
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}