import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, ChevronDown } from "lucide-react";
import InfoButton from "@/components/info/InfoButton";
import {
  MOVEMENT_PATTERNS_BY_CATEGORY,
  ALL_MOVEMENT_PATTERNS,
  PATTERN_MUSCLES,
  getMuscleDisplayLabel,
  buildVariationName,
} from "@/components/utils/movementPatterns";

const DEFAULT_SETS = [
  { type: "warmup", weight: 0, reps: 10, rir: 4 },
  { type: "working", weight: 0, reps: 8, rir: 2 },
];

export default function AddVariationSheet({ open, onClose, onAdd }) {
  const [primaryMuscle, setPrimaryMuscle] = useState("");
  const [movementPattern, setMovementPattern] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch the distinct movement_pattern values that actually exist on Exercise
  // records for the selected primary muscle — so the dropdown only offers
  // patterns that will return results in the variation picker. Falls back to
  // the full master vocabulary if the muscle has no exercises yet.
  const { data: musclePatterns = [] } = useQuery({
    queryKey: ["muscleMovementPatterns", primaryMuscle],
    queryFn: async () => {
      if (!primaryMuscle) return [];
      const exercises = await base44.entities.Exercise.filter(
        { primary_muscle: primaryMuscle },
        null,
        500
      );
      const patterns = [
        ...new Set((exercises || []).map((e) => e.movement_pattern).filter(Boolean)),
      ];
      return patterns;
    },
    enabled: !!primaryMuscle,
    staleTime: 60000,
  });

  if (!open) return null;

  const availablePatterns =
    musclePatterns.length > 0 ? musclePatterns : ALL_MOVEMENT_PATTERNS;
  const canAdd = !!primaryMuscle && !!movementPattern;

  const handleAdd = async () => {
    if (!canAdd) return;
    setSaving(true);
    // The display name is cosmetic; movement_pattern is the functional field and
    // must use the exercise vocabulary so the picker can match it exactly.
    const name = buildVariationName(primaryMuscle, movementPattern);
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

  // Group available patterns by the master category order. Patterns not in the
  // master list (shouldn't happen, but be safe) land in an "Other" group.
  const knownSet = new Set(ALL_MOVEMENT_PATTERNS);
  const extras = availablePatterns.filter((p) => !knownSet.has(p));

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
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-start">
          <InfoButton
            label="What are Variations?"
            title="What are Variations?"
            body={[
              "Variations are flexible slots in your workout template. Instead of locking in a specific exercise, a variation slot lets you pick a muscle group and movement pattern — and Olympus will suggest exercises that match.",
              "For example, a 'Horizontal Push' variation might suggest Barbell Bench Press, Dumbbell Bench Press, or Machine Chest Press. You pick the one that feels right on the day.",
              "This keeps your workouts fresh while staying structured. You always hit the movement pattern you planned, but you can swap in different exercises based on equipment availability, energy, or preference.",
              "When you reach a variation slot during a workout, tap it to see matching exercises and choose one to log.",
            ]}
            className="text-primary"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Primary Muscle *
            </label>
            <div className="relative">
              <select
                value={primaryMuscle}
                onChange={(e) => {
                  setPrimaryMuscle(e.target.value);
                  setMovementPattern("");
                }}
                className="w-full bg-secondary border-0 rounded-lg px-3 py-2.5 text-sm font-medium appearance-none pr-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select primary muscle…</option>
                {PATTERN_MUSCLES.map((m) => (
                  <option key={m} value={m}>
                    {getMuscleDisplayLabel(m)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Movement Pattern *
            </label>
            <div className="relative">
              <select
                value={movementPattern}
                disabled={!primaryMuscle}
                onChange={(e) => setMovementPattern(e.target.value)}
                className={`w-full bg-secondary border-0 rounded-lg px-3 py-2.5 text-sm font-medium appearance-none pr-9 focus:outline-none focus:ring-1 focus:ring-primary ${
                  !primaryMuscle ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <option value="">
                  {primaryMuscle
                    ? "Select movement pattern…"
                    : "Select primary muscle first…"}
                </option>
                {Object.entries(MOVEMENT_PATTERNS_BY_CATEGORY).map(([cat, patterns]) => {
                  const avail = patterns.filter((p) => availablePatterns.includes(p));
                  if (avail.length === 0) return null;
                  return (
                    <optgroup key={cat} label={cat}>
                      {avail.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
                {extras.length > 0 && (
                  <optgroup label="Other">
                    {extras.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {canAdd && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground">Will be added as:</p>
              <p className="text-sm font-semibold text-primary">
                {buildVariationName(primaryMuscle, movementPattern)}
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={handleAdd}
          disabled={!canAdd || saving}
          className="w-full h-11 rounded-xl font-semibold"
        >
          {saving ? "Adding..." : "Add Variation"}
        </Button>
      </div>
    </div>
  );
}