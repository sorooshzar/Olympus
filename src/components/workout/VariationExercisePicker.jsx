import React, { useState } from "react";
import { X, Search, Library } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useExercises } from "@/components/hooks/useWorkoutData";
import { getMuscleDisplayLabel } from "@/components/utils/movementPatterns";

export default function VariationExercisePicker({ primaryMuscle, movementPattern, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const { data: exercises = [], isLoading } = useExercises();

  const filtered = exercises.filter((ex) => {
    if ((ex.primary_muscle || "") !== primaryMuscle) return false;
    if ((ex.movement_pattern || "") !== movementPattern) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
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
              <button
                key={ex.id}
                onClick={() => onSelect(ex)}
                className="w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-secondary/50 text-left transition-colors"
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
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}