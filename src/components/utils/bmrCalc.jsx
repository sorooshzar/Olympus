// BMR (Mifflin-St Jeor) and TDEE calculation utilities + activity level metadata.
// Activity level ids match the User entity's activity_level enum.

export const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary (1.2)", desc: "little or no exercise", factor: 1.2 },
  { id: "lightly_active", label: "Lightly Active (1.375)", desc: "light exercise 1-3 days/week", factor: 1.375 },
  { id: "moderately_active", label: "Moderately Active (1.55)", desc: "moderate exercise 3-5 days/week", factor: 1.55 },
  { id: "very_active", label: "Very Active (1.725)", desc: "hard exercise 6-7 days/week", factor: 1.725 },
  { id: "athlete", label: "Extra Active (1.9)", desc: "very hard exercise + physical job", factor: 1.9 },
];

export function activityFactor(level) {
  return ACTIVITY_LEVELS.find(a => a.id === level)?.factor ?? 1.2;
}

// Mifflin-St Jeor: Men = 10*kg + 6.25*cm - 5*age + 5; Women = ... - 161
export function calcBMR({ weightKg, heightCm, age, sex }) {
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "female" ? base - 161 : base + 5);
}

export function calcTDEE(bmr, activityLevel) {
  if (!bmr) return null;
  return Math.round(bmr * activityFactor(activityLevel));
}