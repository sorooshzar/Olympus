// Mapping of primary muscle (canonical name) -> valid movement patterns.
// Canonical names match getAllSubSections() so they stay consistent with the
// muscle model / recovery engine. "Mid Back" is displayed with a clarifying
// parenthetical but stored as "Mid Back".
export const MUSCLE_MOVEMENT_PATTERNS = {
  "Upper Chest": ["Incline Press", "Incline Fly"],
  "Mid/Low Chest": ["Flat Press", "Decline Press", "Flat/Mid Fly", "Decline/Low Fly", "Chest Dip"],
  "Lats": ["Frontal Pull", "Transverse Pull", "Sagittal Pull"],
  "Traps": ["Shrug", "Upright Row", "Loaded Carry"],
  "Mid Back": ["Transverse Pull", "Reverse Fly", "Face Pull"],
  "Erectors": ["Hip Hinge", "Back Extension", "Anti-Flexion"],
  "Front Delt": ["Overhead Press", "Front Raise"],
  "Side Delt": ["Lateral Raise", "Upright Row"],
  "Rear Delt": ["Reverse Fly", "Face Pull", "Rear Delt Row"],
  "Biceps": ["Curl", "Lengthened Curl", "Shortened Curl"],
  "Triceps": ["Extension", "Overhead Extension", "Tricep Press"],
  "Quads": ["Leg Press/Squat", "Leg Extension"],
  "Hamstrings": ["Leg Curl", "Hip Hinge", "Nordic Curl"],
  "Glutes": ["Hip Thrust", "Hip Hinge", "Squat / Lunge", "Glute Kickback"],
  "Adductors": ["Hip Adduction"],
  "Abductors": ["Hip Abduction"],
  "Calves": ["Calf Raise", "Calf Press"],
  "Abs": ["Flexion", "Leg / Knee Raise", "Anti-Extension"],
  "Obliques": ["Rotation / Twist", "Side Bend", "Anti-Rotation", "Anti-Lateral Flexion"],
  "Wrist Flexor": ["Wrist Flexion", "Grip Strength"],
  "Wrist Extensor": ["Reverse Wrist Curl"],
  "Brachioradialis": ["Hammer Curl", "Reverse Curl"],
  "Neck": ["Neck Flexion", "Neck Extension", "Lateral Neck Flexion"],
};

export const getPatternsForMuscle = (muscle) => MUSCLE_MOVEMENT_PATTERNS[muscle] || [];

// Muscles that support movement patterns, in the order specified.
export const PATTERN_MUSCLES = Object.keys(MUSCLE_MOVEMENT_PATTERNS);

export const getMuscleDisplayLabel = (muscle) =>
  muscle === "Mid Back" ? "Mid Back (rhomboids, mid traps)" : muscle;

export const buildVariationName = (primaryMuscle, movementPattern) =>
  `${primaryMuscle} - ${movementPattern} Variation`;