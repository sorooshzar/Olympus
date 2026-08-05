import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { userStorage } from "@/components/utils/userStorage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Calculator } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MacrosDashboard from "../components/macros/MacrosDashboard";
import MacrosJournal from "../components/macros/MacrosJournal";
import MacrosFoods from "../components/macros/MacrosFoods";
import FoodDetailModal from "../components/macros/FoodDetailModal";
import PullToRefresh from "../components/mobile/PullToRefresh";

// Mini calendar popover
function MiniCalendar({ date, onSelect, onClose }) {
  const [viewDate, setViewDate] = React.useState(new Date(date + "T12:00:00"));
  const today = new Date();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-xl p-4 w-72"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-secondary">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-sm font-bold">{format(viewDate, "MMMM yyyy")}</p>
          <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-secondary">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <p key={i} className="text-[10px] text-muted-foreground font-semibold py-1">{d}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const cellDate = format(new Date(year, month, d), "yyyy-MM-dd");
            const isSelected = cellDate === date;
            const isToday = cellDate === format(today, "yyyy-MM-dd");
            return (
              <button
                key={i}
                onClick={() => { onSelect(cellDate); onClose(); }}
                className={`h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isSelected ? "bg-primary text-primary-foreground" :
                  isToday ? "border border-primary text-primary" :
                  "hover:bg-secondary"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// NOTE: daily_calories saved on the user already reflects the onboarding goal deficit/surplus.
// applyGoalAdjustment is intentionally a no-op here — the single source of truth is daily_calories.
// The Goal Weight panel in Profile/Measurements can update daily_calories directly when the user
// changes their goal, preventing any double-counting.
function applyGoalAdjustment(baseCal, baseProtein, baseCarbs, baseFat, _user) {
  return { calories: baseCal, protein: baseProtein, carbs: baseCarbs, fat: baseFat };
}

function useMacroGoals() {
  const [goals, setGoals] = React.useState({ calories: 2000, protein: 150, carbs: 200, fat: 65 });

  const recalculate = React.useCallback(() => {
    base44.auth.me().then(user => {
      let base = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

      if (user?.daily_calories) {
        base = {
          calories: user.daily_calories,
          protein: user.daily_protein || 150,
          carbs: user.daily_carbs || 200,
          fat: user.daily_fat || 65,
        };
      } else {
        const cal = parseInt(userStorage.getItem("gym-macro-calories"));
        if (cal) base = {
          calories: cal,
          protein: parseInt(userStorage.getItem("gym-macro-protein")) || 150,
          carbs: parseInt(userStorage.getItem("gym-macro-carbs")) || 200,
          fat: parseInt(userStorage.getItem("gym-macro-fat")) || 65,
        };
      }

      setGoals(applyGoalAdjustment(base.calories, base.protein, base.carbs, base.fat, user));
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    recalculate();
    // Re-fetch goals when Settings saves new macros
    const handler = (e) => {
      if (e.detail) {
        setGoals({ calories: e.detail.calories, protein: e.detail.protein, carbs: e.detail.carbs, fat: e.detail.fat });
      }
    };
    window.addEventListener("macroGoalsChanged", handler);
    return () => window.removeEventListener("macroGoalsChanged", handler);
  }, [recalculate]);

  return goals;
}

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "journal", label: "Journal" },
  { id: "foods", label: "Foods" },
];

export default function Macros() {
  const macroGoals = useMacroGoals();
  const urlParams = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(urlParams.get("tab") || "dashboard");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showCalendar, setShowCalendar] = useState(false);
  const [addingMeal, setAddingMeal] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null); // {entry, food}
  const queryClient = useQueryClient();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isCurrentDay = date === todayStr;
  const dateObj = new Date(date + "T12:00:00");

  const goBack = () => setDate(format(subDays(dateObj, 1), "yyyy-MM-dd"));
  const goForward = () => setDate(format(addDays(dateObj, 1), "yyyy-MM-dd"));

  const displayLabel = isCurrentDay ? "Today" : format(dateObj, "MMM d");

  const { data: entries = [] } = useQuery({
    queryKey: ["macroEntries", date],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.MacroEntry.filter({ date, created_by: user.email }, "-created_date", 100);
    },
  });

  const dailyTotals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleAddEntry = async (data) => {
    await base44.entities.MacroEntry.create(data);
    queryClient.invalidateQueries({ queryKey: ["macroEntries", date] });
  };

  const handleUpdateEntry = async (id, data) => {
    await base44.entities.MacroEntry.update(id, data);
    queryClient.invalidateQueries({ queryKey: ["macroEntries", date] });
  };

  const handleDelete = async (id) => {
    await base44.entities.MacroEntry.delete(id);
    queryClient.invalidateQueries({ queryKey: ["macroEntries", date] });
  };

  const handleAddToMeal = (meal) => {
    setAddingMeal(meal);
    setTab("foods");
  };

  // When user clicks a logged food entry — open FoodDetailModal in edit mode
  const handleEditEntry = (entry) => {
    // We need the food object to compute macros. Build it from per-100g stored on entry
    const impliedFood = {
      id: entry.food_id,
      name: entry.food_name,
      calories_per_100g: entry.quantity > 0 ? (entry.calories / entry.quantity) * 100 : 0,
      protein_per_100g: entry.quantity > 0 ? (entry.protein / entry.quantity) * 100 : 0,
      carbs_per_100g: entry.quantity > 0 ? (entry.carbs / entry.quantity) * 100 : 0,
      fat_per_100g: entry.quantity > 0 ? (entry.fat / entry.quantity) * 100 : 0,
      serving_size: entry.quantity,
    };
    setEditingEntry({ entry, food: impliedFood });
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["macroEntries", date] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-lg mx-auto px-4 pb-4">
      {/* Sticky Header with safe area */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl -mx-4 px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-2 border-b border-border/20">
      {/* Header row: Title + date picker */}
      <div className="flex items-center justify-between mb-2.5">
        <h1 className="text-xl font-bold tracking-tight">Macros</h1>

        <div className="flex items-center gap-1.5">
          {/* Compact date navigator */}
          <div className="flex items-center gap-0.5 bg-secondary/70 rounded-xl px-1 py-0.5">
            <button
              onClick={goBack}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowCalendar(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
            >
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-semibold">{displayLabel}</span>
            </button>
            <button
              onClick={goForward}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {/* Calculator shortcut — opens directly to Unit tab */}
          <Link to={createPageUrl("Calculator?tab=Unit&from=Macros")}>
            <button className="w-9 h-9 flex items-center justify-center bg-secondary/70 rounded-xl hover:bg-secondary transition-colors">
              <Calculator className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </div>

      {/* Tab bar — iOS segmented control style */}
      <div className="flex bg-secondary/80 rounded-xl p-0.5 mb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded-[10px] text-xs font-semibold transition-all duration-200 ${
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
          ))}
          </div>
          </div>

          {tab === "dashboard" && (
        <MacrosDashboard date={date} macroGoals={macroGoals} />
      )}

      {tab === "journal" && (
        <MacrosJournal
          date={date}
          entries={entries}
          macroGoals={macroGoals}
          dailyTotals={dailyTotals}
          onAddToMeal={handleAddToMeal}
          onDeleteEntry={handleDelete}
          onDateChange={setDate}
          onEditEntry={handleEditEntry}
        />
      )}

      {tab === "foods" && (
        <MacrosFoods
          macroGoals={macroGoals}
          dailyTotals={dailyTotals}
          date={date}
          addingMeal={addingMeal}
          onAdd={handleAddEntry}
          onClearMeal={() => setAddingMeal(null)}
        />
      )}



      {/* Mini calendar */}
      {showCalendar && (
        <MiniCalendar
          date={date}
          onSelect={setDate}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Edit logged food */}
      {editingEntry && (
        <FoodDetailModal
          food={editingEntry.food}
          macroGoals={macroGoals}
          dailyTotals={dailyTotals}
          mealType={editingEntry.entry.meal_type}
          date={date}
          editEntryId={editingEntry.entry.id}
          initialQty={editingEntry.entry.quantity}
          onClose={() => setEditingEntry(null)}
          onUpdate={async (id, data) => {
            await handleUpdateEntry(id, data);
            setEditingEntry(null);
          }}
          onAdd={null}
        />
        )}
        </div>
        </PullToRefresh>
        );
        }