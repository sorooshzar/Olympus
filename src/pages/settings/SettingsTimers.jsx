import React from "react";
import { Switch } from "@/components/ui/switch";
import { useSettingsState } from "@/components/settings/useSettingsState";
import { SettingsPageShell, SettingsCard, Row, Divider, TimerStepper } from "@/components/settings/settingsUi";

export default function SettingsTimers() {
  const {
    warmupRest, compoundRest, isolationRest,
    autoStartRest, timerSound, timerVibration,
    save, setWarmupRest, setCompoundRest, setIsolationRest,
    setAutoStartRest, setTimerSound, setTimerVibration,
  } = useSettingsState();
  return (
    <SettingsPageShell title="Workout & Timers">
      <SettingsCard>
        <Row label="Warm-up Rest" description="Rest time between warm-up sets">
          <TimerStepper value={warmupRest} onChange={v => save("gym-warmup-rest", v, setWarmupRest)} />
        </Row>
        <Divider />
        <Row label="Compound Rest" description="Rest for compound movements">
          <TimerStepper value={compoundRest} onChange={v => save("gym-compound-rest", v, setCompoundRest)} step={30} />
        </Row>
        <Divider />
        <Row label="Isolation Rest" description="Rest for isolation movements">
          <TimerStepper value={isolationRest} onChange={v => save("gym-isolation-rest", v, setIsolationRest)} />
        </Row>
        <Divider />
        <Row label="Auto-start Rest Timer" description="Start rest timer automatically after completing a set">
          <Switch checked={autoStartRest} onCheckedChange={v => save("gym-auto-start-rest", v, setAutoStartRest)} />
        </Row>
        <Divider />
        <Row label="Timer Sound" description="Play a sound when rest timer ends">
          <Switch checked={timerSound} onCheckedChange={v => save("gym-timer-sound", v, setTimerSound)} />
        </Row>
        <Divider />
        <Row label="Vibration" description="Vibrate when rest timer ends">
          <Switch checked={timerVibration} onCheckedChange={v => save("gym-timer-vibration", v, setTimerVibration)} />
        </Row>
      </SettingsCard>
    </SettingsPageShell>
  );
}