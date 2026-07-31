import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MacroGoalEditor from "@/components/macros/MacroGoalEditor";

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

const GOAL_ADJUSTMENTS = {
  build_muscle: +300,
  improve_strength: +200,
  lose_fat: -400,
  maintain: 0,
  improve_endurance: -100,
  general_fitness: 0,
};

const TIMELINES = [
  { id: 4,  label: "4 weeks" },
  { id: 8,  label: "8 weeks" },
  { id: 12, label: "12 weeks" },
  { id: 16, label: "16 weeks" },
  { id: 24, label: "6 months" },
  { id: 52, label: "1 year" },
];

function calcBase(answers) {
  const { sex, age, height_cm, weight_kg, activity_level, goal } = answers;
  if (!sex || !age || !height_cm || !weight_kg) return null;
  const bmr = sex === "male"
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activity_level] || 1.375));
  const adjustment = GOAL_ADJUSTMENTS[goal] || 0;
  return { tdee, calories: tdee + adjustment };
}

function macrosFromCaloriesAndPcts(calories, pPct, cPct, fPct) {
  return {
    protein: Math.round((calories * pPct / 100) / 4),
    carbs: Math.round((calories * cPct / 100) / 4),
    fat: Math.round((calories * fPct / 100) / 9),
  };
}

export default function SlideMacros({ answers, updateMany, onNext }) {
  const [editing, setEditing] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const base = calcBase(answers);

  // Compute timeline-adjusted calories
  const getTimelineCalories = () => {
    if (!base || !answers.goal_weight_kg || !answers.weight_kg || !answers.goal_timeline_weeks) return null;
    const diffKg = answers.goal_weight_kg - answers.weight_kg;
    const days = answers.goal_timeline_weeks * 7;
    // 7700 kcal per kg
    const dailyAdjust = Math.round((diffKg * 7700) / days);
    return base.tdee + dailyAdjust;
  };

  const timelineCal = getTimelineCalories();
  const effectiveCalories = timelineCal || base?.calories;

  // Initialize answers.daily_calories on first render
  useEffect(() => {
    if (base && !answers.daily_calories && effectiveCalories) {
      const { protein, carbs, fat } = macrosFromCaloriesAndPcts(effectiveCalories, 30, 45, 25);
      updateMany({ daily_calories: effectiveCalories, daily_protein: protein, daily_carbs: carbs, daily_fat: fat });
    }
  }, []);

  if (answers.nutrition_tracking === "none") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center">
        <span className="text-6xl mb-6">🙅</span>
        <h2 className="text-2xl font-black mb-2">Skipping nutrition</h2>
        <p className="text-muted-foreground text-sm">You can always enable tracking later in settings.</p>
      </div>
    );
  }

  if (!base) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center">
        <span className="text-5xl mb-4">⚠️</span>
        <h2 className="text-xl font-bold mb-2">Missing info</h2>
        <p className="text-muted-foreground text-sm">Go back and fill in your age, height, and weight to calculate macros.</p>
      </div>
    );
  }

  const displayCal = answers.daily_calories || effectiveCalories;
  const displayP   = answers.daily_protein  || macrosFromCaloriesAndPcts(displayCal, 30, 45, 25).protein;
  const displayC   = answers.daily_carbs    || macrosFromCaloriesAndPcts(displayCal, 30, 45, 25).carbs;
  const displayF   = answers.daily_fat      || macrosFromCaloriesAndPcts(displayCal, 30, 45, 25).fat;

  const hasGoalWeight = !!(answers.goal_weight_kg && (answers.goal === "lose_fat" || answers.goal === "build_muscle"));

  const handleAccept = () => {
    if (!answers.daily_calories) {
      const { protein, carbs, fat } = macrosFromCaloriesAndPcts(effectiveCalories, 30, 45, 25);
      updateMany({ daily_calories: effectiveCalories, daily_protein: protein, daily_carbs: carbs, daily_fat: fat });
    }
    onNext?.();
  };

  const handleSaveCustom = ({ calories, protein, carbs, fat }) => {
    updateMany({ daily_calories: calories, daily_protein: protein, daily_carbs: carbs, daily_fat: fat });
    setEditing(false);
  };

  // Timeline advice
  const timelineAdvice = (() => {
    if (!hasGoalWeight || !answers.goal_timeline_weeks) return null;
    const diffKg = answers.goal_weight_kg - answers.weight_kg;
    const days = answers.goal_timeline_weeks * 7;
    const dailyAdjust = Math.round((diffKg * 7700) / days);
    const isImperial = answers.weight_unit === "lbs";
    const goalDisplay = isImperial
      ? `${(answers.goal_weight_kg * 2.20462).toFixed(1)} lbs`
      : `${answers.goal_weight_kg} kg`;
    return { dailyAdjust, direction: diffKg > 0 ? "surplus" : "deficit", goalDisplay, weeks: answers.goal_timeline_weeks };
  })();

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Step 8</p>
        <h2 className="text-3xl font-black mb-1">Your macro targets 🧮</h2>
        <p className="text-muted-foreground text-sm mb-1">Mifflin-St Jeor formula, adjusted for your goal.</p>
        <p className="text-xs text-muted-foreground mb-4">TDEE: <span className="font-semibold text-foreground">{base.tdee} kcal/day</span></p>
      </motion.div>

      {/* Timeline selector */}
      {hasGoalWeight && !editing && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <button
            onClick={() => setShowTimeline(v => !v)}
            className="w-full flex items-center justify-between bg-secondary rounded-2xl px-4 py-3 text-sm font-semibold"
          >
            <span>⏱ Goal timeline</span>
            <span className="text-primary text-xs">
              {answers.goal_timeline_weeks ? `${answers.goal_timeline_weeks} wks` : "Set timeline"} {showTimeline ? "▲" : "▼"}
            </span>
          </button>
          {showTimeline && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {TIMELINES.map(t => (
                <button key={t.id}
                  onClick={() => { updateMany({ goal_timeline_weeks: t.id }); setShowTimeline(false); }}
                  className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${answers.goal_timeline_weeks === t.id ? "bg-primary text-white" : "bg-secondary"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Timeline advice banner */}
      {timelineAdvice && !editing && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className={`mb-4 rounded-2xl px-4 py-3 border text-sm ${timelineAdvice.direction === "deficit" ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "bg-green-500/10 border-green-500/30 text-green-400"}`}>
          <p className="font-bold mb-0.5">{timelineAdvice.direction === "deficit" ? "🔥 Fat loss plan" : "💪 Muscle gain plan"}</p>
          <p className="text-xs opacity-90">
            To reach {timelineAdvice.goalDisplay} in {timelineAdvice.weeks} weeks: daily {timelineAdvice.direction} of <strong>{Math.abs(timelineAdvice.dailyAdjust)} kcal</strong>
          </p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {!editing ? (
          <motion.div key="display" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="bg-primary/10 rounded-3xl p-6 text-center border border-primary/20">
              <p className="text-5xl font-black text-primary">{displayCal}</p>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Daily Calories</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Protein", value: displayP, color: "#ef4444", emoji: "🥩" },
                { label: "Carbs",   value: displayC, color: "#eab308", emoji: "🍚" },
                { label: "Fat",     value: displayF, color: "#3b82f6", emoji: "🥑" },
              ].map(m => (
                <div key={m.label} className="rounded-2xl p-4 text-center" style={{ background: m.color + "18", border: `1px solid ${m.color}33` }}>
                  <p className="text-lg mb-1">{m.emoji}</p>
                  <p className="text-xl font-black" style={{ color: m.color }}>{m.value}g</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleAccept} className="flex-1 h-12 rounded-2xl bg-primary text-white font-bold">
                ✓ Accept
              </button>
              <button
                onClick={() => setEditing(true)}
                className="flex-1 h-12 rounded-2xl bg-secondary font-semibold text-sm"
              >
                ✏️ Customize
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <MacroGoalEditor
              initial={{ calories: displayCal, protein: displayP, carbs: displayC, fat: displayF }}
              onSave={handleSaveCustom}
              onCancel={() => setEditing(false)}
              saveLabel="Save Custom"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}