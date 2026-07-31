import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, Palette, Ruler, Timer, Utensils, Sliders, Zap, User } from "lucide-react";

const CATEGORIES = [
  { key: "SettingsAppearance",  label: "Appearance",             icon: Palette,  color: "#8b5cf6", desc: "Dark mode & accent color" },
  { key: "SettingsUnits",       label: "Units & Measurements",  icon: Ruler,    color: "#06b6d4", desc: "Weight, distance, week start" },
  { key: "SettingsTimers",      label: "Workout & Timers",       icon: Timer,    color: "#ec4899", desc: "Rest timers & feedback" },
  { key: "SettingsNutrition",   label: "Nutrition",             icon: Utensils, color: "#f59e0b", desc: "Daily macro goals" },
  { key: "SettingsPreferences", label: "App Preferences",       icon: Sliders,  color: "#10b981", desc: "Display & workout options" },
  { key: "SettingsAdvanced",    label: "Advanced",              icon: Zap,      color: "#ef4444", desc: "Volume & power options" },
  { key: "SettingsAccount",     label: "Account",              icon: User,     color: "#64748b", desc: "Sign out & delete account" },
];

export default function Settings() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-12">
      <div className="flex items-center gap-3 mb-4">
        <Link to={createPageUrl("Profile")}>
          <button className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border/40">
        {CATEGORIES.map(({ key, label, icon: Icon, color, desc }) => (
          <Link key={key} to={createPageUrl(key)}
            className="flex items-center gap-3 px-4 py-3.5 active:bg-secondary/50 transition-colors">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + "22" }}>
              <Icon className="w-[18px] h-[18px]" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}