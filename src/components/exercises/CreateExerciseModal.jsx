import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ChevronDown } from "lucide-react";
import { getAllSubSections } from "@/components/utils/muscleHierarchy";
import { getPatternsForMuscle, getMuscleDisplayLabel } from "@/components/utils/movementPatterns";
import MuscleMultiSelect from "./MuscleMultiSelect";
import InfoButton from "@/components/info/InfoButton";

const CATEGORIES = ["barbell", "dumbbell", "machine", "smith_machine", "cable", "bodyweight", "other"];

export default function CreateExerciseModal({ open, onClose, lockedMovementPattern, allowedMuscles, defaultMuscle }) {
  const isPatternLocked = !!lockedMovementPattern;
  const [name, setName] = useState("");
  const [primaryMuscle, setPrimaryMuscle] = useState(defaultMuscle || "");
  const [secondaryMuscles, setSecondaryMuscles] = useState([]);
  const [category, setCategory] = useState("");
  const [movementType, setMovementType] = useState("");
  const [movementPattern, setMovementPattern] = useState(lockedMovementPattern || "");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  if (!open) return null;

  const allMuscles = getAllSubSections();
  const muscleOptions = allowedMuscles && allowedMuscles.length > 0
    ? allMuscles.filter((m) => allowedMuscles.includes(m))
    : allMuscles;
  const patterns = getPatternsForMuscle(primaryMuscle);

  const handleSave = async () => {
    if (!name.trim() || !primaryMuscle) return;
    setSaving(true);
    await base44.entities.Exercise.create({
      name: name.trim(),
      primary_muscle: primaryMuscle,
      secondary_muscles: secondaryMuscles,
      category: category || "other",
      movement_type: movementType || undefined,
      movement_pattern: isPatternLocked ? lockedMovementPattern : (movementPattern || undefined),
    });
    queryClient.invalidateQueries({ queryKey: ["exercises"] });
    setSaving(false);
    setName("");
    setPrimaryMuscle(defaultMuscle || "");
    setSecondaryMuscles([]);
    setCategory("");
    setMovementType("");
    setMovementPattern(lockedMovementPattern || "");
    onClose();
  };

  const canSave = name.trim() && primaryMuscle;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-end justify-center p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-2xl border border-border p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between sticky top-0 bg-card z-10 pb-1">
          <h2 className="text-lg font-bold">New Exercise</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Exercise Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Exercise Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Incline Dumbbell Press"
              className="bg-secondary border-0"
            />
          </div>

          {/* Primary Muscle — single dropdown */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Primary Muscle *</label>
            <div className="relative">
              <select
                value={primaryMuscle}
                onChange={(e) => {
                  setPrimaryMuscle(e.target.value);
                  if (!isPatternLocked) setMovementPattern("");
                  setSecondaryMuscles((prev) => prev.filter((m) => m !== e.target.value));
                }}
                className="w-full bg-secondary border-0 rounded-lg px-3 py-2.5 text-sm font-medium appearance-none pr-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select primary muscle…</option>
                {muscleOptions.map((m) => (
                  <option key={m} value={m}>{getMuscleDisplayLabel(m)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Equipment — single dropdown */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Equipment *</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-secondary border-0 rounded-lg px-3 py-2.5 text-sm font-medium capitalize appearance-none pr-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select equipment…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace("_", " ")}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Movement Pattern — dependent on primary muscle (locked when creating from a variation) */}
          {isPatternLocked ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Movement Pattern</label>
              <div className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm font-medium flex items-center justify-between">
                <span>{lockedMovementPattern}</span>
                <span className="text-[10px] text-primary font-semibold uppercase tracking-wide">Locked</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Movement Pattern</label>
              <div className="relative">
                <select
                  value={movementPattern}
                  disabled={!primaryMuscle}
                  onChange={(e) => setMovementPattern(e.target.value)}
                  className={`w-full bg-secondary border-0 rounded-lg px-3 py-2.5 text-sm font-medium appearance-none pr-9 focus:outline-none focus:ring-1 focus:ring-primary ${!primaryMuscle ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <option value="">{primaryMuscle ? "None" : "Select primary muscle first…"}</option>
                  {patterns.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          {/* Movement Type (compound/isolation — rest timing) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Movement Type</label>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-2">
                {["compound", "isolation"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setMovementType((prev) => (prev === type ? "" : type))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                      movementType === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <InfoButton
                title="Movement Type"
                body="Compound = multi-joint. Isolation = single-joint. Used for rest timer defaults."
              />
            </div>
          </div>

          {/* Secondary Muscles — dropdown multi-select */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Secondary Muscles <span className="opacity-60">(optional)</span>
            </label>
            <MuscleMultiSelect value={secondaryMuscles} onChange={setSecondaryMuscles} exclude={primaryMuscle} />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full h-11 rounded-xl font-semibold"
        >
          {saving ? "Creating..." : "Create Exercise"}
        </Button>
      </div>
    </div>
  );
}