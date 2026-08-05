import React, { useState } from "react";
import { useSettingsState } from "@/components/settings/useSettingsState";
import { SettingsPageShell, SettingsCard } from "@/components/settings/settingsUi";
import MacroGoalEditor from "@/components/macros/MacroGoalEditor";
import BmrBanner from "@/components/nutrition/BmrBanner";
import BmrCalculatorModal from "@/components/nutrition/BmrCalculatorModal";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

export default function SettingsNutrition() {
  const { macroCalories, macroProtein, macroCarbs, macroFat, saveMacros } = useSettingsState();
  const [showBmrCalc, setShowBmrCalc] = useState(false);

  return (
    <SettingsPageShell
      title="Nutrition"
      headerRight={
        <Button size="sm" className="gap-1.5 h-8 rounded-xl px-3 text-xs" onClick={() => setShowBmrCalc(true)}>
          <Flame className="w-3.5 h-3.5" /> BMR
        </Button>
      }
    >
      <BmrBanner />
      <SettingsCard divided={false}>
        <div className="px-4 py-4">
          <MacroGoalEditor
            key={`${macroCalories}-${macroProtein}-${macroCarbs}-${macroFat}`}
            initial={{ calories: macroCalories, protein: macroProtein, carbs: macroCarbs, fat: macroFat }}
            onSave={saveMacros}
            showCancel={false}
          />
        </div>
      </SettingsCard>
      {showBmrCalc && <BmrCalculatorModal onClose={() => setShowBmrCalc(false)} />}
    </SettingsPageShell>
  );
}