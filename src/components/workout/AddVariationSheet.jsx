import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, ChevronDown } from "lucide-react";
import { PATTERN_MUSCLES, getPatternsForMuscle, getMuscleDisplayLabel, buildVariationName } from "@/components/utils/movementPatterns";

const DEFAULT_SETS = [
  { type: "warmup", weight: 0, reps: 10, rir: 4 },
  { type: "working", weight: 0, reps: 8, rir: 2 },
];

export default function AddVariationSheet({ open, onClose, onAdd }) {
  const [primaryMuscle, setPrimaryMuscle] = useState("");
  const [movementPattern, setMovementPattern] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const patterns = getPatternsForMuscle(primaryMuscle);
  const canAdd = !!primaryMuscle && !!movementPattern;

  const handleAdd = async () => {
    if (!canAdd) return;
    setSaving(true);
    const name = buildVariationName(primaryMuscle, movementPattern);
    // Persist a library record of this variation
    try {
      await base44.entities.Variation.create({
        primary_muscle: primaryMuscle,
        movement_pattern: movementPattern,
        name,
      });
    } catch {}
    setSaving(false);
    onAdd({
      type: "variation",
      primary_muscle: primaryMuscle,
      movement_pattern: movementPattern,
      exercise_name: name,
      color: null,
      superset_group: null,
      sets: DEFAULT_SETS.map((s) => ({ ...s })),
    });
    setPrimaryMuscle("");
    setMovementPattern("");
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-2xl border border-border p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Add Variation</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Primary Muscle *</label>
            <div className="relative">
              <select
                value={primaryMuscle}
                onChange={(e) => { setPrimaryMuscle(e.target.value); setMovementPattern(""); }}
                className="w-full bg-secondary border-0 rounded-lg px-3 py-2.5 text-sm font-medium appearance-none pr-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select primary muscle…</option>
                {PATTERN_MUSCLES.map((m) => (
                  <option key={m} value={m}>{getMuscleDisplayLabel(m)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Movement Pattern *</label>
            <div className="relative">
              <select
                value={movementPattern}
                disabled={!primaryMuscle}
                onChange={(e) => setMovementPattern(e.target.value)}
                className={`w-full bg-secondary border-0 rounded-lg px-3 py-2.5 text-sm font-medium appearance-none pr-9 focus:outline-none focus:ring-1 focus:ring-primary ${!primaryMuscle ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <option value="">{primaryMuscle ? "Select movement pattern…" : "Select primary muscle first…"}</option>
                {patterns.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {canAdd && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground">Will be added as:</p>
              <p className="text-sm font-semibold text-primary">{buildVariationName(primaryMuscle, movementPattern)}</p>
            </div>
          )}
        </div>

        <Button onClick={handleAdd} disabled={!canAdd || saving} className="w-full h-11 rounded-xl font-semibold">
          {saving ? "Adding..." : "Add Variation"}
        </Button>
      </div>
    </div>
  );
}