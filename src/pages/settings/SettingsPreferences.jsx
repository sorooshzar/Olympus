import React from "react";
import { Switch } from "@/components/ui/switch";
import { useSettingsState } from "@/components/settings/useSettingsState";
import { SettingsPageShell, SettingsCard, Row, Divider } from "@/components/settings/settingsUi";

export default function SettingsPreferences() {
  const {
    prevSetDisplay, showExerciseNotes, showMuscleGroups, showVolume,
    save, setPrevSetDisplay, setShowExerciseNotes, setShowMuscleGroups, setShowVolume,
  } = useSettingsState();

  return (
    <SettingsPageShell title="App Preferences">
      <SettingsCard divided={false}>
        <div className="px-4 py-3.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Previous Set Display</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "weight_reps", label: "Weight × Reps" },
              { id: "weight_only", label: "Weight Only" },
              { id: "reps_only",   label: "Reps Only" },
              { id: "hidden",      label: "Hidden" },
            ].map(opt => (
              <button key={opt.id} onClick={() => save("gym-prev-set-display", opt.id, setPrevSetDisplay)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${prevSetDisplay === opt.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <Row label="Show Exercise Notes" description="Display technique notes under exercise name">
          <Switch checked={showExerciseNotes} onCheckedChange={v => save("gym-show-exercise-notes", v, setShowExerciseNotes)} />
        </Row>
        <Divider />
        <Row label="Show Muscle Groups" description="Display target muscle under exercise name">
          <Switch checked={showMuscleGroups} onCheckedChange={v => save("gym-show-muscle-groups", v, setShowMuscleGroups)} />
        </Row>
        <Divider />
        <Row label="Show Workout Volume" description="Display total volume on workout completion">
          <Switch checked={showVolume} onCheckedChange={v => save("gym-show-volume", v, setShowVolume)} />
        </Row>
      </SettingsCard>
    </SettingsPageShell>
  );
}