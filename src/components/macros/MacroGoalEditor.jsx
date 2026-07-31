import React, { useState } from "react";
import { Check } from "lucide-react";

const MACROS = [
  { key: "protein", label: "Protein", color: "#60a5fa" },
  { key: "carbs",   label: "Carbs",   color: "#fbbf24" },
  { key: "fat",     label: "Fat",     color: "#f472b6" },
];

const toNum = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; };
const totalCalFromGrams = (g) => g.protein * 4 + g.carbs * 4 + g.fat * 9;

// Rule A & C: grams from a calorie target + percentage ratio
const gramsFromCalPcts = (cal, pcts) => ({
  protein: Math.round((cal * pcts.protein / 100) / 4),
  carbs:   Math.round((cal * pcts.carbs / 100) / 4),
  fat:     Math.round((cal * pcts.fat / 100) / 9),
});

// Fix 1: largest remainder method — derived percentages always sum to exactly 100
const pctsFromGramsLR = (g, cal) => {
  if (!cal || cal <= 0 || !Number.isFinite(cal)) return { protein: 0, carbs: 0, fat: 0 };
  const keys = ["protein", "carbs", "fat"];
  const calsPerG = { protein: 4, carbs: 4, fat: 9 };
  const floors = {}; const rems = {};
  let sumFloors = 0;
  keys.forEach(k => {
    const raw = (g[k] * calsPerG[k] / cal) * 100;
    floors[k] = Math.floor(raw);
    rems[k] = raw - floors[k];
    sumFloors += floors[k];
  });
  let toDistribute = 100 - sumFloors;
  // highest remainder first; alphabetical tie-break
  const sorted = keys.slice().sort((a, b) => rems[b] - rems[a] || a.localeCompare(b));
  let i = 0;
  while (toDistribute > 0) { floors[sorted[i % 3]] += 1; toDistribute -= 1; i += 1; }
  return { protein: floors.protein, carbs: floors.carbs, fat: floors.fat };
};

export default function MacroGoalEditor({
  initial,
  onSave,
  onCancel,
  saveLabel = "Save Macro Goals",
  showCancel = true,
}) {
  const initGrams = { protein: initial.protein || 0, carbs: initial.carbs || 0, fat: initial.fat || 0 };
  const initCal = initial.calories && initial.calories > 0 ? initial.calories : totalCalFromGrams(initGrams);

  // Three independent states, kept in sync per the rules below
  const [grams, setGrams] = useState(initGrams);
  const [pcts, setPcts] = useState(pctsFromGramsLR(initGrams, initCal));
  const [calories, setCalories] = useState(initCal);
  const [calorieInput, setCalorieInput] = useState(String(initCal)); // text in the calorie field
  const [mode, setMode] = useState("grams");

  const totalPct = pcts.protein + pcts.carbs + pcts.fat;
  const pctOk = totalPct === 100;
  const canSave = calories >= 1000 && (mode === "grams" || pctOk);

  // Rule A — calories change (both modes): keep percentages, recalc grams, calories = what user typed
  const onCalorieChange = (raw) => {
    setCalorieInput(raw);
    const basis = toNum(raw);
    if (!Number.isFinite(basis) || basis <= 0) return; // 0 / empty / NaN → freeze, do nothing
    setCalories(basis);
    setGrams(gramsFromCalPcts(basis, pcts)); // pcts unchanged
  };
  const onCalorieBlur = (e) => {
    const basis = toNum(e.target.value);
    if (!Number.isFinite(basis) || basis <= 0) setCalorieInput(String(calories)); // revert to committed value
  };

  // Rule B — grams change (Grams mode): recalc calories + percentages (largest remainder)
  const onGramChange = (key, raw) => {
    const v = Math.max(0, parseInt(raw) || 0);
    const ng = { ...grams, [key]: v };
    const nc = totalCalFromGrams(ng);
    setGrams(ng);
    setCalories(nc);
    setPcts(pctsFromGramsLR(ng, nc));
    setCalorieInput(String(nc));
  };

  // Rule C — percentages change (Percentages mode): keep calories, recalc grams
  const onPctChange = (key, raw) => {
    const v = Math.max(0, parseInt(raw) || 0);
    const newPcts = { ...pcts, [key]: v };
    setPcts(newPcts);
    setGrams(gramsFromCalPcts(calories, newPcts)); // calories unchanged
  };

  const switchMode = (newMode) => {
    if (newMode === mode) return;
    if (newMode === "percentages") setPcts(pctsFromGramsLR(grams, calories));
    setMode(newMode);
  };

  const handleSave = async () => {
    if (calories < 1000) return;
    if (mode === "percentages" && !pctOk) return;
    await onSave({ calories, protein: grams.protein, carbs: grams.carbs, fat: grams.fat });
  };

  const editableValues = mode === "grams" ? grams : pcts;
  const readOnlyValues = mode === "grams" ? pcts : grams;
  const readOnlySuffix = mode === "grams" ? "%" : "g";
  const readOnlyLabel  = mode === "grams" ? "of calories" : "in grams";
  const inputSuffix   = mode === "grams" ? "g" : "%";

  return (
    <div className="space-y-4">
      {/* Daily calorie target — editable in both modes */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Daily Calorie Target</p>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={calorieInput}
            onFocus={e => e.target.select()}
            onChange={e => onCalorieChange(e.target.value)}
            onBlur={onCalorieBlur}
            className="w-full text-center text-2xl font-black bg-secondary border-0 rounded-xl py-3 pr-14 focus:outline-none focus:ring-2 focus:ring-primary/50 no-spinner"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">cal</span>
        </div>
        {calories < 1000 && (
          <p className="text-[11px] text-red-500 mt-1.5 text-center">Daily calorie target should be at least 1000</p>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex bg-secondary rounded-xl p-1">
        {["grams", "percentages"].map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {m === "grams" ? "Grams" : "Percentages"}
          </button>
        ))}
      </div>

      {/* Macro rows */}
      <div className="space-y-2">
        {MACROS.map(m => (
          <div key={m.key} className="bg-secondary/50 rounded-xl p-3" style={{ borderLeft: `3px solid ${m.color}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold" style={{ color: m.color }}>{m.label}</p>
              {mode === "percentages" && (
                <span className="text-[11px] font-semibold text-muted-foreground">{pcts[m.key]}%</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={editableValues[m.key]}
                  onFocus={e => e.target.select()}
                  onChange={e => (mode === "grams"
                    ? onGramChange(m.key, e.target.value)
                    : onPctChange(m.key, e.target.value))}
                  className="w-full text-center text-lg font-black bg-card border-0 rounded-lg py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-primary/50 no-spinner"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  {inputSuffix}
                </span>
              </div>
              <div className="w-24 text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">
                  {readOnlyLabel}
                </p>
                <p className="text-base font-bold leading-tight">
                  {readOnlyValues[m.key]}{readOnlySuffix}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Percentages mode total */}
      {mode === "percentages" && (
        <div>
          <div className={`rounded-xl px-4 py-2.5 text-center text-sm font-bold ${pctOk ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
            Total: {totalPct}%
          </div>
          {!pctOk && (
            <p className="text-[11px] text-center text-muted-foreground mt-1.5">Percentages must total 100% to save</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {showCancel && onCancel && (
          <button onClick={onCancel} className="flex-1 h-12 rounded-2xl bg-secondary font-semibold text-sm">
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          {saveLabel}
        </button>
      </div>
    </div>
  );
}