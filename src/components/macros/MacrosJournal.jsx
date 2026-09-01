import React from "react";
import { Plus, Trash2, Utensils } from "lucide-react";
import WaterTracker from "./WaterTracker";
import { getFoodIcon } from "./foodIcons";

const PROTEIN_COLOR = "#FF0055";
const CARBS_COLOR = "#00AAFF";
const FAT_COLOR = "#00CC66";
const KCAL_COLOR = "#FFD700";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function DailyMacroBar({ label, value, goal, color }) {
  const pct = Math.min((value / (goal || 1)) * 100, 100);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-bold w-3" style={{ color }}>{label[0]}</span>
      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] text-muted-foreground w-8 text-right">{Math.round(value)}</span>
    </div>
  );
}

function MealSection({ meal, entries, macroGoals, onAdd, onDelete, onEditEntry }) {
  const totals = entries.reduce(
    (acc, e) => ({
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
      calories: acc.calories + (e.calories || 0),
    }),
    { protein: 0, carbs: 0, fat: 0, calories: 0 }
  );

  const calPct = Math.min((totals.calories / (macroGoals.calories || 1)) * 100, 100);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Meal header: [Name] [P F C macros] [🔥cal] [yellow bar →] [+] */}
      <div className="flex items-center px-3 py-2 border-b border-border/40 gap-1.5">
        {/* Meal name */}
        <span className="text-xs font-bold capitalize shrink-0 w-16">{meal}</span>

        {/* P F C numbers */}
        <span className="text-[10px] font-bold shrink-0" style={{ color: PROTEIN_COLOR }}>P{Math.round(totals.protein)}</span>
        <span className="text-[10px] font-bold shrink-0" style={{ color: FAT_COLOR }}>F{Math.round(totals.fat)}</span>
        <span className="text-[10px] font-bold shrink-0" style={{ color: CARBS_COLOR }}>C{Math.round(totals.carbs)}</span>

        {/* Calorie number */}
        <span className="text-[10px] font-bold shrink-0" style={{ color: KCAL_COLOR }}>🔥{Math.round(totals.calories)}</span>

        {/* Yellow calorie bar — stretches to fill remaining space */}
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden mx-1">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${calPct}%`, backgroundColor: KCAL_COLOR }} />
        </div>

        {/* Add button */}
        <button
          onClick={onAdd}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${KCAL_COLOR}33` }}
        >
          <Plus className="w-3 h-3" style={{ color: KCAL_COLOR }} />
        </button>
      </div>

      {/* Food entries */}
      {entries.length > 0 && (
        <div className="divide-y divide-border/30">
          {entries.map(entry => (
            <button
              key={entry.id}
              onClick={() => onEditEntry(entry)}
              className="w-full flex items-center px-3 py-2 gap-2 hover:bg-secondary/30 text-left transition-colors"
            >
              <span className="text-base shrink-0">{getFoodIcon(entry.food_name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{entry.food_name}</p>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">{entry.quantity}{entry.unit}</span>
                  <span className="text-[9px] text-muted-foreground">›</span>
                  <span className="text-[10px] font-bold" style={{ color: PROTEIN_COLOR }}>P{Math.round(entry.protein || 0)}</span>
                  <span className="text-[10px] font-bold" style={{ color: CARBS_COLOR }}>C{Math.round(entry.carbs || 0)}</span>
                  <span className="text-[10px] font-bold" style={{ color: FAT_COLOR }}>F{Math.round(entry.fat || 0)}</span>
                </div>
              </div>
              <span className="text-xs font-bold shrink-0" style={{ color: KCAL_COLOR }}>
                🔥{Math.round(entry.calories || 0)}
              </span>
              <button
                onClick={e => { e.stopPropagation(); onDelete(entry.id); }}
                className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MacrosJournal({ date, entries, macroGoals, onAddToMeal, onDeleteEntry, onEditEntry, dailyTotals }) {
  const totals = dailyTotals || { protein: 0, carbs: 0, fat: 0, calories: 0 };

  return (
    <div className="space-y-3">
      {/* Top daily macro summary bars */}
      <div className="bg-card rounded-xl border border-border px-3 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-muted-foreground font-semibold">Daily Progress</span>
          <span className="text-[10px] font-bold" style={{ color: KCAL_COLOR }}>🔥{Math.round(totals.calories)} / {macroGoals.calories}</span>
        </div>
        <DailyMacroBar label="Protein" value={totals.protein} goal={macroGoals.protein} color={PROTEIN_COLOR} />
        <DailyMacroBar label="Carbs" value={totals.carbs} goal={macroGoals.carbs} color={CARBS_COLOR} />
        <DailyMacroBar label="Fat" value={totals.fat} goal={macroGoals.fat} color={FAT_COLOR} />
      </div>

      {/* Water tracker */}
      <div className="bg-card rounded-xl border border-border px-3 py-1">
        <WaterTracker date={date} />
      </div>

      {entries.length === 0 && (
        <div className="text-center py-10">
          <Utensils className="w-10 h-10 text-muted-foreground/25 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No meals logged today</p>
        </div>
      )}

      {/* Meal sections */}
      {MEAL_TYPES.map(meal => (
        <MealSection
          key={meal}
          meal={meal}
          entries={entries.filter(e => e.meal_type === meal)}
          macroGoals={macroGoals}
          onAdd={() => onAddToMeal(meal)}
          onDelete={onDeleteEntry}
          onEditEntry={onEditEntry}
        />
      ))}
    </div>
  );
}