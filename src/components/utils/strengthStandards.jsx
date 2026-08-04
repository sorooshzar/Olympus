// Strength-standard-based ranking system.
// Pure helpers used by WorkoutSummary (client-side instant calc). The same
// algorithm is mirrored in base44/functions/calculateRanks/entry.ts (Deno
// functions cannot import frontend modules).

// Rank tier names in ascending order. "wood" is a floor value only — the new
// system never assigns "wood" as a real rank (below bronze => null).
export const RANK_TIER_NAMES = ["wood", "bronze", "silver", "gold", "emerald", "diamond", "champion", "titan", "olympian"];

// Hierarchy for comparing ranks (higher = better). null/undefined < wood < bronze < ... < olympian.
export const RANK_HIERARCHY = {
  wood: 0, bronze: 1, silver: 2, gold: 3, emerald: 4,
  diamond: 5, champion: 6, titan: 7, olympian: 8,
};

// Tiers checked high → low; first threshold met = the rank.
const TIER_CHECK_ORDER = ["olympian", "titan", "champion", "diamond", "emerald", "gold", "silver", "bronze"];

export function rankCompare(a, b) {
  const ha = a == null ? -1 : (RANK_HIERARCHY[a] ?? -1);
  const hb = b == null ? -1 : (RANK_HIERARCHY[b] ?? -1);
  return ha - hb;
}

// Linearly interpolate the tier thresholds at the user's bodyweight using the
// two surrounding bodyweight brackets. Floors below the lowest bracket, ceilings
// above the highest. Returns an object with wood..olympian threshold values.
export function interpolateThresholds(standardsArray, bodyweightLb) {
  if (!standardsArray || standardsArray.length === 0) return null;
  const sorted = [...standardsArray].sort((a, b) => a.bodyweight_lb - b.bodyweight_lb);

  if (bodyweightLb <= sorted[0].bodyweight_lb) return { ...sorted[0] };
  if (bodyweightLb >= sorted[sorted.length - 1].bodyweight_lb) return { ...sorted[sorted.length - 1] };

  let lower = sorted[0];
  let upper = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (bodyweightLb >= sorted[i].bodyweight_lb && bodyweightLb <= sorted[i + 1].bodyweight_lb) {
      lower = sorted[i];
      upper = sorted[i + 1];
      break;
    }
  }
  const span = upper.bodyweight_lb - lower.bodyweight_lb;
  const t = span > 0 ? (bodyweightLb - lower.bodyweight_lb) / span : 0;
  const tiers = ["wood", "bronze", "silver", "gold", "emerald", "diamond", "champion", "titan", "olympian"];
  const result = { bodyweight_lb: bodyweightLb };
  tiers.forEach(tier => { result[tier] = lower[tier] + (upper[tier] - lower[tier]) * t; });
  return result;
}

// Core: compute rank + impressiveness for a single exercise.
//   exerciseMeta — { is_rankable, rankable_standard_name } from the Exercise entity
//   sets        — the logged sets for this exercise
//   standard    — the matching StrengthStandard record (or null)
//   userGender  — "male" | "female"
//   bodyweightKg— user bodyweight in kg (BodyWeight entity stores kg)
//   weightUnit  — "kg" | "lbs" (the unit the SET weights are logged in)
// Returns { rank, impressiveness_score, best_metric } — rank/score are null when
// the exercise is non-rankable, has no standard, or was never actually performed.
export function calculateExerciseRank(exerciseMeta, sets, standard, userGender, bodyweightKg, weightUnit = "kg") {
  // Non-rankable exercises never get a rank
  if (!exerciseMeta?.is_rankable || !standard) {
    return { rank: null, impressiveness_score: null, best_metric: null };
  }

  const workingSets = (sets || []).filter(s => s.completed && s.type !== "warmup");
  if (workingSets.length === 0) {
    return { rank: null, impressiveness_score: null, best_metric: null };
  }

  // Zero volume => never performed => no rank
  const totalVolume = workingSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
  if (totalVolume <= 0) {
    return { rank: null, impressiveness_score: null, best_metric: null };
  }

  let metric; // the value compared against thresholds
  if (standard.exercise_type === "1RM") {
    let bestE1rm = 0;
    workingSets.forEach(s => {
      if (s.weight > 0 && s.reps > 0) {
        const e1rm = s.weight * (1 + s.reps / 30); // Epley formula
        if (e1rm > bestE1rm) bestE1rm = e1rm;
      }
    });
    if (bestE1rm <= 0) return { rank: null, impressiveness_score: null, best_metric: null };
    metric = bestE1rm;
  } else {
    // bodyweight exercise — rank by max reps
    let maxReps = 0;
    workingSets.forEach(s => { if ((s.reps || 0) > maxReps) maxReps = s.reps; });
    if (maxReps <= 0) return { rank: null, impressiveness_score: null, best_metric: null };
    metric = maxReps;
  }

  // Convert metric + bodyweight into the standard's unit.
  // 1RM standards are in lb; reps standards are unitless.
  // Per-dumbbell convention: the user logs per-hand weight, and we use it as-is
  // (never doubled) — the standards are per-hand too.
  const toLb = (w) => weightUnit === "lbs" ? w : w * 2.20462;
  const metricStd = standard.exercise_type === "1RM" ? toLb(metric) : metric;
  const bodyweightLb = bodyweightKg * 2.20462;

  const standardsArray = userGender === "female" ? standard.female_standards : standard.male_standards;
  const thresholds = interpolateThresholds(standardsArray, bodyweightLb);
  if (!thresholds) return { rank: null, impressiveness_score: null, best_metric: null };

  // Highest tier whose threshold is met; below bronze => null (never "wood")
  let rank = null;
  for (const tier of TIER_CHECK_ORDER) {
    if (metricStd >= thresholds[tier]) { rank = tier; break; }
  }

  // Impressiveness: relative position within bronze → olympian spectrum, clamped 0–1
  const range = thresholds.olympian - thresholds.bronze;
  let score = 0;
  if (range > 0) {
    score = (metricStd - thresholds.bronze) / range;
    score = Math.min(Math.max(score, 0), 1);
  }

  return {
    rank,
    impressiveness_score: Math.round(score * 1000) / 1000,
    best_metric: Math.round(metricStd * 10) / 10,
  };
}

// Build a lookup map: standard_name → StrengthStandard record.
export function indexStandards(standards) {
  const map = {};
  (standards || []).forEach(s => { map[s.standard_name] = s; });
  return map;
}