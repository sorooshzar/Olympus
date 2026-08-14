import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, BookOpen, BarChart3, Archive, ArchiveRestore } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { useWeightUnit } from "@/components/utils/useWeightUnit";
import ExerciseMuscleVisualization from "@/components/exercises/ExerciseMuscleVisualization";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export default function ExerciseDetailModal({ exercise, isOpen, onClose, workoutLogs = [], onArchive, onUnarchive }) {
  const [tab, setTab] = useState("learn");
  const [graphMode, setGraphMode] = useState("e1rm");
  const { unit: weightUnit, toDisplay } = useWeightUnit();

  const calculateSessionPeak1RM = (sets) => {
    let peak1rm = 0;
    sets?.forEach((s) => {
      if (s.completed && s.weight && s.reps) {
        const epley = s.weight * (1 + s.reps / 30);
        const brzycki = s.reps < 37 ? s.weight * 36 / (37 - s.reps) : s.weight;
        const avg1rm = (epley + brzycki) / 2;
        if (avg1rm > peak1rm) peak1rm = avg1rm;
      }
    });
    return peak1rm;
  };

  const allChartData = [];
  if (exercise) {
    workoutLogs.forEach((log) => {
      log.exercises?.forEach((ex) => {
        if (ex.exercise_id === exercise.id) {
          let volumeKg = 0, maxReps = 0, maxWeightKg = 0;
          const peak1rmKg = calculateSessionPeak1RM(ex.sets);
          
          ex.sets?.forEach((s) => {
            if (s.completed) {
              volumeKg += (s.weight || 0) * (s.reps || 0);
              if ((s.reps || 0) > maxReps) maxReps = s.reps || 0;
              if ((s.weight || 0) > maxWeightKg) maxWeightKg = s.weight || 0;
            }
          });
          
          if (volumeKg > 0 || maxReps > 0 || peak1rmKg > 0) {
            allChartData.push({
              date: format(new Date(log.started_at || log.created_date), "MMM d"),
              volume: Math.round(toDisplay(volumeKg) || 0),
              reps: maxReps,
              maxWeight: Math.round(toDisplay(maxWeightKg) || 0),
              e1rm: Math.round(toDisplay(peak1rmKg) || 0),
            });
          }
        }
      });
    });
  }

  const graphMetrics = {
    e1rm: { key: "e1rm", label: `Est. 1RM (${weightUnit})`, color: "#8b5cf6" },
    volume: { key: "volume", label: `Volume (${weightUnit})`, color: "hsl(var(--primary))" },
    reps: { key: "reps", label: "Max Reps", color: "#22c55e" },
    maxWeight: { key: "maxWeight", label: `Max Weight (${weightUnit})`, color: "#f59e0b" },
  };

  if (!exercise) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold">{exercise.name}</DialogTitle>
              <p className="text-xs text-muted-foreground capitalize mt-1">
                {exercise.primary_muscle?.replace(/_/g, " ")} • {exercise.category}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={tab === "learn" ? "default" : "secondary"}
              size="sm"
              onClick={() => setTab("learn")}
              className="rounded-full gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Learn
            </Button>
            <Button
              variant={tab === "stats" ? "default" : "secondary"}
              size="sm"
              onClick={() => setTab("stats")}
              className="rounded-full gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Stats
            </Button>
            <Button
              variant={tab === "muscles" ? "default" : "secondary"}
              size="sm"
              onClick={() => setTab("muscles")}
              className="rounded-full gap-1.5"
            >
              Muscles
            </Button>
          </div>

          {/* Learn Tab */}
          {tab === "learn" && (
            <div className="bg-secondary rounded-xl p-4 space-y-4">
              {exercise.description && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">About</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {exercise.description}
                  </p>
                </div>
              )}
              {exercise.instructions && exercise.instructions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">How to Perform</h3>
                  <ul className="space-y-2">
                    {exercise.instructions.map((step, i) => (
                      <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {exercise.secondary_muscles?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Secondary Muscles</h3>
                  <div className="flex flex-wrap gap-2">
                    {exercise.secondary_muscles.map((m) => (
                      <span key={m} className="text-xs bg-card px-2.5 py-1 rounded-full capitalize">
                        {m.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!exercise.description && !exercise.instructions && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No instructions available yet.
                </p>
              )}
            </div>
          )}

          {/* Muscles Tab */}
          {tab === "muscles" && (
            <div className="bg-secondary rounded-xl p-4 space-y-4">
              <ExerciseMuscleVisualization exercise={exercise} />
            </div>
          )}

          {/* Stats Tab */}
          {tab === "stats" && (
            <div className="bg-secondary rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-4 gap-1">
                {Object.entries(graphMetrics).map(([k, m]) => (
                  <button
                    key={k}
                    onClick={() => setGraphMode(k)}
                    className={`px-1.5 py-1 rounded-full text-[11px] font-semibold transition-all border truncate ${
                      graphMode === k
                        ? "text-white border-transparent"
                        : "bg-card text-muted-foreground border-transparent"
                    }`}
                    style={graphMode === k ? { backgroundColor: m.color } : {}}
                  >
                    {k === "e1rm" ? "Est. 1RM" : k === "maxWeight" ? "Max Wt" : k === "reps" ? "Reps" : "Volume"}
                  </button>
                ))}
              </div>

              {allChartData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={allChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(v) => [`${v}`, graphMetrics[graphMode].label]}
                      />
                      <Line
                        type="monotone"
                        dataKey={graphMetrics[graphMode].key}
                        stroke={graphMetrics[graphMode].color}
                        strokeWidth={2}
                        dot={{ fill: graphMetrics[graphMode].color, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No workout data yet. Start training!
                </p>
              )}
            </div>
          )}

          {/* Archive / Unarchive — kept at the bottom, far from the close button */}
          {onArchive && (
            <div className="pt-4 mt-2 border-t border-border">
              {exercise.is_archived ? (
                <button
                  onClick={() => { onClose(); onUnarchive?.(exercise); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  <ArchiveRestore className="w-4 h-4" />
                  Unarchive Exercise
                </button>
              ) : (
                <button
                  onClick={() => { onClose(); onArchive(exercise); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  Archive Exercise
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}