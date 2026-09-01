/**
 * Science-based muscle recovery engine (SRA curve model)
 * 
 * Fatigue score per session = sum(reps × intensity_multiplier) per muscle
 * Decays exponentially with a half-life specific to each muscle group.
 * Multiple sessions accumulate. Recovery state mapped from remaining fatigue.
 */

// Half-lives in hours — based on SRA research & Israetel volume work
const HALF_LIVES = {
  chest:      60,   // ~2.5 days
  back:       72,   // ~3 days
  lats:       72,
  traps:      48,
  shoulders:  36,   // ~1.5 days (smaller muscles, recover faster)
  biceps:     48,
  triceps:    48,
  forearms:   24,
  quads:      72,   // large compound — takes longest
  hamstrings: 84,   // very demanding, prone to soreness
  glutes:     84,
  calves:     36,
  abs:        36,
  core:       36,
};

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

function getMuscleCategory(muscleGroup) {
  if (!muscleGroup) return null;
  const m = muscleGroup.toLowerCase();
  if (m.includes('chest')) return 'chest';
  if (m.includes('lat')) return 'lats';
  if (m.includes('mid back') || m.includes('erector') || m.includes('trap')) return 'back';
  if (m.includes('rear delt') || m.includes('front delt') || m.includes('side delt')) return 'shoulders';
  if (m.includes('bicep') || m.includes('brachioradialis') || m.includes('wrist')) return 'forearms';
  if (m.includes('tricep')) return 'triceps';
  if (m.includes('quad') || m.includes('adduct') || m.includes('abduct')) return 'quads';
  if (m.includes('hamstring')) return 'hamstrings';
  if (m.includes('glute')) return 'glutes';
  if (m.includes('calf') || m.includes('calve')) return 'calves';
  if (m.includes('abs') || m.includes('oblique') || m.includes('core')) return 'abs';
  return null;
}

export function computeRecovery(workoutLogs, exerciseMap = {}) {
  const now = Date.now();
  const cutoff = now - 7 * 24 * 60 * 60 * 1000; // only look at last 7 days

  // Accumulated decayed fatigue per muscle, keyed by the LOWERCASE muscle name
  // (e.g. "mid/low chest", "front delt", "triceps") — this is the exact key the
  // MuscleModel SVG reads via GROUP_TO_MUSCLE[name].toLowerCase(). Keying by the
  // broad category ("chest", "shoulders") broke every lookup and made the whole
  // map default to "fresh".
  const fatigue = {};

  // Apply a decayed fatigue load to a muscle, keyed by its lowercased name.
  // Half-life comes from the muscle's broad category (chest/triceps/shoulders…).
  const applyFatigue = (muscleName, load, hoursAgo) => {
    if (!muscleName || !load) return;
    const key = muscleName.toLowerCase();
    const category = getMuscleCategory(muscleName);
    const halfLife = HALF_LIVES[category] || 48;
    // Exponential decay: remaining = initial × e^(-ln2 × t / halfLife)
    const decayFactor = Math.exp((-0.693 * hoursAgo) / halfLife);
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