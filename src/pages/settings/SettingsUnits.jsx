import React from "react";
import { useSettingsState } from "@/components/settings/useSettingsState";
import { SettingsPageShell, SettingsCard, Row, Divider, Seg } from "@/components/settings/settingsUi";

export default function SettingsUnits() {
  const { weightUnit, handleWeightUnit, distanceUnit, weekStart, save, setDistanceUnit, setWeekStart } = useSettingsState();
  return (
    <SettingsPageShell title="Units & Measurements">
      <SettingsCard>
        <Row label="Weight">
          <Seg value={weightUnit} onChange={handleWeightUnit} options={[{ id: "kg", label: "kg" }, { id: "lbs", label: "lbs" }]} />
        </Row>
        <Divider />
        <Row label="Distance">
          <Seg value={distanceUnit} onChange={v => save("gym-distance-unit", v, setDistanceUnit)} options={[{ id: "metric", label: "km" }, { id: "imperial", label: "mi" }]} />
        </Row>
        <Divider />
        <Row label="Week Starts On">
          <Seg value={weekStart} onChange={v => save("gym-week-start", v, setWeekStart)} options={[{ id: "monday", label: "Mon" }, { id: "sunday", label: "Sun" }]} />
        </Row>
      </SettingsCard>
    </SettingsPageShell>
  );
}