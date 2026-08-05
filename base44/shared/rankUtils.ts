// Shared rank-record building logic used by calculateRanks and
// cascadeRankDeletion. Extracted so both functions stay in sync.

export const RANK_HIERARCHY = {
  wood: 0, bronze: 1, silver: 2, gold: 3, emerald: 4,
  diamond: 5, champion: 6, titan: 7, olympian: 8,
};
export const TIER_NAMES = ["wood", "bronze", "silver", "gold", "emerald", "diamond", "champion", "titan", "olympian"];
export const ROLLING_WINDOW = 4;
export const EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

// Collapse a list of events for one muscle into a rolling-window record payload.
// Dedup key = workout_log_id|exercise_instance_index so every event is uniquely
// traceable to its source exercise instance and individually deletable.
export function buildMuscleRecord(muscle, history) {
  const now = Date.now();
  const cutoff = now - EXPIRY_MS;
  let h = (history || []).filter(e => {
    const t = new Date(e.date).getTime();
    return !isNaN(t) && t >= cutoff;
  });
  const dedup = new Map();
  h.forEach(e => {
    const key = `${e.workout_log_id || "unknown"}|${e.exercise_instance_index ?? -1}`;
    const prev = dedup.get(key);
    if (!prev) {
      dedup.set(key, e);
    } else {
      const better = (e.tier_index > prev.tier_index) ||
        (e.tier_index === prev.tier_index && (e.estimated_1rm || 0) > (prev.estimated_1rm || 0));
      if (better) dedup.set(key, e);
    }
  });
  h = Array.from(dedup.values());
  h.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (h.length > ROLLING_WINDOW) h = h.slice(h.length - ROLLING_WINDOW);

  let best = null;
  h.forEach(e => { if (!best || e.tier_index > best.tier_index) best = e; });
  const displayed_rank = best ? best.tier : null;
  const displayed_rank_index = best ? best.tier_index : -1;
  const last_updated = h.length ? h[h.length - 1].date : null;
  const impressiveness_score = best ? Math.round((best.tier_index / 8) * 1000) / 1000 : 0;

  return {
    muscle,
    rank_history: h,
    displayed_rank,
    displayed_rank_index,
    last_updated,
    rank: displayed_rank,            // backward compat
    impressiveness_score,
  };
}

// Recompute displayed_rank fields from a (possibly filtered) history array and
// return the update payload. Used by cascade deletion.
export function recomputeFromHistory(muscle, history) {
  const payload = buildMuscleRecord(muscle, history);
  return {
    rank_history: payload.rank_history,
    displayed_rank: payload.displayed_rank,
    displayed_rank_index: payload.displayed_rank_index,
    last_updated: payload.last_updated,
    rank: payload.rank,
    impressiveness_score: payload.impressiveness_score,
  };
}