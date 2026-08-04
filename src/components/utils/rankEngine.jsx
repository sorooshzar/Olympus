export const RANKS = [
  { name: "wood",     label: "Wood",     color: "#8B4513", textColor: "#fff", description: "Just getting started. Every rep counts — your foundation is being laid." },
  { name: "bronze",   label: "Bronze",   color: "#CD7F32", textColor: "#fff", description: "Novice lifter. You're building the neuromuscular patterns that lead to real strength." },
  { name: "silver",   label: "Silver",   color: "#C0C0C0", textColor: "#222", description: "Intermediate. Consistent training is paying off — this muscle is responding to load." },
  { name: "gold",     label: "Gold",     color: "#FFD700", textColor: "#222", description: "Advanced. You're lifting more than most. This muscle is well-developed and strong." },
  { name: "emerald",  label: "Emerald",  color: "#50C878", textColor: "#fff", description: "Elite performance. You're in the top tier of dedicated gym-goers." },
  { name: "diamond",  label: "Diamond",  color: "#B9F2FF", textColor: "#222", description: "Top 5% of app users. Your strength here is exceptional and hard-earned." },
  { name: "champion", label: "Champion", color: "#FF6B35", textColor: "#fff", description: "Local legend territory. This muscle has been trained to a near-professional standard." },
  { name: "titan",    label: "Titan",    color: "#9B59B6", textColor: "#fff", description: "Mastery of the muscle. You're approaching the ceiling of natural human performance." },
  { name: "olympian", label: "Olympian", color: "#FF00FF", textColor: "#fff", description: "Human limit. Professional / world-class level. An extraordinary achievement." },
];

// Base e1RM/bodyweight thresholds for compound lifts.
// Index i = floor of RANKS[i]. Scale per muscle adjusts these for isolation lifts.
// CANONICAL — must match calculateRanks backend function exactly.
export const BASE_THRESHOLDS = [0.1, 0.4, 0.7, 1.1, 1.5, 2.0, 2.5, 3.0, 3.5, 99];

// Scale factor per muscle: 1.0 = big compound, lower = isolation
// CANONICAL — must match calculateRanks backend function exactly.
export const MUSCLE_SCALE = {
  "Quads":           1.0,
  "Hamstrings":      0.85,
  "Glutes":          0.9,
  "Erectors":        1.0,
  "Upper Chest":     0.75,
  "Mid/Low Chest":   0.8,
  "Lats":            0.7,
  "Mid Back":        0.8,
  "Traps":           0.7,
  "Rear Delt":       0.4,
  "Front Delt":      0.5,
  "Side Delt":       0.3,
  "Biceps":          0.45,
  "Triceps":         0.55,
  "Calves":          0.6,
  "Abs":             0.4,
  "Obliques":        0.35,
  "Adductors":       0.5,
  "Abductors":       0.45,
  "Wrist Flexor":    0.2,
  "Brachioradialis": 0.4,
};

export const MUSCLE_ANCHOR = {
  "Upper Chest":     "Incline Bench Press",
  "Mid/Low Chest":   "Bench Press",
  "Quads":           "Squat",
  "Hamstrings":      "Romanian Deadlift",
  "Glutes":          "Hip Thrust",
  "Lats":            "Lat Pulldown",
  "Mid Back":        "Barbell Row",
  "Traps":           "Barbell Shrug",
  "Rear Delt":       "Face Pull",
  "Front Delt":      "Overhead Press",
  "Side Delt":       "Lateral Raise",
  "Biceps":          "Barbell Curl",
  "Triceps":         "Tricep Pushdown",
  "Calves":          "Calf Raise",
  "Abs":             "Cable Crunch",
  "Erectors":        "Deadlift",
  "Obliques":        "Weighted Side Bend",
  "Adductors":       "Adductor Machine",
  "Abductors":       "Abductor Machine",
  "Wrist Flexor":    "Wrist Curl",
  "Brachioradialis": "Hammer Curl",
};

function getRankDetail(e1rmRatio, muscleName) {
  const scale = MUSCLE_SCALE[muscleName] || 0.7;
  const thresholds = BASE_THRESHOLDS.map(t => t * scale);

  let rankIndex = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (e1rmRatio >= thresholds[i]) rankIndex = i;
    else break;
  }

  const floor = thresholds[rankIndex];
  const ceiling = thresholds[rankIndex + 1] ?? floor + 1;
  const fraction = Math.min(Math.max((e1rmRatio - floor) / (ceiling - floor), 0), 1);

  // 3 levels: I (0–0.333), II (0.333–0.667), III (0.667–1)
  const level = fraction < 1 / 3 ? 1 : fraction < 2 / 3 ? 2 : 3;
  const levelFraction = (fraction - (level - 1) / 3) / (1 / 3);
  const levelProgress = Math.min(Math.max(levelFraction, 0), 1);

  const isAtTopLevel = rankIndex === RANKS.length - 1 && level === 3;
  const nextRankIndex = level === 3 ? rankIndex + 1 : rankIndex;
  const nextLevel = level === 3 ? 1 : level + 1;

  return {
    rank: RANKS[rankIndex],
    rankIndex,
    level,
    levelLabel: ["I", "II", "III"][level - 1],
    levelProgress,
    overallProgress: fraction,
    nextRank: isAtTopLevel ? null : RANKS[Math.min(nextRankIndex, RANKS.length - 1)],
    nextLevel,
    floor,
    ceiling,
  };
}

// Returns { [muscleName]: rankDetail + bestE1RM stats }
// Based on highest e1RM from working sets in the last 30 days, relative to bodyweight.
export function computeMuscleRanks(workoutLogs, bodyWeightKg) {
  if (!bodyWeightKg || bodyWeightKg <= 0) return {};

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const bestE1RM = {};

  workoutLogs.forEach(log => {
    const logTime = new Date(log.finished_at || log.started_at || log.created_date).getTime();
    if (logTime < cutoff) return;

    log.exercises?.forEach(ex => {
      const muscle = ex.muscle_group;
      if (!muscle) return;
      ex.sets?.forEach(s => {
        if (!s.completed || s.type === "warmup") return;
        if (!s.weight || !s.reps || s.reps < 1) return;
        const e1rm = s.weight * (1 + s.reps / 30); // Epley formula
        if (!bestE1RM[muscle] || e1rm > bestE1RM[muscle].value) {
          bestE1RM[muscle] = { value: e1rm, exerciseName: ex.exercise_name };
        }
      });
    });
  });

  const result = {};
  Object.keys(bestE1RM).forEach(muscle => {
    const ratio = bestE1RM[muscle].value / bodyWeightKg;
    result[muscle] = {
      ...getRankDetail(ratio, muscle),
      bestE1RM: bestE1RM[muscle].value,
      bestE1RMExercise: bestE1RM[muscle].exerciseName,
      e1rmRatio: ratio,
      anchor: MUSCLE_ANCHOR[muscle] || "Best Lift",
    };
  });

  return result;
}