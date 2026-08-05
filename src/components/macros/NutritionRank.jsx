import React from "react";
import InfoButton from "@/components/info/InfoButton";

// 10 Level Nutrition Rank System — streak-based
export const NUTRITION_LEVELS = [
  {
    level: 1,
    name: "Nutrition Newbie",
    emoji: "🟫",
    color: "#6B4226",
    bgColor: "#6B422622",
    borderColor: "#6B422655",
    minDays: 0,
    maxDays: 1,
  },
  {
    level: 2,
    name: "Snack Specialist",
    emoji: "🍿",
    color: "#A0522D",
    bgColor: "#A0522D22",
    borderColor: "#A0522D55",
    minDays: 2,
    maxDays: 3,
  },
  {
    level: 3,
    name: "Calorie Counter",
    emoji: "🔢",
    color: "#CD7F32",
    bgColor: "#CD7F3222",
    borderColor: "#CD7F3255",
    minDays: 4,
    maxDays: 7,
  },
  {
    level: 4,
    name: "Macro Monster",
    emoji: "💪",
    color: "#B8860B",
    bgColor: "#B8860B22",
    borderColor: "#B8860B55",
    minDays: 8,
    maxDays: 14,
  },
  {
    level: 5,
    name: "Fuel Fanatic",
    emoji: "⚡",
    color: "#DAA520",
    bgColor: "#DAA52022",
    borderColor: "#DAA52055",
    minDays: 15,
    maxDays: 20,
  },
  {
    level: 6,
    name: "Elite Eater",
    emoji: "🏆",
    color: "#C0C0C0",
    bgColor: "#C0C0C022",
    borderColor: "#C0C0C055",
    minDays: 21,
    maxDays: 30,
  },
  {
    level: 7,
    name: "Nutrient Ninja",
    emoji: "🥷",
    color: "#4FC3F7",
    bgColor: "#4FC3F722",
    borderColor: "#4FC3F755",
    minDays: 31,
    maxDays: 40,
  },
  {
    level: 8,
    name: "Macro Maestro",
    emoji: "🎯",
    color: "#9B59B6",
    bgColor: "#9B59B622",
    borderColor: "#9B59B655",
    minDays: 41,
    maxDays: 50,
  },
  {
    level: 9,
    name: "Dietary Deity",
    emoji: "🌟",
    color: "#E74C3C",
    bgColor: "#E74C3C22",
    borderColor: "#E74C3C55",
    minDays: 51,
    maxDays: 60,
  },
  {
    level: 10,
    name: "Obsidian Olympian",
    emoji: "🖤",
    color: "#B39DDB",
    bgColor: "#1A1A2E",
    borderColor: "#B39DDB88",
    minDays: 61,
    maxDays: Infinity,
  },
];

// Compute streak from macro entries and water logs
// allMacroEntries: array of MacroEntry records (with .date field)
// allWaterLogs: array of WaterLog records (with .date field)
// A day "counts" if at least 2 items logged (food entries + water entries >= 2)
export function computeNutritionStreak(allMacroEntries, allWaterLogs) {
  // Group by date
  const macroByDate = {};
  (allMacroEntries || []).forEach(e => {
    if (!macroByDate[e.date]) macroByDate[e.date] = 0;
    macroByDate[e.date]++;
  });

  const waterByDate = {};
  (allWaterLogs || []).forEach(w => {
    if (!waterByDate[w.date]) waterByDate[w.date] = 0;
    waterByDate[w.date]++;
  });

  // Count backwards from yesterday/today to find streak
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const macroCount = macroByDate[dateStr] || 0;
    const waterCount = waterByDate[dateStr] || 0;
    const totalItems = macroCount + waterCount;

    if (totalItems >= 2) {
      streak++;
    } else {
      // If today has nothing yet, allow streak to continue from yesterday
      if (i === 0) continue;
      break;
    }
  }

  return streak;
}

// Get level data from streak
export function getNutritionLevelFromStreak(streak) {
  for (let i = NUTRITION_LEVELS.length - 1; i >= 0; i--) {
    if (streak >= NUTRITION_LEVELS[i].minDays) {
      return NUTRITION_LEVELS[i];
    }
  }
  return NUTRITION_LEVELS[0];
}

// Badge SVG component — medal-style with level number
export function NutritionBadge({ levelData, size = "md" }) {
  const sizes = {
    sm: { outer: 36, inner: 26, fontSize: 10, numSize: 8 },
    md: { outer: 56, inner: 42, fontSize: 14, numSize: 10 },
    lg: { outer: 72, inner: 54, fontSize: 18, numSize: 12 },
  };
  const s = sizes[size] || sizes.md;
  const isObsidian = levelData.level === 10;

  return (
    <div
      className="flex items-center justify-center rounded-full relative"
      style={{
        width: s.outer,
        height: s.outer,
        background: isObsidian
          ? "radial-gradient(circle, #2D1B69, #1A1A2E)"
          : `radial-gradient(circle, ${levelData.color}33, ${levelData.color}11)`,
        border: `2px solid ${levelData.color}88`,
        boxShadow: isObsidian
          ? `0 0 12px ${levelData.color}66, 0 0 4px ${levelData.color}44`
          : `0 0 8px ${levelData.color}44`,
      }}
    >
      <div
        className="flex flex-col items-center justify-center rounded-full"
        style={{
          width: s.inner,
          height: s.inner,
          background: isObsidian ? "#0D0D1A" : `${levelData.color}22`,
          border: `1px solid ${levelData.color}55`,
        }}
      >
        <span style={{ fontSize: s.fontSize, lineHeight: 1 }}>{levelData.emoji}</span>
        <span
          className="font-black leading-none"
          style={{ fontSize: s.numSize, color: levelData.color }}
        >
          {levelData.level}
        </span>
      </div>
    </div>
  );
}

// Full card component — now takes streak directly
export default function NutritionRankCard({ streak = 0 }) {
  const levelData = getNutritionLevelFromStreak(streak);
  const isObsidian = levelData.level === 10;
  const nextLevel = NUTRITION_LEVELS[levelData.level]; // undefined if level 10

  // Days until next level
  const daysUntilNext = nextLevel ? nextLevel.minDays - streak : 0;

  // Progress within current level
  const levelRange = levelData.maxDays === Infinity ? 10 : (levelData.maxDays - levelData.minDays + 1);
  const daysIntoLevel = streak - levelData.minDays;
  const progress = Math.min(daysIntoLevel / levelRange, 1);

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: isObsidian
          ? "radial-gradient(ellipse at top, #1A1A2E, hsl(var(--card)))"
          : `linear-gradient(135deg, ${levelData.color}08, hsl(var(--card)))`,
        borderColor: `${levelData.color}44`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Nutrition Rank</p>
        <InfoButton
          title="Nutrition Ranks"
          body={[
            "Nutrition ranks measure how consistently you hit your macro targets. Each day you log your food, Olympus checks how close you came to your calorie, protein, carb, and fat goals.",
            "Your rank improves as you build consistent tracking streaks and stay within your target ranges. Hitting your macros within ±10% of your daily goal counts as a successful day.",
            "Ranks progress from Bronze to Olympian — the higher your consistency, the higher your rank. Missing days or straying far from your targets will slow your progress.",
            "Track your food daily and stay close to your targets to climb the nutrition ranks.",
          ]}
        />
      </div>

      <div className="flex items-center gap-4">
        <NutritionBadge levelData={levelData} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: levelData.color }}
            >
              Level {levelData.level}
            </span>
          </div>
          <p className="text-base font-black leading-tight" style={{ color: isObsidian ? levelData.color : "inherit" }}>
            {levelData.name}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            🔥 <span className="font-bold text-foreground">{streak}</span> day streak
          </p>
        </div>
      </div>

      {/* Progress bar toward next level */}
      <div className="mt-3">
        <div className="flex justify-between mb-1">
          {nextLevel ? (
            <>
              <span className="text-[9px] text-muted-foreground">Progress to Level {levelData.level + 1}</span>
              <span className="text-[9px] font-semibold" style={{ color: levelData.color }}>
                {daysUntilNext} more {daysUntilNext === 1 ? "day" : "days"} needed
              </span>
            </>
          ) : (
            <>
              <span className="text-[9px] text-muted-foreground">Max level reached</span>
              <span className="text-[9px] font-semibold" style={{ color: levelData.color }}>🏆 Legendary</span>
            </>
          )}
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${isObsidian ? 100 : progress * 100}%`,
              backgroundColor: levelData.color,
            }}
          />
        </div>
      </div>


    </div>
  );
}