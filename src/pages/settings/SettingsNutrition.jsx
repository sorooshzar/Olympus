import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSettingsState } from "@/components/settings/useSettingsState";
import { SettingsPageShell, SettingsCard } from "@/components/settings/settingsUi";

export default function SettingsNutrition() {
  const {
    macroCalories, setMacroCalories,
    macroProtein, setMacroProtein,
    macroCarbs, setMacroCarbs,
    macroFat, setMacroFat,
    macroDirty, setMacroDirty, macroSaving, saveMacros,
  } = useSettingsState();

  const macros = [
    { key: "protein", label: "Protein", val: macroProtein, setVal: setMacroProtein, kcalPer: 4, color: "#60a5fa" },
    { key: "carbs",   label: "Carbs",   val: macroCarbs,   setVal: setMacroCarbs,   kcalPer: 4, color: "#fbbf24" },
    { key: "fat",     label: "Fat",     val: macroFat,     setVal: setMacroFat,     kcalPer: 9, color: "#f472b6" },
  ];

  return (
    <SettingsPageShell title="Nutrition">
      <SettingsCard divided={false}>
        <div className="px-4 py-4 space-y-4">
          <p className="text-[11px] text-muted-foreground">Set your daily macro goals. Press Save to apply — unsaved changes are discarded if you leave.</p>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Daily Calories</p>
              <span className="text-xs text-muted-foreground">{macroCalories} kcal</span>
            </div>
            <input type="number" inputMode="numeric" value={macroCalories}
              onChange={e => { setMacroCalories(Math.max(500, parseInt(e.target.value) || 500)); setMacroDirty(true); }}
              className="w-full text-center text-2xl font-black bg-secondary border-0 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {macros.map(({ key, label, val, setVal, kcalPer, color }) => {
              const pct = macroCalories > 0 ? Math.round((val * kcalPer / macroCalories) * 100) : 0;
              return (
                <div key={key} className="bg-secondary rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color }}>{label}</span>
                    <span className="text-[10px] text-muted-foreground">{pct}%</span>
                  </div>
                  <input type="number" inputMode="numeric" value={val}
                    onChange={e => { setVal(Math.max(0, parseInt(e.target.value) || 0)); setMacroDirty(true); }}
                    className="w-full text-center text-base font-black bg-card border-0 rounded-lg py-1.5 focus:outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground text-center mt-1">{val * kcalPer} kcal</p>
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {macroDirty && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}>
                <Button className="w-full gap-2" onClick={saveMacros} disabled={macroSaving}>
                  <Check className="w-4 h-4" />
                  {macroSaving ? "Saving…" : "Save Macro Goals"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SettingsCard>
    </SettingsPageShell>
  );
}