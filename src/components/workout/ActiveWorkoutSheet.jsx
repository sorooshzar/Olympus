import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Plus, Check, Timer, ChevronUp } from "lucide-react";
import { useRestTimer } from "./RestTimerContext";
import ExerciseList from "./ExerciseList";
import { useActiveWorkout, getRestDurationForSet } from "@/components/workout/ActiveWorkoutContext";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { EXERCISE_SELECTOR_KEY } from "@/pages/ExerciseSelector";
import confetti from "canvas-confetti";
import { haptic } from "@/components/utils/haptics";

function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, onConfirm, onCancel, confirmDestructive }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl">
        <h2 className="text-base font-bold mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground mb-5">{description}</p>
        <div className="flex flex-col gap-2">
          <Button onClick={onConfirm} className={confirmDestructive ? "bg-destructive hover:bg-destructive/90" : ""}>{confirmLabel}</Button>
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export default function ActiveWorkoutSheet() {
  const { workout, setWorkout, updateWorkout, addExercisesToWorkout, minimized, minimize, expand, endWorkout } = useActiveWorkout();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const dragStartY = useRef(null);
  const { start: startRestTimer, skip: skipRestTimer } = useRestTimer();
  const sheetRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const miniBarDragStart = useRef(null);
  const notesInitializedFor = useRef(null);

  // Load recent workout logs for previous-set data
  const { data: workoutLogs = [] } = useQuery({
    queryKey: ["workoutLogs"],
    queryFn: async () => {
      const u = await base44.auth.me();
      return base44.entities.WorkoutLog.filter({ created_by: u.email }, "-created_date", 100);
    },
    enabled: !!workout,
  });

  // Load exercises to get saved notes + movement_type
  const { data: allExercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => base44.entities.Exercise.list(),
    enabled: !!workout,
  });

  // Build map: exercise_id -> last completed sets (from most recent log first)
  const prevSetsMap = {};
  workoutLogs.forEach(log => {
    log.exercises?.forEach(ex => {
      if (ex.exercise_id && !prevSetsMap[ex.exercise_id]) {
        prevSetsMap[ex.exercise_id] = ex.sets || [];
      }
    });
  });

  // Patch saved notes + movement_type from Exercise entity into workout exercises — runs once per workout session
  useEffect(() => {
    if (!workout || !allExercises.length) return;
    const workoutKey = workout.startTime;
    if (notesInitializedFor.current === workoutKey) return;
    notesInitializedFor.current = workoutKey;

    const exerciseMap = {};
    allExercises.forEach(ex => { exerciseMap[ex.id] = ex; });

    updateWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => ({
        ...ex,
        notes: ex.notes || exerciseMap[ex.exercise_id]?.notes || null,
        // Enrich with movement_type from Exercise entity if not already present
        movement_type: ex.movement_type || exerciseMap[ex.exercise_id]?.movement_type || null,
      })),
    }));
  }, [allExercises, workout?.startTime, updateWorkout]);

  const handleSetCompleted = (set, exercise) => {
    // Use locked duration if manually set, otherwise always read live from settings
    const duration = set.rest_duration_locked
      ? (set.rest_duration || getRestDurationForSet(set.type, exercise?.movement_type))
      : getRestDurationForSet(set.type, exercise?.movement_type);
    startRestTimer(duration);
  };

  // Elapsed timer — always cleared on unmount or startTime change
  useEffect(() => {
    if (!workout?.startTime) {
      clearInterval(timerRef.current);
      return;
    }
    const startTime = new Date(workout.startTime).getTime();
    // Immediate update so counter doesn't start at 0
    setElapsed(Math.floor((Date.now() - startTime) / 1000));
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [workout?.startTime]);

  // Read back exercises chosen in ExerciseSelector page
  useEffect(() => {
    const raw = localStorage.getItem(EXERCISE_SELECTOR_KEY);
    if (raw) {
      localStorage.removeItem(EXERCISE_SELECTOR_KEY);
      try {
        const parsed = JSON.parse(raw);
        // New format: { exercises, asSuperset }; legacy format: array
        const list = Array.isArray(parsed) ? parsed : (parsed.exercises || []);
        const asSuperset = !Array.isArray(parsed) && parsed.asSuperset;
        if (list.length > 0) {
          addExercisesToWorkout(list, asSuperset);
        }
      } catch {}
    }
    // After returning from the ExerciseSelector (add or cancel), scroll to the
    // bottom so the user lands on the exercise they just added.
    if (sessionStorage.getItem("exerciseSelector_returnScroll") === "1") {
      sessionStorage.removeItem("exerciseSelector_returnScroll");
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "smooth" });
      }, 350);
    }
  }, [location.pathname, addExercisesToWorkout]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleExercisesChange = useCallback((newExercises) => {
    updateWorkout(prev => ({ ...prev, exercises: newExercises }));
  }, [updateWorkout]);

  const doFinish = async () => {
    // Stop any running rest timer the moment the workout ends (countdown + sound).
    skipRestTimer();

    const finished = new Date();
    const startTime = new Date(workout.startTime);
    const duration = Math.floor((finished - startTime) / 60000);

    // Set weights are already stored in kg (SetTable converts the entered
    // display value via toKg), so this sum is already in kg. Do NOT divide by
    // 2.20462 again — that double-converted and halved total_volume for lbs
    // users, making the stored volume disagree with the sets array.
    let totalVolume = 0;
    let totalSets = 0;
    workout.exercises.forEach(ex => {
      ex.sets?.forEach(s => {
        if (s.completed) {
          totalVolume += (s.weight || 0) * (s.reps || 0);
          if (s.type !== "warmup") totalSets++;
        }
      });
    });

    const logData = {
      name: workout.name,
      template_id: workout.template_id || null,
      started_at: startTime.toISOString(),
      finished_at: finished.toISOString(),
      duration_minutes: duration,
      exercises: workout.exercises,
      total_volume: Math.round(totalVolume),
      total_sets: totalSets,
    };

    const createdLog = await base44.entities.WorkoutLog.create(logData);
    queryClient.invalidateQueries({ queryKey: ["workoutLogs"] });

    endWorkout({ ...logData, id: createdLog.id });

    // Wait for React to flush the completedLog state before navigating
    await new Promise(r => setTimeout(r, 100));

    haptic.medium();
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, ticks: 120 });
    navigate("/WorkoutSummary");
  };

  const handleMinimize = () => {
    minimize();
    navigate("/Lifts");
  };

  const handleExpand = () => {
    expand();
    navigate("/ActiveWorkout");
  };

  // Touch/mouse drag handlers for the drag handle (minimize on swipe down)
  const handleDragHandleTouchStart = (e) => { dragStartY.current = e.touches[0].clientY; };
  const handleDragHandleTouchMove = (e) => {
    if (dragStartY.current === null) return;
    if (e.touches[0].clientY - dragStartY.current > 10) e.preventDefault();
  };
  const handleDragHandleTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientY - (dragStartY.current || 0);
    dragStartY.current = null;
    if (diff > 60) handleMinimize();
  };

  const handleDragHandleMouseDown = (e) => {
    dragStartY.current = e.clientY;
    const onMouseMove = (me) => {
      if (me.clientY - dragStartY.current > 60) {
        cleanup();
        handleMinimize();
      }
    };
    const onMouseUp = () => cleanup();
    const cleanup = () => {
      dragStartY.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Swipe up on minimized bar to expand
  const handleMiniBarTouchStart = (e) => { miniBarDragStart.current = e.touches[0].clientY; };
  const handleMiniBarTouchEnd = (e) => {
    const diff = miniBarDragStart.current - e.changedTouches[0].clientY;
    if (diff > 40) handleExpand();
  };

  if (!workout) return null;

  if (minimized) {
    return (
      <div
        className="fixed bottom-20 left-0 right-0 z-50 px-3"
        onTouchStart={handleMiniBarTouchStart}
        onTouchEnd={handleMiniBarTouchEnd}
      >
        <div className="flex justify-center mb-1.5">
          <div className="w-8 h-1 bg-muted-foreground/25 rounded-full" />
        </div>
        <button
          onClick={handleExpand}
          className="w-full bg-primary text-primary-foreground rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl active:scale-[0.98] transition-transform"
        >
          <div className="flex-1 text-left">
            <p className="text-sm font-bold truncate">{workout.name}</p>
            <p className="text-xs opacity-75">Tap or swipe up to resume</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-mono opacity-90">
            <Timer className="w-4 h-4" />
            <span>{formatTime(elapsed)}</span>
          </div>
          <ChevronUp className="w-4 h-4 opacity-70" />
        </button>
      </div>
    );
  }

  // Don't render the full sheet if not on the ActiveWorkout page
  if (!location.pathname.includes("ActiveWorkout")) return null;

  return (
    <>
      <div ref={sheetRef} className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Drag zone — handle + header combined */}
        <div
          className="cursor-grab active:cursor-grabbing select-none"
          onTouchStart={handleDragHandleTouchStart}
          onTouchMove={handleDragHandleTouchMove}
          onTouchEnd={handleDragHandleTouchEnd}
          onMouseDown={handleDragHandleMouseDown}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          <div className="bg-background/95 backdrop-blur-lg border-b border-border px-4 py-3">
            <div className="max-w-lg mx-auto relative flex items-center justify-center">
              <button
                onClick={(e) => { e.stopPropagation(); setShowCancelConfirm(true); }}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute left-0 p-1"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="text-center pointer-events-none">
                <p className="text-sm font-bold">{workout.name}</p>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Timer className="w-3 h-3" />
                  <span className="font-mono">{formatTime(elapsed)}</span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); setShowFinishConfirm(true); }}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute right-0 h-8 px-3 rounded-lg text-xs font-semibold"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Finish
              </Button>
            </div>
          </div>
        </div>

        {/* Exercises — scrollable with DnD reorder */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pt-4 pb-8">
          <div className="max-w-lg mx-auto px-4">
            <ExerciseList
              exercises={workout.exercises}
              onChange={handleExercisesChange}
              isActive={true}
              prevSetsMap={prevSetsMap}
              droppableId="active-exercises"
              onSetCompleted={handleSetCompleted}
            />

            <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-dashed text-muted-foreground mt-3"
              onClick={() => navigate(`/ExerciseSelector?returnTo=${encodeURIComponent(location.pathname)}`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Exercise
            </Button>
          </div>
        </div>


      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        title="Close Workout?"
        description="This will discard your unsaved sets. Are you sure you want to close the workout?"
        confirmLabel="Close Workout"
        cancelLabel="Cancel"
        confirmDestructive
        onConfirm={() => { setShowCancelConfirm(false); skipRestTimer(); endWorkout(); navigate("/Lifts"); }}
        onCancel={() => setShowCancelConfirm(false)}
      />

      <ConfirmDialog
        open={showFinishConfirm}
        title="Complete Workout?"
        description="Are you sure you want to complete this workout and log your sets?"
        confirmLabel="Yes — Log Sets"
        cancelLabel="Return to Workout"
        onConfirm={() => { setShowFinishConfirm(false); doFinish(); }}
        onCancel={() => setShowFinishConfirm(false)}
      />
    </>
  );
}