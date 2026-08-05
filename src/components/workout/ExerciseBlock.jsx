import React, { useState, useRef } from "react";
import { MoreVertical, Trash2, GripVertical, StickyNote, RefreshCw, Timer, Link2, Unlink, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVariations, resolveVariationSlot } from "./useVariations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SetTable from "./SetTable";
import VariationExercisePicker from "./VariationExercisePicker";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getMainGroups, getMainGroupsForSubsection } from "@/components/utils/muscleHierarchy";


const EXERCISE_COLORS = [
  null, "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4",
];

// Subtle accent colors per muscle category (Olympus dark-theme palette)
const MUSCLE_CATEGORY_STYLES = {
  Chest: "bg-rose-500/15 text-rose-300",
  Back: "bg-blue-500/15 text-blue-300",
  Legs: "bg-emerald-500/15 text-emerald-300",
  Shoulders: "bg-amber-500/15 text-amber-300",
  Arms: "bg-violet-500/15 text-violet-300",
  Core: "bg-cyan-500/15 text-cyan-300",
  Forearms: "bg-slate-500/15 text-slate-300",
  Neck: "bg-zinc-500/15 text-zinc-300",
};

const getMuscleCategory = (muscle) => {
  if (!muscle) return null;
  const mainGroups = getMainGroups();
  if (mainGroups.includes(muscle)) return muscle;
  return getMainGroupsForSubsection(muscle)[0] || null;
};

export default function ExerciseBlock({
  exercise,
  index,
  onChange,
  onRemove,
  onReplace,
  isActive = false,
  previousSets = [],
  dragHandleProps,
  // Superset actions
  onMakeSuperset,
  onLeaveSuperset,
  accentColor,
  onSetCompleted,
}) {
  const [showNotes, setShowNotes] = useState(!!exercise.notes);
  const [showRestEditor, setShowRestEditor] = useState(false);
  const [showVariationPicker, setShowVariationPicker] = useState(false);
  const navigate = useNavigate();
  const notesDebounceRef = useRef(null);

  // Live-reference: resolve the current movement_pattern/primary_muscle from the
  // Variation record (by variation_id) instead of trusting the slot's snapshot.
  const { data: variations = [] } = useVariations();
  const { movementPattern: livePattern, primaryMuscle: liveMuscle } = resolveVariationSlot(exercise, variations);

  const isVariation = exercise.type === "variation";
  const isUnfilledVariation = isVariation && !exercise.exercise_id;

  const updateSets = (newSets) => onChange({ ...exercise, sets: newSets });

  const updateNotes = (notes) => {
    onChange({ ...exercise, notes });
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    if (exercise.exercise_id) {
      notesDebounceRef.current = setTimeout(() => {
        base44.entities.Exercise.update(exercise.exercise_id, { notes }).catch(() => {});
      }, 800);
    }
  };

  const handleVariationSelect = (selected) => {
    onChange({
      ...exercise,
      exercise_id: selected.id,
      exercise_name: selected.name,
      muscle_group: selected.primary_muscle,
      movement_type: selected.movement_type || null,
      color: exercise.color, // inherit the variation's color onto the resolved exercise
    });
    setShowVariationPicker(false);
  };

  const borderColor = accentColor || exercise.color || "transparent";
  const isInSuperset = !!exercise.superset_group;

  return (
    <div
      className={`bg-card rounded-xl overflow-hidden transition-shadow ${
        isUnfilledVariation ? "border-2 border-dashed border-primary/40" : "border border-border"
      }`}
      style={
        isUnfilledVariation && exercise.color
          ? { borderLeftWidth: "3px", borderLeftStyle: "solid", borderLeftColor: exercise.color }
          : isUnfilledVariation
            ? undefined
            : { borderLeftWidth: "3px", borderLeftColor: borderColor }
      }
    >
      {/* Exercise Header */}
      <div className="flex items-center px-3 py-3 gap-2">
        <div {...(dragHandleProps || {})} className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="w-4 h-4 text-muted-foreground/40" />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {isUnfilledVariation ? (
            <div className="min-w-0 flex flex-col gap-1 w-full">
              <span className={`self-start inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                MUSCLE_CATEGORY_STYLES[getMuscleCategory(liveMuscle)] || "bg-secondary text-muted-foreground"
              }`}>
                {liveMuscle}
              </span>
              <button
                type="button"
                onClick={() => setShowVariationPicker(true)}
                className="flex items-center gap-1.5 min-w-0 text-left group/variation-title active:opacity-60"
                title="Tap to see matching exercises"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-sm font-semibold truncate group-hover/variation-title:text-primary transition-colors">{livePattern} Variation</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 group-hover/variation-title:text-primary transition-colors" />
              </button>
            </div>
          ) : (
            <button
              className="text-sm font-semibold truncate text-left w-full hover:text-primary transition-colors"
              onClick={() => exercise.exercise_id && navigate(createPageUrl(`ExerciseDetail?id=${exercise.exercise_id}`))}
            >
              {exercise.exercise_name}
            </button>
          )}
        </div>

        {/* Notes toggle */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            exercise.notes ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <StickyNote className="w-3.5 h-3.5" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-2">
            {/* Color picker */}
            <div className="mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-0.5">Color</p>
              <div className="grid grid-cols-4 gap-1.5">
                {EXERCISE_COLORS.map((c, i) => (
                  <button key={i} onClick={() => onChange({ ...exercise, color: c })}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${exercise.color === c ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c || "hsl(var(--secondary))" }} />
                ))}
              </div>
            </div>
            <div className="border-t border-border mb-1" />

            {/* Superset actions */}
            {!isInSuperset && onMakeSuperset && (
              <DropdownMenuItem onClick={onMakeSuperset}>
                <Link2 className="w-3.5 h-3.5 mr-2 text-violet-400" /> Make Superset
              </DropdownMenuItem>
            )}
            {isInSuperset && onLeaveSuperset && (
              <DropdownMenuItem onClick={onLeaveSuperset} className="text-muted-foreground">
                <Unlink className="w-3.5 h-3.5 mr-2" /> Remove from Superset
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => setShowRestEditor(v => !v)}>
              <Timer className="w-3.5 h-3.5 mr-2 text-primary" /> Update Rest Timer
            </DropdownMenuItem>
            {onReplace && (
              <DropdownMenuItem onClick={onReplace}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Replace Exercise
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} className="text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Notes section */}
      {showNotes && (
        <div className="px-3 pb-2">
          <textarea
            className="w-full text-xs bg-secondary rounded-lg p-2.5 border-0 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary overflow-hidden"
            rows={1}
            placeholder="Technique cues, reminders..."
            value={exercise.notes || ""}
            onChange={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
              updateNotes(e.target.value);
            }}
            onFocus={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            style={{ minHeight: "32px" }}
          />
        </div>
      )}

      {/* Sets / Variation body */}
      <div className="px-2 pb-3">
        {isUnfilledVariation && isActive ? (
          <button
            onClick={() => setShowVariationPicker(true)}
            className="w-full h-12 rounded-xl border-2 border-dashed border-primary/40 text-primary text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Choose Exercise
          </button>
        ) : (
          <SetTable
            sets={exercise.sets || []}
            onChange={updateSets}
            isActive={isActive}
            previousSets={previousSets}
            onSetCompleted={onSetCompleted}
            showRestEditor={showRestEditor}
            onCollapseRest={() => setShowRestEditor(false)}
            movementType={exercise.movement_type}
          />
        )}
      </div>

      {showVariationPicker && (
        <VariationExercisePicker
          primaryMuscle={liveMuscle}
          movementPattern={livePattern}
          onSelect={handleVariationSelect}
          onClose={() => setShowVariationPicker(false)}
          isActive={isActive}
        />
      )}
    </div>
  );
}