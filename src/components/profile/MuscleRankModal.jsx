import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Dumbbell, Trophy } from "lucide-react";
import { RANKS, MUSCLE_ANCHOR } from "@/components/utils/rankEngine";
import { useWeightUnit } from "@/components/utils/useWeightUnit";

const RANK_NAMES = RANKS.map(r => r.name);
const RANK_BY_NAME = RANKS.reduce((acc, r) => { acc[r.name] = r; return acc; }, {});

export default function MuscleRankModal({ muscle, rankName, rankData, workoutLogs, onClose }) {
  const { unit, toDisplay } = useWeightUnit();

  const anchor = MUSCLE_ANCHOR[muscle] || "Best Exercise";

  // Authoritative rank: prefer detailed client-computed data, fall back to DB rank name
  const rank = rankData?.rank || (rankName ? RANK_BY_NAME[rankName] : null);

  // Contributing exercises: rankable exercises in logs that target this muscle
  const contributing = useMemo(() => {
    if (!workoutLogs) return [];
    const seen = {};
    workoutLogs.forEach(log => {
      log.exercises?.forEach(ex => {
        if (!ex.rank) return;
        if ((ex.muscle_group || "").trim() !== muscle.trim()) return;
        const key = ex.exercise_name || ex.exercise_id || "Unknown";
        const ri = RANK_NAMES.indexOf(ex.rank);
        const prev = seen[key];
        if (!prev || ri > prev.rankIndex) {
          seen[key] = { name: ex.exercise_name || "Unknown", rank: ex.rank, rankIndex: ri, date: log.finished_at || log.started_at };
        }
      });
    });
    return Object.values(seen).sort((a, b) => b.rankIndex - a.rankIndex);
  }, [workoutLogs, muscle]);

  // Empty state — no rank at all
  if (!rank) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="bg-card w-full max-w-sm rounded-3xl border border-border p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{muscle}</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="text-center py-8 space-y-2">
              <Dumbbell className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No rank for this muscle yet.</p>
              <p className="text-xs text-muted-foreground/70">Train <span className="font-semibold text-foreground">{anchor}</span> with working sets to earn a rank.</p>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  const hasDetail = !!rankData;
  const levelLabel = hasDetail ? rankData.levelLabel : null;
  const levelProgress = hasDetail ? rankData.levelProgress : null;
  const nextRank = hasDetail ? rankData.nextRank : null;
  const nextLevel = hasDetail ? rankData.nextLevel : null;
  const rankIndex = hasDetail ? rankData.rankIndex : RANK_NAMES.indexOf(rank.name);
  const levelRoman = ["I", "II", "III"];
  const isMax = hasDetail ? (!nextRank && rankData.level === 3) : rankIndex >= RANKS.length - 1;
  const nextLevelLabel = isMax ? "MAX" : !hasDetail ? RANKS[Math.min(rankIndex + 1, RANKS.length - 1)].label : (rankData.level === 3 ? `${nextRank?.label} I` : `${rank.label} ${levelRoman[nextLevel - 1]}`);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          className="bg-card w-full max-w-sm rounded-3xl border border-border overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header band */}
          <div className="relative px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${rank.color}22, ${rank.color}08)`, borderBottom: `2px solid ${rank.color}44` }}>
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">{muscle}</p>
            {/* Rank badge */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg"
                style={{ background: rank.color, color: rank.textColor }}>
                {rank.label[0]}
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black" style={{ color: rank.color }}>{rank.label}</span>
                  {levelLabel && <span className="text-lg font-bold text-muted-foreground">{levelLabel}</span>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{rank.description}</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Level progress bar — only when detailed data available */}
            {hasDetail && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">{rank.label} {levelLabel}</span>
                  <span className="text-[11px] font-semibold" style={{ color: nextRank?.color || rank.color }}>{nextLevelLabel}</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(levelProgress * 100)}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${rank.color}, ${nextRank?.color || rank.color})` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{Math.round(levelProgress * 100)}% to {nextLevelLabel}</p>
              </div>
            )}

            {/* All rank ladder */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2">Rank Ladder</p>
              <div className="flex items-center gap-1.5">
                {RANKS.map((r, i) => (
                  <div key={r.name} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="w-full h-2 rounded-full transition-all"
                      style={{
                        background: i <= rankIndex ? r.color : "hsl(var(--secondary))",
                        opacity: i <= rankIndex ? 1 : 0.4,
                      }}
                    />
                    {i === rankIndex && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-muted-foreground">Wood</span>
                <span className="text-[9px] text-muted-foreground">Olympian</span>
              </div>
            </div>

            {/* Primary stat — only when detailed data available */}
            {hasDetail && (
              <div className="bg-secondary rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Est. 1RM (last 30 days)</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">{toDisplay(rankData.bestE1RM).toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground font-semibold">{unit}</span>
                  <span className="text-xs text-muted-foreground ml-1 font-medium">{(rankData.e1rmRatio).toFixed(2)}× BW</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">via <span className="font-semibold text-foreground">{rankData.bestE1RMExercise || anchor}</span></p>
              </div>
            )}

            {/* Contributing exercises */}
            {contributing.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2">Contributing Exercises</p>
                <div className="space-y-1.5">
                  {contributing.map((c, i) => {
                    const r = RANK_BY_NAME[c.rank] || RANKS[0];
                    return (
                      <div key={i} className="flex items-center gap-2.5 bg-secondary/60 rounded-xl px-3 py-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                          style={{ background: r.color, color: r.textColor }}>
                          {r.label[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">{r.label} tier</p>
                        </div>
                        {hasDetail && c.name === rankData.bestE1RMExercise && (
                          <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Anchor exercise hint */}
            <div className="flex items-center gap-2 px-1 pb-1">
              <Trophy className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              <p className="text-[10px] text-muted-foreground">Anchor lift for <span className="font-semibold text-foreground">{muscle}</span>: <span className="font-semibold text-foreground">{anchor}</span></p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}