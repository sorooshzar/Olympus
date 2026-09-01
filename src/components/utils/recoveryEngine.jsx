/**
 * Muscle recovery engine (linear time-decay model with relative-intensity stimulus)
 *
 * Per-set stimulus = reps × relative_intensity × rir_multiplier
 *   - relative_intensity = set_weight / best_epley_1RM_for_exercise (0–1+)
 *     Computed from the same 7-day log window; falls back to 1.0 when no valid
 *     1RM exists (bodyweight, unranked, or all sets at zero weight).
 *   - rir_multiplier rewards proximity to failure (RIR 0 → 1.5×, RIR 5+ → 0.7×).
 * Primary muscles get full stimulus; secondary/synergist muscles get 0.5×.
 * Each session's stimulus decays LINEARLY over 5 days (120h):
 *   0h → 100%, 24h → 80%, 48h → 60%, 72h → 40%, 96h → 20%, 120h → 0%
 */

// RIR → fatigue multiplier. Sets closer to failure create disproportionately
// more fatigue than sets far from failure, even at the same tonnage.
function rirToMultiplier(rir) {
  if (rir == null) return 1.0;       // unknown — baseline
  if (rir === 0)   return 1.5;       // absolute failure
  if (rir === 1)   return 1.3;
  if (rir === 2)   return 1.15;
  if (rir === 3)   return 1.0;       // baseline
  if (rir === 4)   return 0.85;
  return 0.7;                         // RIR 5+ — easy work, low fatigue
}

// Fatigue thresholds — calibrated so a typical hard session (3–6 working sets
// near failure) shows as Heavy/Sore, decaying to Ready over ~5 days.
// Recalibrated for the relative-intensity stimulus scale. Old thresholds
// (4/12/25/45) were tuned for raw tonnage magnitudes (hundreds/thousands);
// the new formula produces values in the single-to-low-double digits per set,
// so thresholds are proportionally lower.
const THRESHOLDS = {
  light:    3,
  moderate: 7,
  heavy:    12,
  sore:     25,
};

const SECONDARY_DISCOUNT = 0.5;
const SECONDARY_DISCOUNT_GLUTES_HIP = 0.75;  // Glutes on hip-dominant compounds take near-primary stress

const HIP_DOMINANT_PATTERNS = ["squat", "hip hinge", "lunge", "split", "deadlift", "rdl", "romanian", "good morning"];
function isHipDominant(pattern) {
  if (!pattern) return false;
  const p = pattern.toLowerCase();
  return HIP_DOMINANT_PATTERNS.some(h => p.includes(h));
}

export function computeRecovery(workoutLogs, exerciseMap = {}) {
  const now = Date.now();
  // 7-day window — the decay curve zeroes out by day 5, so 7 days gives a safe
  // 2-day buffer while keeping the query fast for users with long histories.
  const cutoff = now - 7 * 24 * 60 * 60 * 1000;

  // --- Pass 1: compute the best Epley 1RM per exercise from the 7-day window ---
  // e1RM = weight × (1 + reps / 30) — same Epley formula the rank engine uses.
  // This normalizes each set's load against the lifter's own capability, so a
  // stronger lifter doing 315×8 isn't penalized with more fatigue than a weaker
  // lifter doing 225×8 at the same RIR.
  const bestE1RM = {};
  workoutLogs.forEach(log => {
    const logTime = new Date(log.finished_at || log.started_at || log.created_date).getTime();
    if (logTime < cutoff) return;
    log.exercises?.forEach(ex => {
      if (!ex.exercise_id) return;
      ex.sets?.forEach(s => {
        if (!s.completed || s.type === "warmup") return;
        if (!s.weight || !s.reps || s.reps < 1) return;
        const e1rm = s.weight * (1 + s.reps / 30);
        if (!bestE1RM[ex.exercise_id] || e1rm > bestE1RM[ex.exercise_id]) {
          bestE1RM[ex.exercise_id] = e1rm;
        }
      });
    });
  });

  // --- Pass 2: compute decayed stimulus per muscle ---
  // Accumulated fatigue keyed by the LOWERCASE muscle name (e.g. "mid/low chest",
  // "front delt", "triceps") — the exact key the MuscleModel SVG reads via
  // GROUP_TO_MUSCLE[name].toLowerCase().
  const fatigue = {};

  // Apply a decayed stimulus load to a muscle, keyed by its lowercased name.
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
      const e1rm = bestE1RM[ex.exercise_id];

      // Session stimulus = Σ(reps × relative_intensity × rir_multiplier) over
      // completed working/failure sets. Warmup sets are excluded.
      let sessionStimulus = 0;
      ex.sets?.forEach(s => {
        if (!s.completed || s.type === "warmup") return;
        const reps = s.reps || 0;

        // Failure-type sets always get at least the RIR-0 multiplier (1.5×),
        // regardless of the rir field value.
        const isFailureType = s.type === "failure" || s.type === "dropset";
        const mult = isFailureType
          ? Math.max(rirToMultiplier(s.rir), rirToMultiplier(0))
          : rirToMultiplier(s.rir);

        // Relative intensity: set weight ÷ lifter's best Epley 1RM for this
        // exercise. Falls back to 1.0 when no valid 1RM exists (bodyweight
        // exercises with weight=0, never-ranked exercises, etc.) to avoid NaN.
        let relIntensity = 1.0;
        if (e1rm && e1rm > 0 && s.weight && s.weight > 0) {
          relIntensity = s.weight / e1rm;
        }

        sessionStimulus += reps * relIntensity * mult;
      });

      if (!sessionStimulus) return;

      // Primary muscle — full stimulus.
      applyFatigue(ex.muscle_group, sessionStimulus, hoursAgo);

      // Secondary muscles — reduced involvement vs primary. The default 0.5×
      // discount suits most synergists (e.g. triceps on bench), but Glutes on
      // hip-dominant compounds (squat, hinge, lunge) take near-primary-level
      // stress, so they get a boosted 0.75× factor. Erectors / Hamstrings /
      // Adductors stay at the default — their involvement is genuinely secondary.
      const secondaries = exerciseMap?.[ex.exercise_id]?.secondary_muscles;
      const hipDominant = isHipDominant(exerciseMap?.[ex.exercise_id]?.movement_pattern);
      if (Array.isArray(secondaries)) {
        secondaries.forEach(sm => {
          const involvement = (hipDominant && sm.toLowerCase() === "glutes")
            ? SECONDARY_DISCOUNT_GLUTES_HIP
            : SECONDARY_DISCOUNT;
          applyFatigue(sm, sessionStimulus * involvement, hoursAgo);
        });
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