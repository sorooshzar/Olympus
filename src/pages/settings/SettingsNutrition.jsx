import React from "react";
import { useSettingsState } from "@/components/settings/useSettingsState";
import { SettingsPageShell, SettingsCard } from "@/components/settings/settingsUi";
import MacroGoalEditor from "@/components/macros/MacroGoalEditor";

export default function SettingsNutrition() {
  const { macroCalories, macroProtein, macroCarbs, macroFat, saveMacros } = useSettingsState();

  return (
    <SettingsPageShell title="Nutrition">
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
    </SettingsPageShell>
  );
}