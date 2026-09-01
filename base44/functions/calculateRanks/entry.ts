import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  RANK_HIERARCHY, TIER_NAMES, ROLLING_WINDOW, EXPIRY_MS,
  buildMuscleRecord,
} from '../../shared/rankUtils.ts';

// ─── Strength-standard-based ranking system ───────────────────────────────
// Mirrors src/components/utils/strengthStandards.jsx (Deno functions cannot
// import frontend modules — keep these in sync).
const TIER_CHECK_ORDER = ["olympian", "titan", "champion", "diamond", "emerald", "gold", "silver", "bronze"];
const DEFAULT_SECONDARY_INVOLVEMENT = 0.6;

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
  const result = { bodyweight_lb: bodyweightLb };
  TIER_NAMES.forEach(tier => { result[tier] = lower[tier] + (upper[tier] - lower[tier]) * t; });
  return result;
}

// Returns { rank, impressiveness_score, best_metric } for a single exercise.
function calculateExerciseRank(exerciseMeta, sets, standard, userGender, bodyweightKg, weightUnit) {
  if (!exerciseMeta?.is_rankable || !standard) {
    return { rank: null, impressiveness_score: null, best_metric: null };
  }
  const workingSets = (sets || []).filter(s => s.completed && s.type !== "warmup");
  if (workingSets.length === 0) {
    return { rank: null, impressiveness_score: null, best_metric: null };
  }
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

  // Set weights are ALWAYS stored in kg (DB base unit); 1RM standards are in lb.
  // Always convert kg → lb. The `weightUnit` arg is the user's DISPLAY unit, not
  // the storage unit — using it to skip conversion was the bug that made the
  // real save path disagree with the Rank Tester on identical input.
  const toLb = (w) => w * 2.20462;
  const metricStd = standard.exercise_type === "1RM" ? toLb(metric) : metric;
  const bodyweightLb = bodyweightKg * 2.20462;

  const standardsArray = userGender === "female" ? standard.female_standards : standard.male_standards;
  const thresholds = interpolateThresholds(standardsArray, bodyweightLb);
  if (!thresholds) return { rank: null, impressiveness_score: null, best_metric: null };

  // Rank is computed fresh from this session's best set vs the strength
  // standard — it is NEVER skipped because the exercise_id already appears in
  // rank_history. Every finished workout produces its own independent event;
  // dedup is by workout_log_id|exercise_instance_index only (see rankUtils).
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

// Build rank events (primary + secondary) for one rankable exercise in a log.
// Primary gets the full tier; each secondary gets floor(primary_tier_index * involvement).
// Each event is stamped with workoutLogId + exerciseInstanceIndex so it can be
// removed precisely if the workout or this exercise is later deleted.
function buildEventsForExercise(ex, meta, standard, gender, bodyweightKg, weightUnit, logDate, workoutLogId, exerciseInstanceIndex) {
  if (!meta?.is_rankable || !standard) return [];
  const result = calculateExerciseRank(meta, ex.sets, standard, gender, bodyweightKg, weightUnit);
  if (!result.rank) return [];

  const primaryTierIndex = RANK_HIERARCHY[result.rank];
  const exerciseName = ex.exercise_name || meta.name || "Unknown";
  // Prefer the canonical (resolved) exercise id so the same exercise logged
  // under different stale IDs across logs dedups to one event per day.
  const exerciseId = meta.id || ex.exercise_id || null;
  const events = [];

  events.push({
    muscle: meta.primary_muscle,
    tier: result.rank,
    tier_index: primaryTierIndex,
    exercise_name: exerciseName,
    exercise_id: exerciseId,
    workout_log_id: workoutLogId || null,
    exercise_instance_index: exerciseInstanceIndex ?? null,
    estimated_1rm: result.best_metric,
    source: "primary",
    involvement_factor: 1.0,
    date: logDate,
  });

  (meta.secondary_muscles || []).forEach(muscle => {
    if (!muscle || muscle === meta.primary_muscle) return;
    const inv = (meta.secondary_involvement && typeof meta.secondary_involvement[muscle] === "number")
      ? meta.secondary_involvement[muscle]
      : DEFAULT_SECONDARY_INVOLVEMENT;
    const secTierIndex = Math.min(8, Math.max(0, Math.floor(primaryTierIndex * inv)));
    events.push({
      muscle,
      tier: TIER_NAMES[secTierIndex],
      tier_index: secTierIndex,
      exercise_name: exerciseName,
      exercise_id: exerciseId,
      workout_log_id: workoutLogId || null,
      exercise_instance_index: exerciseInstanceIndex ?? null,
      estimated_1rm: result.best_metric,
      source: "secondary",
      involvement_factor: inv,
      date: logDate,
    });
  });

  return events;
}

// buildMuscleRecord + recomputeFromHistory live in base44/shared/rankUtils.ts

// Upsert UserMuscleRank records for the affected muscles, given new events.
// Merges with existing history then dedups via buildMuscleRecord.
async function applyEvents(base44, existingByMuscle, newEvents) {
  const byMuscle = {};
  newEvents.forEach(e => {
    if (!byMuscle[e.muscle]) byMuscle[e.muscle] = [];
    byMuscle[e.muscle].push(e);
  });

  await Promise.all(Object.entries(byMuscle).map(([muscle, muscleEvents]) => {
    const row = existingByMuscle[muscle];
    const existingHistory = (row?.rank_history && Array.isArray(row.rank_history)) ? [...row.rank_history] : [];
    const merged = [...existingHistory, ...muscleEvents];
    const payload = buildMuscleRecord(muscle, merged);
    if (row) {
      return base44.entities.UserMuscleRank.update(row.id, {
        rank_history: payload.rank_history,
        displayed_rank: payload.displayed_rank,
        displayed_rank_index: payload.displayed_rank_index,
        last_updated: payload.last_updated,
        rank: payload.rank,
        impressiveness_score: payload.impressiveness_score,
      });
    }
    return base44.entities.UserMuscleRank.create({
      muscle,
      rank_history: payload.rank_history,
      displayed_rank: payload.displayed_rank,
      displayed_rank_index: payload.displayed_rank_index,
      last_updated: payload.last_updated,
      rank: payload.rank,
      impressiveness_score: payload.impressiveness_score,
    });
  }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { workoutLogId, userGender, weightUnit: clientWeightUnit, exercises: clientExercises, backfill, rebuild } = body;

    const gender = userGender || user.sex || "male";
    const weightUnit = clientWeightUnit || user.weight_unit || 'kg';

    const [bodyWeights, allExercises, allStandards, allLogs] = await Promise.all([
      base44.entities.BodyWeight.filter({ created_by: user.email }, "-date", 1),
      base44.asServiceRole.entities.Exercise.list(null, 500),
      base44.asServiceRole.entities.StrengthStandard.list(null, 200),
      base44.entities.WorkoutLog.filter({ created_by: user.email }, "-finished_at", 2000),
    ]);
    const rawBW = bodyWeights[0]?.weight;
    const bodyweightKg = (rawBW && rawBW > 0) ? rawBW : (gender === "female" ? 65 : 80);

    const exerciseMap = {};
    const exerciseByName = {};
    allExercises.forEach(e => {
      exerciseMap[e.id] = e;
      if (e.name) exerciseByName[e.name] = e;
    });
    const standardMap = {};
    allStandards.forEach(s => { standardMap[s.standard_name] = s; });
    // Resolve exercise metadata by ID, falling back to exact name match — older
    // WorkoutLogs reference exercise IDs that were recreated, so ID lookup
    // alone misses most historical exercises.
    const resolveMeta = (ex) => exerciseMap[ex.exercise_id] || exerciseByName[ex.exercise_name];

    const existingRanks = await base44.entities.UserMuscleRank.filter({ created_by: user.email }, null, 1000);
    const existingByMuscle = {};
    // Keep the FIRST record per muscle as canonical (matches the duplicate
    // cleanup below, which deletes later duplicates).
    existingRanks.forEach(r => { if (!existingByMuscle[r.muscle]) existingByMuscle[r.muscle] = r; });

    // ── BACKFILL: rebuild all UserMuscleRank from full workout history ──
    if (backfill) {
      const sortedLogs = [...allLogs].sort((a, b) =>
        new Date(a.finished_at || a.started_at || a.created_date).getTime() -
        new Date(b.finished_at || b.started_at || b.created_date).getTime()
      );
      const byMuscle = {};
      sortedLogs.forEach(log => {
        const logDate = log.finished_at || log.started_at || log.created_date;
        if (!logDate) return;
        (log.exercises || []).forEach((ex, exIdx) => {
          const meta = resolveMeta(ex);
          if (!meta) return;
          const standard = standardMap[meta.rankable_standard_name];
          const events = buildEventsForExercise(ex, meta, standard, gender, bodyweightKg, weightUnit, logDate, log.id, exIdx);
          events.forEach(e => {
            if (!byMuscle[e.muscle]) byMuscle[e.muscle] = [];
            byMuscle[e.muscle].push(e);
          });
        });
      });

      // Dedup any pre-existing duplicate UserMuscleRank records for the same
      // muscle (leftover junk from earlier backfill runs). Keep the first record
      // per muscle as the canonical row; delete the rest.
      const duplicateDeletes = [];
      const seenMuscles = new Set();
      existingRanks.forEach(r => {
        if (seenMuscles.has(r.muscle)) duplicateDeletes.push(r.id);
        else seenMuscles.add(r.muscle);
      });

      // Upsert muscles with events (replace history); delete stale records with none.
      const musclesWithEvents = Object.keys(byMuscle);
      await Promise.all([
        ...Object.entries(byMuscle).map(([muscle, events]) => {
          const row = existingByMuscle[muscle];
          const payload = buildMuscleRecord(muscle, events); // fresh from history, deduped
          if (row) {
            return base44.entities.UserMuscleRank.update(row.id, {
              rank_history: payload.rank_history,
              displayed_rank: payload.displayed_rank,
              displayed_rank_index: payload.displayed_rank_index,
              last_updated: payload.last_updated,
              rank: payload.rank,
              impressiveness_score: payload.impressiveness_score,
            });
          }
          return base44.entities.UserMuscleRank.create({
            muscle,
            rank_history: payload.rank_history,
            displayed_rank: payload.displayed_rank,
            displayed_rank_index: payload.displayed_rank_index,
            last_updated: payload.last_updated,
            rank: payload.rank,
            impressiveness_score: payload.impressiveness_score,
          });
        }),
        ...existingRanks
          .filter(r => !musclesWithEvents.includes(r.muscle))
          .map(r => base44.entities.UserMuscleRank.delete(r.id)),
        ...duplicateDeletes.map(id => base44.entities.UserMuscleRank.delete(id)),
      ]);

      let totalEvents = 0;
      Object.values(byMuscle).forEach(ev => { totalEvents += ev.length; });
      return Response.json({
        backfill: true,
        musclesRanked: musclesWithEvents.length,
        eventsTotal: totalEvents,
        staleDeleted: existingRanks.filter(r => !musclesWithEvents.includes(r.muscle)).length,
        duplicatesDeleted: duplicateDeletes.length,
      });
    }

    // ── REBUILD: cascade deletion of a workout or a single exercise ──
    // Wipes all rank_history events sourced from workoutLogId, then (if the log
    // still exists) regenerates fresh events from its current exercises with
    // correct 0..n-1 indices. Used for: full-workout delete (log gone → wipe
    // only), per-exercise delete (log saved with fewer exercises → wipe + regen),
    // and exercise edit scenarios.
    if (rebuild) {
      if (!workoutLogId) return Response.json({ error: 'workoutLogId required' }, { status: 400 });
      const [rebuildLog] = await base44.entities.WorkoutLog.filter({ id: workoutLogId });

      // 1. Wipe this log's events from every muscle record (compute kept history).
      const wipeByMuscle = {};
      let wipedEvents = 0;
      existingRanks.forEach(r => {
        const hist = Array.isArray(r.rank_history) ? r.rank_history : [];
        const kept = hist.filter(e => e.workout_log_id !== workoutLogId);
        if (kept.length !== hist.length) {
          wipeByMuscle[r.muscle] = kept;
          wipedEvents += hist.length - kept.length;
        }
      });

      // 2. Regenerate events from the log's current exercises (if it still exists).
      const newEventsByMuscle = {};
      let regeneratedEvents = 0;
      if (rebuildLog) {
        const logDate = rebuildLog.finished_at || rebuildLog.started_at || rebuildLog.created_date;
        (rebuildLog.exercises || []).forEach((ex, idx) => {
          const meta = resolveMeta(ex);
          if (!meta) return;
          const standard = standardMap[meta.rankable_standard_name];
          const evs = buildEventsForExercise(ex, meta, standard, gender, bodyweightKg, weightUnit, logDate, workoutLogId, idx);
          evs.forEach(e => {
            if (!newEventsByMuscle[e.muscle]) newEventsByMuscle[e.muscle] = [];
            newEventsByMuscle[e.muscle].push(e);
            regeneratedEvents += 1;
          });
        });
      }

      // 3. For each affected muscle: merge (kept + new), recompute, update/delete.
      const affectedMuscles = new Set([...Object.keys(wipeByMuscle), ...Object.keys(newEventsByMuscle)]);
      let recordsUpdated = 0, recordsCreated = 0, recordsEmptied = 0;
      await Promise.all([...affectedMuscles].map(async (muscle) => {
        const row = existingByMuscle[muscle];
        const baseHistory = wipeByMuscle[muscle] !== undefined
          ? wipeByMuscle[muscle]
          : ((row?.rank_history || []).filter(e => e.workout_log_id !== workoutLogId));
        const merged = [...baseHistory, ...(newEventsByMuscle[muscle] || [])];
        const payload = buildMuscleRecord(muscle, merged);
        if (payload.rank_history.length === 0) {
          if (row) { recordsEmptied += 1; return base44.entities.UserMuscleRank.delete(row.id); }
          return;
        }
        if (row) {
          recordsUpdated += 1;
          return base44.entities.UserMuscleRank.update(row.id, {
            rank_history: payload.rank_history,
            displayed_rank: payload.displayed_rank,
            displayed_rank_index: payload.displayed_rank_index,
            last_updated: payload.last_updated,
            rank: payload.rank,
            impressiveness_score: payload.impressiveness_score,
          });
        }
        recordsCreated += 1;
        return base44.entities.UserMuscleRank.create({
          muscle,
          rank_history: payload.rank_history,
          displayed_rank: payload.displayed_rank,
          displayed_rank_index: payload.displayed_rank_index,
          last_updated: payload.last_updated,
          rank: payload.rank,
          impressiveness_score: payload.impressiveness_score,
        });
      }));

      return Response.json({
        rebuild: true,
        logExists: !!rebuildLog,
        wipedEvents,
        regeneratedEvents,
        recordsUpdated,
        recordsCreated,
        recordsEmptied,
      });
    }

    // ── NORMAL: process the just-saved workout ──
    if (!workoutLogId) return Response.json({ error: 'workoutLogId required' }, { status: 400 });
    const [workoutLog] = await base44.entities.WorkoutLog.filter({ id: workoutLogId });
    if (!workoutLog) return Response.json({ error: 'Workout not found' }, { status: 404 });

    const sourceExercises = clientExercises || workoutLog.exercises || [];
    const logDate = workoutLog.finished_at || workoutLog.started_at || workoutLog.created_date;

    // Per-exercise rank (for WorkoutLog.exercises + medals)
    const updatedExercises = sourceExercises.map(ex => {
      const meta = resolveMeta(ex);
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

    await base44.entities.WorkoutLog.update(workoutLogId, { exercises: updatedExercises });

    // Build rank events for primary + secondary muscles.
    const allEvents = [];
    updatedExercises.forEach((ex, exIdx) => {
      const meta = resolveMeta(ex);
      if (!meta || !ex.rank) return;
      const standard = standardMap[meta.rankable_standard_name];
      allEvents.push(...buildEventsForExercise(ex, meta, standard, gender, bodyweightKg, weightUnit, logDate, workoutLogId, exIdx));
    });

    if (allEvents.length > 0) {
      await applyEvents(base44, existingByMuscle, allEvents);
    }

    // ── Medal evaluation ──
    const allLogsWithNew = [
      { ...workoutLog, exercises: updatedExercises },
      ...allLogs.filter(l => l.id !== workoutLogId),
    ];
    const currentMedals = user.unlockedMedals || [];
    const newMedals = [];
    function award(id) {
      if (!currentMedals.includes(id) && !newMedals.includes(id)) newMedals.push(id);
    }

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

    return Response.json({
      updatedLog: { ...workoutLog, exercises: updatedExercises },
      eventsCreated: allEvents.length,
      newMedals,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});