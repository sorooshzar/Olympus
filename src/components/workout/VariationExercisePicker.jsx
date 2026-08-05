import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X, Search, Library, Star, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExercises } from "@/components/hooks/useWorkoutData";
import { getMuscleDisplayLabel } from "@/components/utils/movementPatterns";
import { getMainGroupsForSubsection } from "@/components/utils/muscleHierarchy";
import CreateExerciseModal from "@/components/exercises/CreateExerciseModal";

// Two primary_muscle values are in the same family if they are equal or share a
// parent muscle group (e.g. "Mid/Low Chest" and "Upper Chest" → both "Chest").
function sameMuscleFamily(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const ga = getMainGroupsForSubsection(a);
  const gb = getMainGroupsForSubsection(b);
  return ga.some((g) => gb.includes(g));
}

export default function VariationExercisePicker({ primaryMuscle, movementPattern, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { data: exercises = [], isLoading } = useExercises();
  const queryClient = useQueryClient();

  // Muscles valid for this movement pattern = primary_muscles already used by
  // exercises sharing this pattern, plus the variation's own target muscle.
  const allowedMuscles = useMemo(() => {
    const fromExercises = exercises
      .filter((ex) => (ex.movement_pattern || "") === movementPattern)
      .map((ex) => ex.primary_muscle)
      .filter(Boolean);
    const set = new Set(fromExercises);
    if (primaryMuscle) set.add(primaryMuscle);
    return Array.from(set);
  }, [exercises, movementPattern, primaryMuscle]);

  const toggleFavourite = (e, ex) => {
    e.stopPropagation();
    queryClient.setQueryData(["exercises"], (old) =>
      old ? old.map((x) => (x.id === ex.id ? { ...x, is_favourite: !x.is_favourite } : x)) : old
    );
    base44.entities.Exercise.update(ex.id, { is_favourite: !ex.is_favourite });
  };

  // PRIMARY match: exact movement_pattern equality (string === string). Muscle
  // group is a sort priority only — never a hard filter — so the user always
  // sees every exercise sharing the movement pattern, muscle-family matches
  // ranked first, then alphabetical by name.
  const filtered = exercises
    .filter((ex) => (ex.movement_pattern || "") === movementPattern)
    .filter((ex) => !search || (ex.name || "").toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => {
      const aFam = sameMuscleFamily(a.primary_muscle, primaryMuscle) ? 0 : 1;
      const bFam = sameMuscleFamily(b.primary_muscle, primaryMuscle) ? 0 : 1;
      if (aFam !== bFam) return aFam - bFam;
      return (a.name || "").localeCompare(b.name || "");
    });

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      <div className="bg-background/95 backdrop-blur-lg border-b border-border px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 shrink-0">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">Choose Exercise</h1>
            <p className="text-xs text-muted-foreground truncate">
              {getMuscleDisplayLabel(primaryMuscle)} · {movementPattern}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1 h-8 px-3 rounded-lg text-xs shrink-0">
            <Plus className="w-3.5 h-3.5" /> New
          </Button>
        </div>
      </div>

      <div className="px-4 py-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0 rounded-xl h-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-14 bg-secondary/50 rounded-xl animate-pulse" />
            <div className="h-14 bg-secondary/50 rounded-xl animate-pulse" />
            <div className="h-14 bg-secondary/50 rounded-xl animate-pulse" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Library className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No exercises found for this variation yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Tag your exercises with movement patterns to see them here.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((ex) => (
              <div
                key={ex.id}
                onClick={() => onSelect(ex)}
                className="w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-secondary/50 text-left transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground uppercase">
                  {(ex.category || "--").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ex.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {ex.primary_muscle}{ex.movement_pattern ? ` · ${ex.movement_pattern}` : ""}
                  </p>
                </div>
                <button
                  onClick={(e) => toggleFavourite(e, ex)}
                  className="p-1 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
                >
                  <Star className={`w-4 h-4 ${ex.is_favourite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateExerciseModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        lockedMovementPattern={movementPattern}
        allowedMuscles={allowedMuscles}
        defaultMuscle={primaryMuscle}
      />
    </div>
  );
}