import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, CheckCircle2, Crown, RefreshCw } from "lucide-react";
import MuscleGroupIcon from "@/components/utils/MuscleGroupIcon";
import ExerciseFilters from "@/components/exercises/ExerciseFilters";
import { useExercises, useWorkoutLogs } from "@/components/hooks/useWorkoutData";
import { MUSCLE_HIERARCHY } from "@/components/utils/muscleHierarchy";

const EQUIPMENT_ABBREVIATIONS = {
  barbell: "BB", dumbbell: "DB", machine: "MC", smith_machine: "SM",
  cable: "CA", bodyweight: "BW", band: "BD", other: "--",
};

/**
 * Build the replacement exercise object from the old exercise slot and the
 * newly selected Exercise entity. Preserves set structure (type, reps, RIR,
 * rest settings, superset group, order); resets weight to 0 and completed to
 * false; replaces exercise identity metadata.
 */
export function buildReplacementExercise(oldExercise, newEx) {
  return {
    exercise_id: newEx.id,
    exercise_name: newEx.name,
    muscle_group: newEx.primary_muscle,
    movement_type: newEx.movement_type || null,
    color: null,
    notes: null,
    superset_group: oldExercise.superset_group ?? null,
    order: oldExercise.order,
    sets: (oldExercise.sets || []).map(set => ({
      ...set,
      weight: 0,
      completed: false,
    })),
  };
}

/**
 * Single-selection exercise picker for replacing an exercise in a workout.
 * When an exercise is selected, all others dim to 40% opacity and become
 * non-interactive. A "Replace" button at the bottom is disabled until a
 * selection is made.
 */
export default function ReplaceExerciseSheet({ open, onClose, onReplace, excludeExerciseId }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ muscleGroups: [], equipment: [], sort: "name", subMuscle: null, ranked: false, favouritesOnly: false });

  const { data: exercises = [], isLoading } = useExercises();
  const { data: workoutLogs = [] } = useWorkoutLogs();

  // Reset state each time the sheet opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelected(null);
      setFilters({ muscleGroups: [], equipment: [], sort: "name", subMuscle: null, ranked: false, favouritesOnly: false });
    }
  }, [open]);

  const freqMap = {};
  workoutLogs.forEach(log => {
    log.exercises?.forEach(ex => {
      if (ex.exercise_id) freqMap[ex.exercise_id] = (freqMap[ex.exercise_id] || 0) + 1;
    });
  });

  const handleSelect = (ex) => {
    setSelected(prev => prev?.id === ex.id ? null : ex);
  };

  const handleConfirm = () => {
    if (!selected) return;
    onReplace(selected);
    onClose();
  };

  let filtered = exercises.filter(ex => {
    if (excludeExerciseId && ex.id === excludeExerciseId) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.ranked && !ex.is_rankable) return false;
    if (filters.favouritesOnly && !ex.is_favourite) return false;
    if (filters.subMuscle) {
      if ((ex.primary_muscle?.toLowerCase().trim() || "") !== filters.subMuscle.toLowerCase().trim()) return false;
    } else if (filters.muscleGroups.length > 0) {
      const children = [];
      filters.muscleGroups.forEach(g => children.push(...(MUSCLE_HIERARCHY[g] || [])));
      if (!children.some(c => c.toLowerCase().trim() === (ex.primary_muscle?.toLowerCase().trim() || ""))) return false;
    }
    if (filters.equipment.length > 0) {
      if (!filters.equipment.includes(ex.category?.toLowerCase().replace(" ", "_"))) return false;
    }
    return true;
  });

  if (filters.sort === "frequency") {
    filtered = [...filtered].sort((a, b) => (freqMap[b.id] || 0) - (freqMap[a.id] || 0));
  }

  const useGroups = !filters.sort || filters.sort === "name";
  const grouped = {};
  filtered.forEach(ex => {
    const key = useGroups ? (ex.name[0]?.toUpperCase() || "#") : "Results";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ex);
  });
  const sortedKeys = useGroups ? Object.keys(grouped).sort() : ["Results"];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Header */}
      <div className="bg-background/95 backdrop-blur-lg border-b border-border px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 shrink-0">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-base font-bold flex-1">Replace Exercise</h1>
        </div>
      </div>

      {/* Exercise list — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-28">
        {/* Search */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-0 rounded-xl h-10" />
          </div>
        </div>

        {filters.subMuscle && (
          <div className="flex items-center gap-2 py-1 mb-1">
            <span className="text-xs bg-primary/15 text-primary rounded-full px-3 py-1 font-semibold flex items-center gap-1.5">
              {filters.subMuscle}
              <button onClick={() => setFilters(f => ({ ...f, subMuscle: null }))} className="ml-1 text-primary/70 hover:text-primary font-bold">×</button>
            </span>
          </div>
        )}

        <ExerciseFilters filters={filters} onFiltersChange={f => setFilters(prev => ({ ...f, subMuscle: prev.subMuscle }))} />

        {isLoading ? (
          <div className="space-y-2 mt-2">
            {Array(8).fill(0).map((_, i) => <div key={i} className="h-14 bg-secondary/50 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="mt-1">
            {sortedKeys.map(key => (
              <div key={key}>
                {useGroups && (
                  <div className="py-1.5">
                    <span className="text-xs font-bold text-primary">{key}</span>
                  </div>
                )}
                {grouped[key]?.map(ex => {
                  const primaryMuscle = ex.primary_muscle?.replace(/_/g, " ") || "Unknown";
                  const equipmentAbbr = EQUIPMENT_ABBREVIATIONS[ex.category?.toLowerCase()] || "--";
                  const isSelected = selected?.id === ex.id;
                  const isDimmed = selected && !isSelected;

                  return (
                    <div
                      key={ex.id}
                      onClick={() => !isDimmed && handleSelect(ex)}
                      className={`w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl transition-all text-left ${
                        isSelected ? "bg-primary/10" : isDimmed ? "opacity-40 pointer-events-none" : "hover:bg-secondary/50"
                      } ${isDimmed ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? "bg-primary/20" : "bg-secondary"
                      }`}>
                        {isSelected
                          ? <CheckCircle2 className="w-4 h-4 text-primary" />
                          : <MuscleGroupIcon muscle={ex.primary_muscle} size={26} className="text-muted-foreground" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : ""}`}>{ex.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {primaryMuscle}
                          {freqMap[ex.id] ? ` · ${freqMap[ex.id]}×` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        {ex.is_rankable && (
                          <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" fill="#FFD700" strokeWidth={1.5} />
                        )}
                        <span className="text-xs font-semibold px-2 py-1 rounded-md bg-primary text-primary-foreground">
                          {equipmentAbbr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No exercises found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Replace button — always visible, disabled until selection */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full h-12 rounded-xl font-bold text-base gap-2"
            disabled={!selected}
            onClick={handleConfirm}
          >
            <RefreshCw className="w-4 h-4" />
            Replace
          </Button>
        </div>
      </div>
    </div>
  );
}