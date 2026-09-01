import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Save, Plus, Link2, Layers } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import ExerciseList from "../components/workout/ExerciseList";
import AddVariationSheet from "../components/workout/AddVariationSheet";
import { EXERCISE_SELECTOR_KEY } from "./ExerciseSelector";
import { createPageUrl } from "@/utils";
import { createSuperset } from "../components/workout/supersetUtils";
import ReplaceExerciseSheet, { buildReplacementExercise } from "../components/workout/ReplaceExerciseSheet";

export default function EditWorkout() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [showAddVariation, setShowAddVariation] = useState(false);
  // Multi-select superset mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const isDirty = useRef(false);
  const [replaceIndex, setReplaceIndex] = useState(null);
  const draftKey = `edit-draft-${id}`;

  const { data: template } = useQuery({
    queryKey: ["template-edit", id],
    queryFn: () => base44.entities.WorkoutTemplate.list(),
    enabled: !!id,
    select: (data) => data.find((t) => t.id === id),
  });

  useEffect(() => {
    if (template) {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const { name: draftName, exercises: draftExercises } = JSON.parse(draft);
          setName(draftName);
          setExercises(draftExercises);
          isDirty.current = true;
        } catch {
          setName(template.name);
          setExercises(template.exercises || []);
          isDirty.current = false;
        }
      } else {
        setName(template.name);
        setExercises(template.exercises || []);
        isDirty.current = false;
      }
    }
  }, [template, draftKey]);

  // Auto-save draft
  useEffect(() => {
    if (isDirty.current && (name || exercises.length > 0)) {
      localStorage.setItem(draftKey, JSON.stringify({ name, exercises }));
    }
  }, [name, exercises, draftKey]);

  const handleAddExercises = (toAdd) => {
    setExercises(prev => [...prev, ...toAdd.map((ex, i) => ({
      exercise_id: ex.id,
      exercise_name: ex.name,
      muscle_group: ex.primary_muscle,
      movement_type: ex.movement_type || null,
      color: null,
      superset_group: null,
      order: prev.length + i,
      sets: [
        { type: "warmup", weight: 0, reps: 10, rir: 4 },
        { type: "working", weight: 0, reps: 8, rir: 2 },
      ],
    }))]);
    isDirty.current = true;
  };

  useEffect(() => {
    const raw = localStorage.getItem(EXERCISE_SELECTOR_KEY);
    if (!raw) return;
    localStorage.removeItem(EXERCISE_SELECTOR_KEY);
    try {
      const parsed = JSON.parse(raw);
      // New format: { exercises, asSuperset }; legacy format: array
      const list = Array.isArray(parsed) ? parsed : (parsed.exercises || []);
      const asSuperset = !Array.isArray(parsed) && parsed.asSuperset;
      if (list.length > 0) {
        setExercises(prev => {
          const newItems = list.map((ex, i) => ({
            exercise_id: ex.id,
            exercise_name: ex.name,
            muscle_group: ex.primary_muscle,
            movement_type: ex.movement_type || null,
            color: null,
            superset_group: null,
            order: prev.length + i,
            sets: [
              { type: "warmup", weight: 0, reps: 10, rir: 4 },
              { type: "working", weight: 0, reps: 8, rir: 2 },
            ],
          }));
          const combined = [...prev, ...newItems];
          if (asSuperset && list.length >= 2) {
            const indices = Array.from({ length: list.length }, (_, i) => prev.length + i);
            return createSuperset(combined, indices);
          }
          return combined;
        });
        isDirty.current = true;
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After returning from the ExerciseSelector, scroll to the bottom so the user
  // sees the exercise they just added (works for both add and cancel).
  useEffect(() => {
    if (sessionStorage.getItem("exerciseSelector_returnScroll") === "1") {
      sessionStorage.removeItem("exerciseSelector_returnScroll");
      setTimeout(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      }, 350);
    }
  }, []);

  const handleExercisesChange = (newExercises) => {
    isDirty.current = true;
    setExercises(newExercises);
  };

  const handleReplaceExercise = (index) => setReplaceIndex(index);

  const handleConfirmReplace = (newEx) => {
    if (replaceIndex === null) return;
    setExercises(prev => {
      const next = [...prev];
      next[replaceIndex] = buildReplacementExercise(next[replaceIndex], newEx);
      return next;
    });
    isDirty.current = true;
    setReplaceIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.WorkoutTemplate.update(id, { name, exercises });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
    localStorage.removeItem(draftKey);
    isDirty.current = false;
    setSaving(false);
    navigate(createPageUrl("Lifts"));
  };

  const handleClose = () => {
    if (isDirty.current) setShowUnsavedConfirm(true);
    else navigate(createPageUrl("Lifts"));
  };

  const handleDiscard = () => {
    localStorage.removeItem(draftKey);
    setShowUnsavedConfirm(false);
    navigate(createPageUrl("Lifts"));
  };

  // Multi-select superset creation
  const toggleSelectMode = () => {
    setSelectMode(v => !v);
    setSelectedIndices(new Set());
  };

  const toggleSelect = (i) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleCreateSuperset = () => {
    const updated = createSuperset(exercises, Array.from(selectedIndices));
    isDirty.current = true;
    setExercises(updated);
    setSelectMode(false);
    setSelectedIndices(new Set());
  };

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-2">
          <button onClick={handleClose} className="p-1 shrink-0">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <input
            value={name}
            onChange={(e) => { isDirty.current = true; setName(e.target.value); }}
            className="bg-transparent text-center text-sm font-bold focus:outline-none flex-1 min-w-0"
            placeholder="Workout Name"
          />
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-5 rounded-xl text-sm font-semibold shrink-0"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Multi-select mode bar */}
      {selectMode && (
        <div className="sticky top-[61px] z-10 bg-violet-950/90 backdrop-blur-lg border-b border-violet-800/40 px-4 py-2.5 flex items-center gap-3">
          <p className="flex-1 text-sm font-semibold text-violet-200">
            {selectedIndices.size} selected
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="text-violet-300 h-8"
            onClick={toggleSelectMode}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={selectedIndices.size < 2}
            className="h-8 px-3 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
            onClick={handleCreateSuperset}
          >
            <Link2 className="w-3.5 h-3.5" />
            Create Superset
          </Button>
        </div>
      )}

      {/* Exercise list */}
      <div className="px-4 pt-4">
        {selectMode ? (
          // Multi-select mode: flat list with checkboxes
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <button
                key={i}
                onClick={() => toggleSelect(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  selectedIndices.has(i)
                    ? "bg-violet-500/15 border-violet-500/50"
                    : "bg-card border-border"
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  selectedIndices.has(i) ? "bg-violet-500 border-violet-500" : "border-border"
                }`}>
                  {selectedIndices.has(i) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-semibold truncate">{ex.exercise_name}</span>
              </button>
            ))}
          </div>
        ) : (
          <ExerciseList
            exercises={exercises}
            onChange={handleExercisesChange}
            isActive={false}
            droppableId="edit-exercises"
            onReplaceExercise={handleReplaceExercise}
          />
        )}

        {/* Action buttons */}
        <div className={`flex flex-col gap-2 mt-3 ${selectMode ? "hidden" : ""}`}>
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-dashed text-primary border-primary/40 hover:bg-primary/5"
            onClick={() => setShowAddVariation(true)}
          >
            <Layers className="w-4 h-4 mr-2" />
            Add Variation
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl border-dashed text-muted-foreground"
              onClick={() => navigate(createPageUrl("ExerciseSelector") + `?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Exercise
            </Button>
            {exercises.length >= 2 && (
              <Button
                variant="outline"
                className="h-12 px-4 rounded-xl border-dashed text-violet-400 border-violet-400/40 hover:bg-violet-500/10"
                onClick={toggleSelectMode}
              >
                <Link2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <AddVariationSheet
        open={showAddVariation}
        onClose={() => setShowAddVariation(false)}
        onAdd={(variation) => {
          setExercises((prev) => [...prev, { ...variation, order: prev.length }]);
          isDirty.current = true;
          setShowAddVariation(false);
        }}
      />

      <ReplaceExerciseSheet
        open={replaceIndex !== null}
        onClose={() => setReplaceIndex(null)}
        onReplace={handleConfirmReplace}
        excludeExerciseId={replaceIndex !== null ? exercises[replaceIndex]?.exercise_id : undefined}
      />

      {showUnsavedConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowUnsavedConfirm(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl">
            <h2 className="text-base font-bold mb-1">Unsaved Changes</h2>
            <p className="text-sm text-muted-foreground mb-5">You have unsaved changes. Are you sure you want to leave without saving?</p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save & Exit"}</Button>
              <Button variant="destructive" onClick={handleDiscard}>Discard Changes</Button>
              <Button variant="ghost" onClick={() => setShowUnsavedConfirm(false)}>Keep Editing</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}