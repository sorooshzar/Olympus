import React, { useEffect, useState, useRef } from "react";
import { CheckCircle2, Clock, Dumbbell, BarChart2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useActiveWorkout } from "../components/workout/ActiveWorkoutContext";
import { motion } from "framer-motion";
import { useWeightUnit } from "@/components/utils/useWeightUnit";
import { base44 } from "@/api/base44Client";
import { RANKS } from "@/components/utils/rankEngine";
import { calculateExerciseRank, indexStandards } from "@/components/utils/strengthStandards";
import { useRestTimer } from "../components/workout/RestTimerContext";

function formatDuration(minutes) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function WorkoutSummary() {
  const navigate = useNavigate();
  const { completedLog, clearCompletedLog } = useActiveWorkout();
  const { unit: weightUnit, toDisplay } = useWeightUnit();
  const { skip: skipRestTimer } = useRestTimer();
  const [loading, setLoading] = useState(false);
  const [displayLog, setDisplayLog] = useState(null);
  const [newMedals, setNewMedals] = useState([]);
  // Capture the log on first mount — so clearing completedLog doesn't wipe the UI
  const capturedLogRef = useRef(null);

  // On mount (and whenever completedLog arrives), capture it so it survives clearCompletedLog
  useEffect(() => {
    if (completedLog && !capturedLogRef.current) {
      capturedLogRef.current = completedLog;
      setDisplayLog(completedLog);
    }
  }, [completedLog]);

  // Also try capturing synchronously at render time (in case effect is too late)
  if (completedLog && !capturedLogRef.current) {
    capturedLogRef.current = completedLog;
  }

  // If we never got a log (navigated here directly), go back to Lifts
  useEffect(() => {
    const t = setTimeout(() => {
      if (!capturedLogRef.current) {
        navigate("/Lifts", { replace: true });
      }
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Calculate ranks client-side immediately using the same engine as the body model,
  // then fire the backend in the background to persist to DB.
  useEffect(() => {
    const log = capturedLogRef.current || completedLog;
    if (!log?.id) return;

    const calculateClientSide = async () => {
      setLoading(true);
      try {
        const user = await base44.auth.me();
        const [bodyWeights, allExercises, allStandards] = await Promise.all([
          base44.entities.BodyWeight.filter({ created_by: user.email }, "-date", 1),
          base44.entities.Exercise.list(),
          base44.entities.StrengthStandard.list(),
        ]);
        const rawBW = bodyWeights[0]?.weight;
        const bodyweightKg = (rawBW && rawBW > 0) ? rawBW : 80;
        const userGender = user?.sex || "male";

        // Lookup maps: exercise_id → Exercise meta, standard_name → StrengthStandard
        const exerciseMap = {};
        allExercises.forEach(e => { exerciseMap[e.id] = e; });
        const standardMap = indexStandards(allStandards);

        // Compute rank for every exercise using strength-standard tables.
        // Non-rankable / no standard / zero-volume exercises get null rank + null score.
        const rankedExercises = (log.exercises || []).map(ex => {
          const meta = exerciseMap[ex.exercise_id];
          if (!meta || !meta.is_rankable) {
            return { ...ex, rank: null, impressiveness_score: null };
          }
          const standard = standardMap[meta.rankable_standard_name];
          const result = calculateExerciseRank(meta, ex.sets, standard, userGender, bodyweightKg, weightUnit);
          return {
            ...ex,
            rank: result.rank,
            impressiveness_score: result.impressiveness_score,
            best_e1rm: result.best_metric,
          };
        });

        setDisplayLog({ ...log, exercises: rankedExercises });

        // Fire backend in background to persist ranks to DB and evaluate medals
        base44.functions.invoke("calculateRanks", {
          workoutLogId: log.id,
          userGender,
          weightUnit,
          exercises: log.exercises,
        }).then(res => {
          if (res?.data?.newMedals?.length > 0) setNewMedals(res.data.newMedals);
        }).catch(err => console.warn("[WorkoutSummary] Background rank persist failed:", err));

        // Update SBD cache — always rebuild from history to ensure accuracy
        base44.functions.invoke("updateSBDCache", {
          exercises: log.exercises,
          rebuildFromHistory: true,
        }).catch(err => console.warn("[WorkoutSummary] SBD cache update failed:", err));

      } catch (err) {
        console.error("[WorkoutSummary] Error calculating ranks:", err);
      } finally {
        setLoading(false);
      }
    };

    calculateClientSide();
  }, []); // run once on mount

  const handleDone = () => {
    // Workout is over — clear any lingering rest timer (countdown + sound).
    skipRestTimer();
    clearCompletedLog();
    navigate("/Lifts", { replace: true });
  };

  // Nothing captured yet — show a brief loading state (not null/black)
  const logToShow = displayLog || (capturedLogRef.current ? capturedLogRef.current : null);
  if (!logToShow) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  const effectiveLog = logToShow;

  const workingSetCounter = {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4 pt-5 pb-8"
    >
      {/* Header row */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={handleDone}
          className="text-sm font-semibold text-primary active:opacity-60 transition-opacity"
        >
          Done
        </button>
      </div>

      {/* Congrats header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="text-center mb-6"
      >
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-2" />
        <h1 className="text-2xl font-bold">{effectiveLog.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">Workout Complete</p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, type: "spring", stiffness: 300, damping: 25 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        <div className="bg-card rounded-xl p-3 text-center border border-border">
          <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{formatDuration(effectiveLog.duration_minutes)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border">
          <BarChart2 className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{toDisplay(effectiveLog.total_volume)?.toLocaleString() || 0} {weightUnit}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Volume</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border">
          <Dumbbell className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{effectiveLog.total_sets || 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sets</p>
        </div>
      </motion.div>

      {/* Rank loading indicator */}
      {loading && (
        <div className="text-center py-3 mb-2">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-full px-4 py-2">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Calculating ranks…
          </div>
        </div>
      )}

      {/* Medal notification */}
      {newMedals.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 mb-4">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Medals Earned!</p>
          {newMedals.map(id => (
            <p key={id} className="text-sm font-semibold">🏅 {id.replace(/_/g, ' ')}</p>
          ))}
        </div>
      )}

      {/* Exercise breakdown */}
      <div className="space-y-3">
        {effectiveLog.exercises?.map((ex, exIdx) => {
          if (!workingSetCounter[exIdx]) workingSetCounter[exIdx] = 0;
          const completedSets = ex.sets?.filter(s => s.completed) || [];
          if (completedSets.length === 0) return null;

          const rankInfo = ex.rank ? RANKS.find(r => r.name === ex.rank) : null;

          return (
            <motion.div
              key={`${ex.exercise_id || exIdx}-${ex.rank || "pending"}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + exIdx * 0.04, type: "spring", stiffness: 300, damping: 25 }}
              className="bg-card rounded-xl border border-border overflow-hidden"
              style={ex.color ? { borderLeftWidth: "3px", borderLeftColor: ex.color } : {}}
            >
              {/* Exercise header with rank badge */}
              <div className="px-4 py-3 border-b border-border/60 flex items-center gap-3">
                {rankInfo ? (
                  <div
                    className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold shadow-sm"
                    style={{ backgroundColor: rankInfo.color, color: rankInfo.textColor }}
                  >
                    {rankInfo.label[0]}
                  </div>
                ) : (
                  <div className={`w-8 h-8 flex-shrink-0 rounded-full bg-secondary ${loading ? "animate-pulse" : ""}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate mb-0">
                    {ex.exercise_name}
                    {ex.is_personal_best && " 🏆"}
                  </p>
                  {rankInfo ? (
                    <div
                      className="inline-flex items-center px-2 py-0.5 rounded-sm"
                      style={{ backgroundColor: rankInfo.color }}
                    >
                      <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: rankInfo.textColor }}>
                        {rankInfo.label}
                      </span>
                    </div>
                  ) : loading ? (
                    <div className="h-4 w-16 rounded-sm bg-secondary animate-pulse" />
                  ) : null}
                </div>
              </div>

              {/* Sets table */}
              <div className="px-4 py-2">
                <div className="grid grid-cols-4 gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">SET</span>
                  <span className="text-[10px] font-semibold text-muted-foreground text-center">WEIGHT</span>
                  <span className="text-[10px] font-semibold text-muted-foreground text-center">REPS</span>
                  <span className="text-[10px] font-semibold text-muted-foreground text-center">RIR</span>
                </div>
                {completedSets.map((set, sIdx) => {
                  const isWorking = set.type !== "warmup";
                  if (isWorking) workingSetCounter[exIdx] = (workingSetCounter[exIdx] || 0) + 1;
                  const label = set.type === "warmup" ? "W" : workingSetCounter[exIdx];
                  const color =
                    set.type === "warmup" ? "text-amber-500" :
                    set.type === "failure" ? "text-destructive" :
                    set.type === "dropset" ? "text-purple-400" :
                    "text-muted-foreground";
                  return (
                    <div key={sIdx} className="grid grid-cols-4 gap-2 py-1.5 border-t border-border/50">
                      <span className={`text-xs font-bold ${color}`}>{label}</span>
                      <span className="text-xs text-center">
                        {set.weight ? `${toDisplay(set.weight)} ${weightUnit}` : "—"}
                      </span>
                      <span className="text-xs text-center">{set.reps || "—"}</span>
                      <span className="text-xs text-center text-muted-foreground">{set.rir ?? "—"}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}