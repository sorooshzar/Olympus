/**
 * Muscle recovery engine (linear time-decay model)
 *
 * Fatigue load per session = Σ(reps × intensity_multiplier) over working sets.
 * Each session's load decays LINEARLY over 5 days (120h):
 *   0h → 100%, 24h → 80%, 48h → 60%, 72h → 40%, 96h → 20%, 120h → 0%
 * This ensures muscles naturally recover back to "Ready" (green) after ~5 days
 * of no training, regardless of muscle group. Primary muscles get full load;
 * secondary/synergist muscles get 0.5× load. Multiple sessions accumulate.
 */

// RIR → relative intensity multiplier
function rirToIntensity(rir) {
  if (rir == null) return 0.75; // unknown — assume moderate
  if (rir === 0)   return 1.0;  // absolute failure
  if (rir === 1)   return 0.9;
  if (rir === 2)   return 0.8;
  if (rir === 3)   return 0.65;
  return 0.5;                   // RIR 4+ — easy work, low fatigue
}

// Fatigue thresholds — lowered so muscles stay yellow/orange for 24-48h after a hard session.
// Typical heavy session produces ~40-80 fatigue units; these thresholds ensure visible fatigue.
const THRESHOLDS = {
  light:    4,
  moderate: 12,
  heavy:    25,
  sore:     45,
};

export function computeRecovery(workoutLogs, exerciseMap = {}) {
  const now = Date.now();
  // 120h (5 days) — the point at which linear decay reaches 0. Anything older
  // contributes zero fatigue, so there's no need to scan further back.
  const cutoff = now - 120 * 60 * 60 * 1000;

  // Accumulated decayed fatigue per muscle, keyed by the LOWERCASE muscle name
  // (e.g. "mid/low chest", "front delt", "triceps") — this is the exact key the
  // MuscleModel SVG reads via GROUP_TO_MUSCLE[name].toLowerCase(). Keying by the
  // broad category ("chest", "shoulders") broke every lookup and made the whole
  // map default to "fresh".
  const fatigue = {};

  // Apply a decayed fatigue load to a muscle, keyed by its lowercased name.
  // Linear decay: 100% at 0h → 80% at 24h → 60% at 48h → 40% at 72h → 20% at 96h → 0% at 120h.
  const applyFatigue = (muscleName, load, hoursAgo) => {
    if (!muscleName || !load) return;
    const key = muscleName.toLowerCase();
    const decayFactor = Math.max(0, 1 - hoursAgo / 120);
    fatigue[key] = (fatigue[key] || 0) + load * decayFactor;
  };

  workoutLogs.forEach(log => {
    const logTime = new Date(log.finished_at || log.started_at || log.created_date).getTime();
    if (logTime < cutoff) return;

    const hoursAgo = (now - logTime) / (1000 * 60 * 60);

    log.exercises?.forEach(ex => {
      // Session fatigue = Σ(reps × intensity) over completed working sets.
      // Warmup sets are excluded — they don't contribute meaningful fatigue.
      let sessionFatigue = 0;
      ex.sets?.forEach(s => {
        if (!s.completed || s.type === "warmup") return;
        const reps = s.reps || 0;
        const intensity = rirToIntensity(s.rir);
        sessionFatigue += reps * intensity;
      });
      if (!sessionFatigue) return;

      // Primary muscle — full load.
      applyFatigue(ex.muscle_group, sessionFatigue, hoursAgo);

      // Secondary muscles — reduced involvement (~0.5×), matching the rank
      // system's secondary involvement_factor. Without this, bench press never
      // fatigued Triceps / Front Delt even though they were worked hard.
      const secondaries = exerciseMap?.[ex.exercise_id]?.secondary_muscles;
      if (Array.isArray(secondaries)) {
        secondaries.forEach(sm => applyFatigue(sm, sessionFatigue * 0.5, hoursAgo));
      }
    });
  });

  // Map fatigue score → recovery state
  const recovery = {};
  Object.entries(fatigue).forEach(([muscle, score]) => {
    if (score >= THRESHOLDS.sore)          recovery[muscle] = "sore";
    else if (score >= THRESHOLDS.heavy)    recovery[muscle] = "heavy";
    else if (score >= THRESHOLDS.moderate) recovery[muscle] = "moderate";
    else if (score >= THRESHOLDS.light)    recovery[muscle] = "light";
    else                                   recovery[muscle] = "fresh";
  });

  return recovery; // e.g. { "mid/low chest": "sore", "triceps": "heavy", "front delt": "heavy" }
}