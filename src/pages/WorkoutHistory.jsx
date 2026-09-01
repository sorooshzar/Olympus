import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, ChevronRight, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useWeightUnit } from "@/components/utils/useWeightUnit";
import { RANKS } from "@/components/utils/rankEngine";
import { useToast } from "@/components/ui/use-toast";
import { haptic } from "@/components/utils/haptics";
import PullToRefresh from "@/components/mobile/PullToRefresh";

function formatDuration(mins) {
  if (!mins) return "--";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function CalendarView({ logs, onSelectDay }) {
  const [month, setMonth] = useState(new Date());
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const firstDayOffset = getDay(startOfMonth(month));

  const logsByDay = {};
  logs.forEach((log) => {
    const d = new Date(log.started_at || log.created_date);
    const key = format(d, "yyyy-MM-dd");
    if (!logsByDay[key]) logsByDay[key] = [];
    logsByDay[key].push(log);
  });

  const totalThisMonth = Object.keys(logsByDay).filter(k => k.startsWith(format(month, "yyyy-MM"))).length;

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground font-bold text-base"
        >‹</button>
        <div className="text-center">
          <span className="text-sm font-bold">{format(month, "MMMM yyyy")}</span>
          {totalThisMonth > 0 && (
            <p className="text-[10px] text-primary font-medium mt-0.5">{totalThisMonth} workout{totalThisMonth !== 1 ? "s" : ""}</p>
          )}
        </div>
        <button
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground font-bold text-base"
        >›</button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1 mt-3">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array(firstDayOffset).fill(null).map((_, i) => <div key={`e-${i}`} />)}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayLogs = logsByDay[key] || [];
          const hasLog = dayLogs.length > 0;
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={key}
              onClick={() => hasLog && onSelectDay(day, dayLogs)}
              disabled={!hasLog}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold relative transition-all active:scale-90
                ${isToday && !hasLog ? "ring-1 ring-primary/60 text-primary" : ""}
                ${hasLog ? "bg-primary text-primary-foreground shadow-sm active:bg-primary/80" : "text-foreground/60"}
              `}
            >
              {format(day, "d")}
              {hasLog && dayLogs.length > 1 && (
                <span className="text-[8px] font-bold opacity-80 leading-none mt-0.5">{dayLogs.length}x</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WorkoutDetailModal({ log, onClose, onDelete, onEdit, onDeleteExercise }) {
  const { unit: weightUnit, toDisplay } = useWeightUnit();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteExerciseIdx, setDeleteExerciseIdx] = useState(null);

  if (!log) return null;

  const handleConfirmExerciseDelete = () => {
    const idx = deleteExerciseIdx;
    setDeleteExerciseIdx(null);
    if (idx == null) return;
    onDeleteExercise?.(log.id, idx);
  };

  return (
    <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 24 }}
    transition={{ type: "spring", stiffness: 350, damping: 30 }}
    className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      <div className="max-w-lg mx-auto px-4 pt-5 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{log.name}</h2>
            <p className="text-xs text-muted-foreground">
              {log.started_at ? format(new Date(log.started_at), "EEEE, MMM d yyyy · h:mm a") : ""}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Duration", value: formatDuration(log.duration_minutes) },
            { label: "Volume", value: log.total_volume ? `${toDisplay(log.total_volume)?.toLocaleString()} ${weightUnit}` : "--" },
            { label: "Sets", value: log.total_sets || "--" },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl border border-border p-3 text-center">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {log.exercises?.map((ex, i) => {
            const rankInfo = ex.rank ? RANKS.find(r => r.name === ex.rank) : null;
            return (
              <div key={i} className="bg-card rounded-xl border border-border p-4"
                style={ex.color ? { borderLeftWidth: "3px", borderLeftColor: ex.color } : {}}>
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{ex.exercise_name}</p>
                    {ex.muscle_group && (
                      <p className="text-xs text-muted-foreground">{ex.muscle_group}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteExerciseIdx(i)}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label={`Remove ${ex.exercise_name} from this workout`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {rankInfo && (
                    <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shadow-sm"
                        style={{ backgroundColor: rankInfo.color, color: rankInfo.textColor }}
                      >
                        {rankInfo.label[0]}
                      </div>
                      <span className="text-[9px] font-semibold" style={{ color: rankInfo.color }}>{rankInfo.label}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {ex.sets?.filter(s => s.completed).map((s, j) => {
                    const isEmpty = !s.weight && !s.reps;
                    return (
                      <div key={j} className="flex gap-4 text-xs text-muted-foreground">
                        <span className={`font-medium w-6 ${s.type === "dropset" ? "text-purple-400" : s.type === "failure" ? "text-destructive" : "text-foreground"}`}>{j + 1}</span>
                        {isEmpty ? (
                          <span className="text-muted-foreground/50 italic">Incomplete</span>
                        ) : (
                          <span className={s.type === "dropset" ? "text-purple-400" : ""}>{toDisplay(s.weight) || 0} {weightUnit} × {s.reps || 0}</span>
                        )}
                        {!isEmpty && s.rir != null && <span>RIR {s.rir}</span>}
                        {s.type === "failure" && <span className="text-destructive font-semibold">Failure</span>}
                        {s.type === "dropset" && <span className="text-purple-400 font-semibold">Drop</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 sm:items-center"
          onClick={() => setConfirmDelete(false)}>
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-base">Delete this workout?</h3>
              <p className="text-sm text-muted-foreground mt-1">"{log.name}" will be permanently removed from your history, along with any muscle rank credit it gave. This cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-semibold">Cancel</button>
              <button onClick={() => { setConfirmDelete(false); onDelete(log.id); }}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Per-exercise delete confirmation */}
      {deleteExerciseIdx != null && log.exercises?.[deleteExerciseIdx] && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 sm:items-center"
          onClick={() => setDeleteExerciseIdx(null)}>
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-base">Remove {log.exercises[deleteExerciseIdx].exercise_name}?</h3>
              <p className="text-sm text-muted-foreground mt-1">This will remove it from this workout and also remove any muscle rank credit it gave.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteExerciseIdx(null)}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-semibold">Cancel</button>
              <button onClick={handleConfirmExerciseDelete}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold">Remove</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function WorkoutHistory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { unit: weightUnit, toDisplay } = useWeightUnit();
  const [selectedLog, setSelectedLog] = useState(null);
  const [dayLogs, setDayLogs] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: logs = [] } = useQuery({
    queryKey: ["workoutLogs"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.WorkoutLog.filter({ created_by: user.email }, "-created_date", 200);
    },
  });

  const handleSelectDay = (day, dayLogsArr) => {
    if (dayLogsArr.length === 1) {
      setSelectedLog(dayLogsArr[0]);
    } else {
      setDayLogs({ day, logs: dayLogsArr });
    }
  };

  const handleDelete = (id) => {
    haptic.strong();
    // Optimistic delete: remove from the visible list instantly, then fire the
    // API call in the background. Roll back + toast on failure.
    const previousLogs = queryClient.getQueryData(["workoutLogs"]) || [];
    queryClient.setQueryData(["workoutLogs"], previousLogs.filter((l) => l.id !== id));
    setSelectedLog(null);
    setDeleteTarget(null);

    (async () => {
      try {
        await base44.entities.WorkoutLog.delete(id);
        try {
          await base44.functions.invoke("calculateRanks", { workoutLogId: id, rebuild: true });
        } catch (e) { console.error("rank cascade failed", e); }
      } catch (e) {
        console.error("delete failed", e);
        queryClient.setQueryData(["workoutLogs"], previousLogs);
        toast({
          title: "Delete failed",
          description: "The workout could not be deleted and has been restored.",
          variant: "destructive",
        });
      } finally {
        queryClient.invalidateQueries({ queryKey: ["workoutLogs"] });
        queryClient.invalidateQueries({ queryKey: ["userMuscleRanks"] });
      }
    })();
  };

  const handleDeleteExercise = async (logId, exerciseIndex) => {
    // Remove the exercise from the WorkoutLog, then rebuild this log's rank
    // events with fresh 0..n-1 indices (removes the deleted exercise's credit).
    const log = logs.find(l => l.id === logId) || selectedLog;
    if (!log) return;
    const updatedExercises = (log.exercises || []).map((ex, i) => i === exerciseIndex ? null : ex).filter(Boolean);
    // Recompute totals from the REMAINING exercises (mirrors ActiveWorkoutSheet):
    //   total_volume (kg) = sum(weight × reps) over completed sets
    //   total_sets = count of completed non-warmup sets
    // Set weights are stored in kg, so the sum is already in the storage unit.
    let totalVolume = 0;
    let totalSets = 0;
    updatedExercises.forEach(ex => {
      (ex.sets || []).forEach(s => {
        if (s.completed) {
          totalVolume += (s.weight || 0) * (s.reps || 0);
          if (s.type !== "warmup") totalSets++;
        }
      });
    });
    const total_volume = Math.round(totalVolume);
    try {
      await base44.entities.WorkoutLog.update(logId, {
        exercises: updatedExercises,
        total_volume,
        total_sets: totalSets,
      });
      await base44.functions.invoke("calculateRanks", { workoutLogId: logId, rebuild: true });
    } catch (e) { console.error("exercise delete failed", e); }
    queryClient.invalidateQueries({ queryKey: ["workoutLogs"] });
    queryClient.invalidateQueries({ queryKey: ["userMuscleRanks"] });
    // Reflect the change in the open modal immediately.
    setSelectedLog(prev => prev ? { ...prev, exercises: updatedExercises, total_volume, total_sets: totalSets } : prev);
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["workoutLogs"] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-lg mx-auto px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold flex-1">History</h1>
      </div>

      <CalendarView logs={logs} onSelectDay={handleSelectDay} />

      {dayLogs && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">{format(dayLogs.day, "EEEE, MMM d")}</p>
            <button onClick={() => setDayLogs(null)} className="text-xs text-muted-foreground">Close</button>
          </div>
          {dayLogs.logs.map((log) => (
            <button key={log.id} onClick={() => { setSelectedLog(log); setDayLogs(null); }}
              className="w-full flex items-center gap-3 py-2 text-left hover:bg-secondary/50 rounded-lg px-2 transition-colors">
              <Dumbbell className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium flex-1">{log.name}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-16">
          <Dumbbell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No workouts yet — tap + to start your first session</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id}
              className="w-full bg-card rounded-xl border border-border p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
              <button className="flex-1 min-w-0 text-left" onClick={() => setSelectedLog(log)}>
                <p className="text-sm font-semibold truncate">{log.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {log.started_at ? format(new Date(log.started_at), "EEE, MMM d") : ""}
                  {log.duration_minutes ? ` · ${formatDuration(log.duration_minutes)}` : ""}
                </p>
              </button>
              <button className="text-right flex-shrink-0" onClick={() => setSelectedLog(log)}>
                {log.total_volume > 0 && (
                  <p className="text-sm font-bold text-primary">{toDisplay(log.total_volume)?.toLocaleString()} {weightUnit}</p>
                )}
                <p className="text-[10px] text-muted-foreground">{log.total_sets || 0} sets</p>
              </button>
              <button onClick={() => setSelectedLog(log)} className="text-muted-foreground hover:text-foreground">
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeleteTarget(log); }}
                className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                aria-label="Delete workout">
                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedLog && (
          <WorkoutDetailModal
            log={selectedLog}
            onClose={() => setSelectedLog(null)}
            onDelete={handleDelete}
            onDeleteExercise={handleDeleteExercise}
          />
        )}
      </AnimatePresence>

      {/* List-row delete confirmation (does not enter the detail view) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 sm:items-center"
          onClick={() => setDeleteTarget(null)}>
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-base">Delete this workout?</h3>
              <p className="text-sm text-muted-foreground mt-1">"{deleteTarget.name}" will be permanently removed from your history, along with any muscle rank credit it gave. This cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-semibold">Cancel</button>
              <button onClick={() => { const id = deleteTarget.id; setDeleteTarget(null); handleDelete(id); }}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}