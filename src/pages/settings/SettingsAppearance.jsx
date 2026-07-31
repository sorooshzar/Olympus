import React from "react";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";
import { useSettingsState } from "@/components/settings/useSettingsState";
import { SettingsPageShell, SettingsCard, Row, THEMES } from "@/components/settings/settingsUi";

export default function SettingsAppearance() {
  const { darkMode, toggleDark, theme, handleTheme } = useSettingsState();
  return (
    <SettingsPageShell title="Appearance">
      <SettingsCard>
        <Row label={darkMode ? "Dark Mode" : "Light Mode"} description="Toggle between dark and light interface">
          <div className="flex items-center gap-2">
            {darkMode ? <Moon className="w-4 h-4 text-violet-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <Switch checked={darkMode} onCheckedChange={toggleDark} />
          </div>
        </Row>
      </SettingsCard>

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-4 px-1">Accent Color</p>
      <SettingsCard divided={false}>
        <div className="px-4 py-3.5">
          <div className="grid grid-cols-8 gap-2">
            {THEMES.map(t => (
              <button key={t.id} onClick={() => handleTheme(t.id)} className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full transition-all ${theme === t.id ? "ring-2 ring-offset-2 ring-offset-card scale-110" : "opacity-70"}`}
                  style={{ backgroundColor: t.color, '--tw-ring-color': t.color }} />
                {theme === t.id && <div className="w-1 h-1 rounded-full bg-foreground" />}
              </button>
            ))}
          </div>
        </div>
      </SettingsCard>
    </SettingsPageShell>
  );
}