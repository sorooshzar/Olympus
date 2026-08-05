import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Search, Library, Star, CheckCircle2, Link2 } from "lucide-react";
import MuscleGroupIcon from "@/components/utils/MuscleGroupIcon";
import { motion, AnimatePresence } from "framer-motion";
import ExerciseFilters from "@/components/exercises/ExerciseFilters";
import CreateExerciseModal from "@/components/exercises/CreateExerciseModal";
import ExerciseDetailModal from "@/components/exercises/ExerciseDetailModal";
import { useExercises, useWorkoutLogs } from "@/components/hooks/useWorkoutData";
import { MUSCLE_HIERARCHY } from "@/components/utils/muscleHierarchy";

const EQUIPMENT_ABBREVIATIONS = {
  barbell: "BB", dumbbell: "DB", machine: "MC", smith_machine: "SM",
  cable: "CA", bodyweight: "BW", band: "BD", other: "--",
};

const STORAGE_KEY = "exerciseSelector_result";

export default function ExerciseSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const params = new URLSearchParams(location.search);
  const returnTo = params.get("returnTo") || "/";
  // When returning to a workout view, signal it to scroll to the bottom so the
  // user lands on the exercise they just added (or where they left off on cancel).
  const returnIsWorkoutView = /EditWorkout|ActiveWorkout/.test(returnTo);
  const flagReturnScroll = () => {
    if (returnIsWorkoutView) sessionStorage.setItem("exerciseSelector_returnScroll", "1");
  };

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]); // array of exercise objects in selection order
  const [filters, setFilters] = useState({ muscleGroups: [], equipment: [], sort: "name", subMuscle: null });
  const [showCreate, setShowCreate] = useState(false);
  const [detailExercise, setDetailExercise] = useState(null);

  const { data: exercises = [], isLoading } = useExercises();
  const { data: workoutLogs = [] } = useWorkoutLogs();

  const freqMap = {};
  workoutLogs.forEach(log => {
    log.exercises?.forEach(ex => {
      if (ex.exercise_id) freqMap[ex.exercise_id] = (freqMap[ex.exercise_id] || 0) + 1;
    });
  });

  const toggleFavourite = (e, ex) => {
    e.stopPropagation();
    queryClient.setQueryData(["exercises"], (old) =>
      old ? old.map(x => x.id === ex.id ? { ...x, is_favourite: !x.is_favourite } : x) : old
    );
    base44.entities.Exercise.update(ex.id, { is_favourite: !ex.is_favourite });
  };

  const toggleSelect = (ex) => {
    setSelected(prev =>
      prev.find(s => s.id === ex.id)
        ? prev.filter(s => s.id !== ex.id)
        : [...prev, ex]
    );
  };

  let filtered = exercises.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.sort === "favourites" && !ex.is_favourite) return false;
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

  const useGroups = !filters.sort || filters.sort === "name" || filters.sort === "favourites";
  const grouped = {};
  filtered.forEach(ex => {
    const key = useGroups ? (ex.name[0]?.toUpperCase() || "#") : "Results";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ex);
  });
  const sortedKeys = useGroups ? Object.keys(grouped).sort() : ["Results"];

  const handleConfirm = (asSuperset = false) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ exercises: selected, asSuperset }));
    flagReturnScroll();
    navigate(returnTo);
  };

  const handleCancel = () => {
    localStorage.removeItem(STORAGE_KEY);
    flagReturnScroll();
    navigate(returnTo);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="bg-background/95 backdrop-blur-lg border-b border-border px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={handleCancel} className="p-1 shrink-0">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-base font-bold flex-1">
            Add Exercises{selected.length > 0 ? ` · ${selected.length} selected` : ""}
          </h1>
          <Button
            size="sm"
            onClick={() => handleConfirm(false)}
            disabled={selected.length === 0}
            className="h-8 px-3 rounded-lg text-xs font-semibold shrink-0"
          >
            Add {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </div>
      </div>

      {/* Exercise list — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-28">
        {/* Search + New */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-0 rounded-xl h-10" />
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1 h-10 px-3 rounded-xl text-xs shrink-0">
            <Plus className="w-3.5 h-3.5" /> New
          </Button>
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
                  const isSelected = selected.some(s => s.id === ex.id);

                  return (
                    <div
                      key={ex.id}
                      onClick={() => toggleSelect(ex)}
                      onContextMenu={(e) => { e.preventDefault(); setDetailExercise(ex); }}
                      className={`w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl transition-colors text-left cursor-pointer ${
                        isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-secondary/50"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? "bg-primary/20" : "bg-secondary"
                      }`}>
                        {isSelected
                          ? <CheckCircle2 className="w-4 h-4 text-primary" />
                          : <MuscleGroupIcon muscle={ex.primary_muscle} size={16} className="text-muted-foreground" />
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
                        <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"
                        }`}>
                          {equipmentAbbr}
                        </span>
                        <button
                          onClick={(e) => toggleFavourite(e, ex)}
                          className="p-1 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
                        >
                          <Star className={`w-4 h-4 ${ex.is_favourite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Library className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No exercises found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating confirm button(s) */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border"
          >
            <div className="max-w-lg mx-auto flex flex-col gap-2">
              {selected.length >= 2 && (
                <Button
                  className="w-full h-12 rounded-xl font-bold text-base gap-2"
                  style={{ background: "#8b5cf6" }}
                  onClick={() => handleConfirm(true)}
                >
                  <Link2 className="w-4 h-4" />
                  Create Superset ({selected.length})
                </Button>
              )}
              <Button
                variant={selected.length >= 2 ? "outline" : "default"}
                className="w-full h-12 rounded-xl font-bold text-base"
                onClick={() => handleConfirm(false)}
              >
                Add {selected.length} Exercise{selected.length > 1 ? "s" : ""} to Workout
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateExerciseModal open={showCreate} onClose={() => setShowCreate(false)} />
      <ExerciseDetailModal
        exercise={detailExercise}
        isOpen={!!detailExercise}
        onClose={() => setDetailExercise(null)}
        workoutLogs={workoutLogs}
      />
    </div>
  );
}

export { STORAGE_KEY as EXERCISE_SELECTOR_KEY };