import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { userStorage } from "@/components/utils/userStorage";
import { applyTheme } from "@/components/profile/SettingsPanel";

export function useSettingsState() {
  const [user, setUser] = useState(null);

  const [darkMode, setDarkMode] = useState(true);
  const [theme, setTheme] = useState("default");

  const [weightUnit, setWeightUnit] = useState("kg");
  const [distanceUnit, setDistanceUnit] = useState("metric");
  const [weekStart, setWeekStart] = useState("monday");

  const [warmupRest, setWarmupRest] = useState(60);
  const [compoundRest, setCompoundRest] = useState(180);
  const [isolationRest, setIsolationRest] = useState(90);
  const [autoStartRest, setAutoStartRest] = useState(false);
  const [timerSound, setTimerSound] = useState(true);
  const [timerVibration, setTimerVibration] = useState(true);

  const [macroCalories, setMacroCalories] = useState(2000);
  const [macroProtein, setMacroProtein] = useState(150);
  const [macroCarbs, setMacroCarbs] = useState(225);
  const [macroFat, setMacroFat] = useState(67);
  const [macroDirty, setMacroDirty] = useState(false);
  const [macroSaving, setMacroSaving] = useState(false);

  const [prevSetDisplay, setPrevSetDisplay] = useState("weight_reps");
  const [showExerciseNotes, setShowExerciseNotes] = useState(true);
  const [showMuscleGroups, setShowMuscleGroups] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  const [countDumbbellTwice, setCountDumbbellTwice] = useState(false);
  const [includeBodyweight, setIncludeBodyweight] = useState(false);
  const [disableSleep, setDisableSleep] = useState(false);
  const [soundEffects, setSoundEffects] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setMacroCalories(u?.daily_calories || parseInt(userStorage.getItem("gym-macro-calories") || "2000"));
      setMacroProtein(u?.daily_protein || parseInt(userStorage.getItem("gym-macro-protein") || "150"));
      setMacroCarbs(u?.daily_carbs || parseInt(userStorage.getItem("gym-macro-carbs") || "225"));
      setMacroFat(u?.daily_fat || parseInt(userStorage.getItem("gym-macro-fat") || "67"));
    }).catch(() => {});

    setDarkMode(localStorage.getItem("gym-dark-mode") === null ? true : localStorage.getItem("gym-dark-mode") === "true");
    setTheme(userStorage.getItem("gym-theme") || "default");
    setWeightUnit(userStorage.getItem("gym-weight-unit") || "kg");
    setDistanceUnit(userStorage.getItem("gym-distance-unit") || "metric");
    setWeekStart(userStorage.getItem("gym-week-start") || "monday");
    setWarmupRest(parseInt(userStorage.getItem("gym-warmup-rest") || "60"));
    setCompoundRest(parseInt(userStorage.getItem("gym-compound-rest") || "180"));
    setIsolationRest(parseInt(userStorage.getItem("gym-isolation-rest") || "90"));
    setAutoStartRest(userStorage.getItem("gym-auto-start-rest") === "true");
    setTimerSound(userStorage.getItem("gym-timer-sound") !== "false");
    setTimerVibration(userStorage.getItem("gym-timer-vibration") !== "false");
    setPrevSetDisplay(userStorage.getItem("gym-prev-set-display") || "weight_reps");
    setShowExerciseNotes(userStorage.getItem("gym-show-exercise-notes") !== "false");
    setShowMuscleGroups(userStorage.getItem("gym-show-muscle-groups") !== "false");
    setShowVolume(userStorage.getItem("gym-show-volume") !== "false");
    setCountDumbbellTwice(userStorage.getItem("gym-dumbbell-twice") === "true");
    setIncludeBodyweight(userStorage.getItem("gym-include-bodyweight") === "true");
    setDisableSleep(userStorage.getItem("gym-disable-sleep") === "true");
    setSoundEffects(userStorage.getItem("gym-sound-effects") === "true");
  }, []);

  const save = (key, val, setter) => { setter(val); userStorage.setItem(key, String(val)); };

  const toggleDark = (v) => {
    setDarkMode(v);
    localStorage.setItem("gym-dark-mode", String(v));
    document.documentElement.classList.toggle("dark", v);
    window.dispatchEvent(new Event("darkModeChanged"));
  };

  const handleTheme = (id) => { setTheme(id); applyTheme(id); };

  const handleWeightUnit = (u) => {
    save("gym-weight-unit", u, setWeightUnit);
    window.dispatchEvent(new CustomEvent("weightUnitChanged", { detail: { unit: u } }));
  };

  const saveMacros = async () => {
    setMacroSaving(true);
    await base44.auth.updateMe({
      daily_calories: macroCalories,
      daily_protein: macroProtein,
      daily_carbs: macroCarbs,
      daily_fat: macroFat,
    });
    userStorage.setItem("gym-macro-calories", String(macroCalories));
    userStorage.setItem("gym-macro-protein", String(macroProtein));
    userStorage.setItem("gym-macro-carbs", String(macroCarbs));
    userStorage.setItem("gym-macro-fat", String(macroFat));
    window.dispatchEvent(new CustomEvent("macroGoalsChanged", {
      detail: { calories: macroCalories, protein: macroProtein, carbs: macroCarbs, fat: macroFat }
    }));
    setMacroDirty(false);
    setMacroSaving(false);
  };

  return {
    user,
    darkMode, toggleDark, theme, handleTheme,
    weightUnit, handleWeightUnit, distanceUnit, weekStart,
    warmupRest, compoundRest, isolationRest, autoStartRest, timerSound, timerVibration,
    setWarmupRest, setCompoundRest, setIsolationRest, setAutoStartRest, setTimerSound, setTimerVibration,
    macroCalories, setMacroCalories, macroProtein, setMacroProtein, macroCarbs, setMacroCarbs, macroFat, setMacroFat,
    macroDirty, setMacroDirty, macroSaving, saveMacros,
    prevSetDisplay, showExerciseNotes, showMuscleGroups, showVolume,
    setShowExerciseNotes, setShowMuscleGroups, setShowVolume,
    countDumbbellTwice, includeBodyweight, disableSleep, soundEffects,
    setCountDumbbellTwice, setIncludeBodyweight, setDisableSleep, setSoundEffects,
    showDeleteConfirm, setShowDeleteConfirm,
    save,
  };
}