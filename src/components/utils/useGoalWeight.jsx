import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { userStorage } from "@/components/utils/userStorage";

export const TIMELINE_OPTIONS = [4, 8, 12, 16, 24, 52];
export const weeksLabel = (w) => w >= 52 ? "1 year" : w >= 24 ? "6 months" : `${w} weeks`;

// Single source of truth for goal weight + timeline. Reads from the User entity
// (server-side, cross-device) and keeps a localStorage cache for instant UI.
// Both the Measurements page and the Profile stats page use this so edits sync.
export function useGoalWeight() {
  const [goalKg, setGoalKg] = useState(() => {
    const s = userStorage.getItem("gym-goal-weight");
    return s ? parseFloat(s) : null;
  });
  const [weeks, setWeeks] = useState(() => parseInt(userStorage.getItem("gym-goal-weeks") || "12"));

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.goal_weight_kg != null) {
        setGoalKg(u.goal_weight_kg);
        userStorage.setItem("gym-goal-weight", String(u.goal_weight_kg));
      }
      if (u?.goal_timeline_weeks != null) {
        setWeeks(u.goal_timeline_weeks);
        userStorage.setItem("gym-goal-weeks", String(u.goal_timeline_weeks));
      }
    }).catch(() => {});

    const handler = (e) => {
      const kg = e.detail?.goalWeightKg ?? (userStorage.getItem("gym-goal-weight") ? parseFloat(userStorage.getItem("gym-goal-weight")) : null);
      const w = e.detail?.weeks ?? parseInt(userStorage.getItem("gym-goal-weeks") || "12");
      setGoalKg(kg);
      setWeeks(w);
    };
    window.addEventListener("goalWeightChanged", handler);
    return () => window.removeEventListener("goalWeightChanged", handler);
  }, []);

  const saveGoal = (kg, w) => {
    setGoalKg(kg);
    setWeeks(w);
    if (kg != null) {
      userStorage.setItem("gym-goal-weight", String(kg));
      userStorage.setItem("gym-goal-weeks", String(w));
      base44.auth.updateMe({ goal_weight_kg: kg, goal_timeline_weeks: w }).catch(() => {});
    } else {
      userStorage.removeItem("gym-goal-weight");
      base44.auth.updateMe({ goal_weight_kg: null, goal_timeline_weeks: null }).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent("goalWeightChanged", { detail: { goalWeightKg: kg, weeks: w } }));
  };

  return { goalKg, weeks, saveGoal };
}