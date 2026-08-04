import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Strength-standard-based ranking system ───────────────────────────────
// Mirrors src/components/utils/strengthStandards.jsx (Deno functions cannot
// import frontend modules — keep these in sync).
const RANK_HIERARCHY = {
  wood: 0, bronze: 1, silver: 2, gold: 3, emerald: 4,
  diamond: 5, champion: 6, titan: 7, olympian: 8,
};
const TIER_CHECK_ORDER = ["olympian", "titan", "champion", "diamond", "emerald", "gold", "silver", "bronze"];

function rankCompare(a, b) {
  const ha = a == null ? -1 : (RANK_HIERARCHY[a] ?? -1);
  const hb = b == null ? -1 : (RANK_HIERARCHY[b] ?? -1);
  return ha - hb;
}

function interpolateThresholds(standardsArray, bodyweightLb) {
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

function calculateExerciseRank(exerciseMeta, sets, standard, userGender, bodyweightKg, weightUnit) {
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

  let metric;
  if (standard.exercise_type === "1RM") {
    let bestE1rm = 0;
    workingSets.forEach(s => {
      if (s.weight > 0 && s.reps > 0) {
        const e1rm = s.weight * (1 + s.reps / 30); // Epley
        if (e1rm > bestE1rm) bestE1rm = e1rm;
      }
    });
    if (bestE1rm <= 0) return { rank: null, impressiveness_score: null, best_metric: null };
    metric = bestE1rm;
  } else {
    let maxReps = 0;
    workingSets.forEach(s => { if ((s.reps || 0) > maxReps) maxReps = s.reps; });
    if (maxReps <= 0) return { rank: null, impressiveness_score: null, best_metric: null };
    metric = maxReps;
  }

  // 1RM standards are in lb; reps standards are unitless. Per-dumbbell convention:
  // user logs per-hand weight, used as-is (never doubled).
  const toLb = (w) => weightUnit === "lbs" ? w : w * 2.20462;
  const metricStd = standard.exercise_type === "1RM" ? toLb(metric) : metric;
  const bodyweightLb = bodyweightKg * 2.20462;

  const standardsArray = userGender === "female" ? standard.female_standards : standard.male_standards;
  const thresholds = interpolateThresholds(standardsArray, bodyweightLb);
  if (!thresholds) return { rank: null, impressiveness_score: null, best_metric: null };

  let rank = null;
  for (const tier of TIER_CHECK_ORDER) {
    if (metricStd >= thresholds[tier]) { rank = tier; break; }
  }

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
// ──────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workoutLogId, userGender, weightUnit: clientWeightUnit, exercises: clientExercises } = await req.json();
    if (!workoutLogId) return Response.json({ error: 'workoutLogId required' }, { status: 400 });

    const [workoutLog] = await base44.entities.WorkoutLog.filter({ id: workoutLogId });
    if (!workoutLog) return Response.json({ error: 'Workout not found' }, { status: 404 });

    const gender = userGender || user.sex || "male";
    const weightUnit = clientWeightUnit || user.weight_unit || 'kg';

    const [bodyWeights, allExercises, allStandards, allLogs] = await Promise.all([
      base44.entities.BodyWeight.filter({ created_by: user.email }, "-date", 1),
      base44.asServiceRole.entities.Exercise.list(null, 500),
      base44.asServiceRole.entities.StrengthStandard.list(null, 100),
      base44.entities.WorkoutLog.filter({ created_by: user.email }, "-finished_at", 2000),
    ]);
    const rawBW = bodyWeights[0]?.weight;
    const bodyweightKg = (rawBW && rawBW > 0) ? rawBW : 80;

    const exerciseMap = {};
    allExercises.forEach(e => { exerciseMap[e.id] = e; });
    const standardMap = {};
    allStandards.forEach(s => { standardMap[s.standard_name] = s; });

    const sourceExercises = clientExercises || workoutLog.exercises || [];

    // Compute rank for each exercise using strength-standard tables.
    // Non-rankable / no standard / zero-volume exercises get null rank + null score.
    const updatedExercises = sourceExercises.map(ex => {
      const meta = exerciseMap[ex.exercise_id];
      if (!meta || !meta.is_rankable) {
        return { ...ex, rank: null, impressiveness_score: null };
      }
      const standard = standardMap[meta.rankable_standard_name];
      const result = calculateExerciseRank(meta, ex.sets, standard, gender, bodyweightKg, weightUnit);
      return {
        ...ex,
        rank: result.rank,
        impressiveness_score: result.impressiveness_score,
        best_e1rm: result.best_metric,
      };
    });

    // Persist updated exercises back to the log
    await base44.entities.WorkoutLog.update(workoutLogId, { exercises: updatedExercises });

    // ─── UserMuscleRank upsert ─────────────────────────────────────────────
    // For each muscle targeted (primary or secondary) by a rankable exercise
    // with a non-null rank, keep the highest rank achieved. Only update an
    // existing record when the new rank is strictly higher; create if missing.
    const muscleBestRank = {}; // muscle -> { rank, score }
    updatedExercises.forEach(ex => {
      if (!ex.rank) return;
      const meta = exerciseMap[ex.exercise_id];
      if (!meta) return;
      const muscles = [meta.primary_muscle, ...(meta.secondary_muscles || [])].filter(Boolean);
      muscles.forEach(muscle => {
        const cur = muscleBestRank[muscle];
        if (!cur || rankCompare(ex.rank, cur.rank) > 0) {
          muscleBestRank[muscle] = { rank: ex.rank, score: ex.impressiveness_score };
        }
      });
    });

    const existing = await base44.entities.UserMuscleRank.filter({ created_by: user.email }, null, 1000);
    const existingByMuscle = {};
    existing.forEach(e => { existingByMuscle[e.muscle] = e; });

    await Promise.all(
      Object.entries(muscleBestRank).map(([muscle, { rank, score }]) => {
        const row = existingByMuscle[muscle];
        if (row) {
          if (rankCompare(rank, row.rank) > 0) {
            return base44.entities.UserMuscleRank.update(row.id, { rank, impressiveness_score: score });
          }
          return Promise.resolve();
        }
        return base44.entities.UserMuscleRank.create({ muscle, rank, impressiveness_score: score });
      })
    );

    // ─── Medal evaluation ────────────────────────────────────────────────
    const allLogsWithNew = [
      { ...workoutLog, exercises: updatedExercises },
      ...allLogs.filter(l => l.id !== workoutLogId),
    ];
    const currentMedals = user.unlockedMedals || [];
    const newMedals = [];
    function award(id) {
      if (!currentMedals.includes(id) && !newMedals.includes(id)) newMedals.push(id);
    }

    // Strength medals — best single set weight across all logs
    const bestBench = Math.max(0, ...allLogsWithNew.flatMap(l =>
      (l.exercises || []).filter(e => e.exercise_name?.toLowerCase().includes('bench'))
        .flatMap(e => (e.sets || []).filter(s => s.completed && s.type !== 'warmup').map(s => s.weight || 0))
    ));
    const bestSquat = Math.max(0, ...allLogsWithNew.flatMap(l =>
      (l.exercises || []).filter(e => e.exercise_name?.toLowerCase().includes('squat'))
        .flatMap(e => (e.sets || []).filter(s => s.completed && s.type !== 'warmup').map(s => s.weight || 0))
    ));
    const bestDeadlift = Math.max(0, ...allLogsWithNew.flatMap(l =>
      (l.exercises || []).filter(e => e.exercise_name?.toLowerCase().includes('deadlift'))
        .flatMap(e => (e.sets || []).filter(s => s.completed && s.type !== 'warmup').map(s => s.weight || 0))
    ));

    const toLbs = (w) => weightUnit === 'lbs' ? w : w * 2.20462;
    if (toLbs(bestBench) >= 135) award('bench_135');
    if (toLbs(bestBench) >= 185) award('bench_185');
    if (toLbs(bestBench) >= 225) award('bench_225');
    if (toLbs(bestBench) >= 315) award('bench_315');
    if (toLbs(bestSquat) >= 225) award('squat_225');
    if (toLbs(bestSquat) >= 315) award('squat_315');
    if (toLbs(bestDeadlift) >= 315) award('dead_315');
    if (toLbs(bestDeadlift) >= 405) award('dead_405');

    // Consistency medals
    const workoutDates = allLogsWithNew
      .map(l => l.finished_at || l.started_at)
      .filter(Boolean)
      .map(d => new Date(d).toDateString());
    const uniqueDates = [...new Set(workoutDates)].sort();
    let maxStreak = 0, currentStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
      else { currentStreak = 1; }
    }
    if (maxStreak >= 7) award('streak_7');
    if (maxStreak >= 30) award('streak_30');

    const weekCounts = {};
    allLogsWithNew.forEach(l => {
      const d = new Date(l.finished_at || l.started_at || '');
      if (isNaN(d.getTime())) return;
      const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toDateString();
      weekCounts[key] = (weekCounts[key] || 0) + 1;
    });
    const maxWeekWorkouts = Math.max(0, ...Object.values(weekCounts));
    if (maxWeekWorkouts >= 5) award('workouts_5');

    // Cardio medals
    try {
      const cardioLogs = await base44.entities.CardioLog.filter({ created_by: user.email }, null, 1000);
      const bestDurationSecs = Math.max(0, ...cardioLogs.map(l => l.duration_seconds || 0));
      if (bestDurationSecs >= 30 * 60) award('cardio_30');
      if (bestDurationSecs >= 60 * 60) award('cardio_60');
      if (bestDurationSecs >= 120 * 60) award('cardio_120');
    } catch {}

    if (newMedals.length > 0) {
      await base44.auth.updateMe({ unlockedMedals: [...currentMedals, ...newMedals] });
    }
    // ─────────────────────────────────────────────────────────────────────────

    return Response.json({
      updatedLog: { ...workoutLog, exercises: updatedExercises },
      muscleRanks: Object.entries(muscleBestRank).reduce((acc, [m, d]) => { acc[m] = d.rank; return acc; }, {}),
      newMedals,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});