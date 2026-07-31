import React from "react";
import { Switch } from "@/components/ui/switch";
import { useSettingsState } from "@/components/settings/useSettingsState";
import { SettingsPageShell, SettingsCard, Row, Divider } from "@/components/settings/settingsUi";

export default function SettingsAdvanced() {
  const {
    countDumbbellTwice, includeBodyweight, disableSleep, soundEffects,
    save, setCountDumbbellTwice, setIncludeBodyweight, setDisableSleep, setSoundEffects,
  } = useSettingsState();

  return (
    <SettingsPageShell title="Advanced">
      <SettingsCard>
        <Row label="Count Dumbbells Twice" description="Multiply dumbbell weight ×2 when calculating total volume">
          <Switch checked={countDumbbellTwice} onCheckedChange={v => save("gym-dumbbell-twice", v, setCountDumbbellTwice)} />
        </Row>
        <Divider />
        <Row label="Include Bodyweight in Volume" description="Add your bodyweight to bodyweight exercises">
          <Switch checked={includeBodyweight} onCheckedChange={v => save("gym-include-bodyweight", v, setIncludeBodyweight)} />
        </Row>
        <Divider />
        <Row label="Keep Screen Awake" description="Prevents the display from turning off during workouts">
          <Switch checked={disableSleep} onCheckedChange={v => save("gym-disable-sleep", v, setDisableSleep)} />
        </Row>
        <Divider />
        <Row label="Sound Effects" description="Play sounds when completing sets and finishing workouts">
          <Switch checked={soundEffects} onCheckedChange={v => save("gym-sound-effects", v, setSoundEffects)} />
        </Row>
      </SettingsCard>
    </SettingsPageShell>
  );
}