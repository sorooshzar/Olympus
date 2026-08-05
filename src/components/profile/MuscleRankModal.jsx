import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Dumbbell, Trophy, Repeat } from "lucide-react";
import { RANKS, MUSCLE_ANCHOR } from "@/components/utils/rankEngine";
import { useWeightUnit } from "@/components/utils/useWeightUnit";

const RANK_BY_NAME = RANKS.reduce((acc, r) => { acc[r.name] = r; return acc; }, {});

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export default function MuscleRankModal({ muscle, rankRecord, rankData, onClose }) {
  const { unit, toDisplay } = useWeightUnit();
  const anchor = MUSCLE_ANCHOR[muscle] || "Best Exercise";
  const history = (rankRecord?.rank_history && Array.isArray(rankRecord.rank_history)) ? rankRecord.rank_history : [];

  // displayed rank = best tier in the rolling window (from DB), fallback to rankData
  const displayedName = rankRecord?.displayed_rank || rankRecord?.rank || (rankData?.rank?.name);
  const rank = displayedName ? RANK_BY_NAME[displayedName] : null;

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

  const rankIndex = RANKS.findIndex(r => r.name === rank.name);
  const windowLabel = history.length ? `${history.length} recent ${history.length === 1 ? "log" : "logs"}` : "No recent logs";

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
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg"
                style={{ background: rank.color, color: rank.textColor }}>
                {rank.label[0]}
              </div>
              <div>
                <span className="text-2xl font-black" style={{ color: rank.color }}>{rank.label}</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">{rank.description}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{windowLabel} · best in last 90 days</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Rank ladder */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2">Rank Ladder</p>
              <div className="flex items-center gap-1.5">
                {RANKS.map((r, i) => (
                  <div key={r.name} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full h-2 rounded-full transition-all"
                      style={{ background: i <= rankIndex ? r.color : "hsl(var(--secondary))", opacity: i <= rankIndex ? 1 : 0.4 }} />
                    {i === rankIndex && <div className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-muted-foreground">Wood</span>
                <span className="text-[9px] text-muted-foreground">Olympian</span>
              </div>
            </div>

            {/* Recent rank history — the source of truth for contributing exercises */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2">Recent Rank Events</p>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground/70 py-2">No events in the rolling window.</p>
              ) : (
                <div className="space-y-1.5">
                  {history.slice().reverse().map((ev, i) => {
                    const r = RANK_BY_NAME[ev.tier] || RANKS[0];
                    return (
                      <div key={i} className="flex items-center gap-2.5 bg-secondary/60 rounded-xl px-3 py-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                          style={{ background: r.color, color: r.textColor }}>
                          {r.label[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ev.exercise_name || "Unknown"}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">{r.label} tier</span>
                            {ev.source === "secondary" && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-px rounded bg-muted text-muted-foreground">
                                <Repeat className="w-2.5 h-2.5" /> {Math.round(ev.involvement_factor * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground">{timeAgo(ev.date)}</p>
                          {ev.estimated_1rm ? (
                            <p className="text-[9px] text-muted-foreground/70">{toDisplay(ev.estimated_1rm).toFixed(0)} {unit}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Anchor hint */}
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