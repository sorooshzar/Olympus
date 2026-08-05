// Master vocabulary of movement_pattern values, grouped by category for the
// variation-creation dropdown. These strings MUST exactly match the
// movement_pattern field stored on Exercise records — the variation exercise
// picker matches on this field with strict string equality, so a mismatch here
// means no exercises ever appear for the variation.
export const MOVEMENT_PATTERNS_BY_CATEGORY = {
  Pressing: ["Horizontal Press", "Incline Press", "Decline Press", "Overhead Press"],
  Pulling: ["Vertical Pull", "Horizontal Pull", "Shoulder Extension"],
  "Fly / Isolation Chest": [
    "Shoulder Transverse Adduction",
    "Shoulder Transverse Abduction",
  ],
  Shoulder: ["Shoulder Abduction", "Shoulder Extension"],
  Arms: ["Elbow Flexion", "Elbow Extension"],
  Legs: [
    "Squat",
    "Lunge",
    "Hip Hinge",
    "Hip Extension",
    "Knee Extension",
    "Knee Flexion",
    "Hip Adduction",
    "Hip Abduction",
    "Plantar Flexion",
    "Dorsi Flexion",
  ],
  Core: [
    "Spinal Flexion",
    "Spinal Extension",
    "Spinal Lateral Flexion",
    "Spinal Rotation",
  ],
  "Neck / Forearms": [
    "Neck Flexion",
    "Neck Extension",
    "Neck Lateral Flexion",
    "Wrist Flexion",
    "Wrist Extension",
  ],
};

// Flat, de-duplicated list of every valid movement_pattern.
export const ALL_MOVEMENT_PATTERNS = [
  ...new Set(Object.values(MOVEMENT_PATTERNS_BY_CATEGORY).flat()),
];

// Muscles that support variation slots. Kept so the muscle selector stays
// stable and in a sensible order.
export const PATTERN_MUSCLES = [
  "Upper Chest",
  "Mid/Low Chest",
  "Lats",
  "Traps",
  "Mid Back",
  "Erectors",
  "Front Delt",
  "Side Delt",
  "Rear Delt",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Adductors",
  "Abductors",
  "Calves",
  "Abs",
  "Obliques",
  "Wrist Flexor",
  "Wrist Extensor",
  "Brachioradialis",
  "Neck",
];

// Deprecated: returns the full vocabulary. Per-muscle filtering is now done
// dynamically in AddVariationSheet by querying Exercise records, so the
// dropdown only offers patterns that actually have matching exercises.
export const getPatternsForMuscle = () => ALL_MOVEMENT_PATTERNS;

export const getMuscleDisplayLabel = (muscle) =>
  muscle === "Mid Back" ? "Mid Back (rhomboids, mid traps)" : muscle;

export const buildVariationName = (primaryMuscle, movementPattern) =>
  `${primaryMuscle} - ${movementPattern} Variation`;