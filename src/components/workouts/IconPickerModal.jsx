import React from "react";
import {
  Dumbbell, Zap, Flame, Target, Heart, Star, Trophy, Shield,
  Bike, Timer, Swords, Rocket, Sun, Moon, Wind, Snowflake,
  Leaf, Footprints, HandMetal, Activity, Crosshair, RefreshCw, Bolt,
} from "lucide-react";
import PickerPopupShell from "./PickerPopupShell";

// ─── Minimalist muscle SVG icons ───────────────────────────────────────────
const ChestIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 8c0-2 1.5-4 4-4 2 0 3.5 1 5 3 1.5-2 3-3 5-3 2.5 0 4 2 4 4v4c0 3-2 5-4.5 5H7.5C5 17 3 15 3 12V8z" />
    <path d="M12 7v10" />
    <path d="M3 11h9M12 11h9" />
  </svg>
);

const BackIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3C8 3 4 5.5 4 9v2c0 2 1.5 3.5 3 4l1.5 6h7L17 15c1.5-.5 3-2 3-4V9c0-3.5-4-6-8-6z" />
    <path d="M12 3v18" />
    <path d="M4 10c2 1.5 5 2 8 2s6-.5 8-2" />
  </svg>
);

const ShouldersIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v5" />
    <path d="M5 9c-1 1-2 3-1.5 5S6 17 8 16.5l1.5-.5" />
    <path d="M19 9c1 1 2 3 1.5 5S18 17 16 16.5l-1.5-.5" />
    <path d="M9.5 16l2.5-4 2.5 4" />
    <path d="M3.5 14c-.5 1-.5 2 .5 2.5" />
    <path d="M20.5 14c.5 1 .5 2-.5 2.5" />
  </svg>
);

const ArmsIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 20c0-4 2-7 6-7s6 3 6 7" />
    <path d="M12 13V9" />
    <path d="M8 9c0-2 1.5-4 4-4s4 2 4 4" />
    <path d="M7 9c-1 0-2 .5-2 2s1 2 2 2h10c1 0 2-.5 2-2s-1-2-2-2" />
  </svg>
);

const LegsIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M8 3h8v8c0 3-1.5 5.5-4 7-2.5-1.5-4-4-4-7V3z" />
    <path d="M12 3v18" />
    <path d="M8 11h8" />
    <path d="M9 21h3M12 21h3" />
  </svg>
);

const GlutesIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 6c0-1 1-2 2-2h4c1.5 0 2 1 2 2v5c0 2.5-1.5 5-3.5 6.5" />
    <path d="M20 6c0-1-1-2-2-2h-4c-1.5 0-2 1-2 2v5c0 2.5 1.5 5 3.5 6.5" />
    <path d="M6.5 17.5C8 19.5 10 21 12 21s4-1.5 5.5-3.5" />
  </svg>
);

const CoreIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="7" y="3" width="10" height="18" rx="1.5" />
    <path d="M12 3v18" />
    <path d="M7 9h10" />
    <path d="M7 14h10" />
    <path d="M7 19h10" />
  </svg>
);

const CardioIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2C10.5 3.5 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5C2 10.8 3.5 12.5 5 14l7 7 7-7z" />
    <path d="M3.5 12h3l2-5 2 8 2-5 1 2h3.5" />
  </svg>
);

const FullBodyIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="4" r="2" />
    <path d="M8 9h8" />
    <path d="M12 7v6" />
    <path d="M9 13l-2 8" />
    <path d="M15 13l2 8" />
    <path d="M9 9l-3 2" />
    <path d="M15 9l3 2" />
  </svg>
);

const StretchIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="17" cy="4" r="2" />
    <path d="M15 6l-4 4-4 1-4 5" />
    <path d="M7 11l2 9" />
    <path d="M11 10l4 4 4-2" />
  </svg>
);

// ─── Muscle group entries ───────────────────────────────────────────────────
const MUSCLE_ICONS = [
  { key: "muscle-chest",     label: "Chest",     Icon: ChestIcon },
  { key: "muscle-back",      label: "Back",      Icon: BackIcon },
  { key: "muscle-shoulders", label: "Shoulders", Icon: ShouldersIcon },
  { key: "muscle-arms",      label: "Arms",      Icon: ArmsIcon },
  { key: "muscle-legs",      label: "Legs",      Icon: LegsIcon },
  { key: "muscle-glutes",    label: "Glutes",    Icon: GlutesIcon },
  { key: "muscle-core",      label: "Core",      Icon: CoreIcon },
  { key: "muscle-cardio",    label: "Cardio",    Icon: CardioIcon },
  { key: "muscle-full",      label: "Full Body", Icon: FullBodyIcon },
  { key: "muscle-stretch",   label: "Stretch",   Icon: StretchIcon },
];

// ─── General Lucide icons ───────────────────────────────────────────────────
export const ICON_MAP = {
  Dumbbell, Zap, Flame, Target, Heart, Star, Trophy, Shield,
  Bike, Timer, Swords, Rocket, Sun, Moon, Wind, Snowflake,
  Leaf, Footprints, HandMetal, Activity, Crosshair, RefreshCw, Bolt,
};

const GENERAL_ICONS = [
  "Dumbbell", "Zap", "Flame", "Target", "Trophy", "Star", "Heart", "Shield",
  "Bike", "Timer", "Swords", "Rocket", "Sun", "Moon", "Wind", "Snowflake",
  "Leaf", "Footprints", "HandMetal", "Activity", "Crosshair", "RefreshCw", "Bolt",
];

// ─── WorkoutIcon renderer (used everywhere else in the app) ─────────────────
export function WorkoutIcon({ name, className, style }) {
  const muscle = MUSCLE_ICONS.find(m => m.key === name);
  if (muscle) {
    const { Icon } = muscle;
    return <Icon className={className} style={style} />;
  }
  const Icon = ICON_MAP[name] || Dumbbell;
  return <Icon className={className} style={style} />;
}

// ─── Modal ──────────────────────────────────────────────────────────────────
export default function IconPickerModal({ open, current, accentColor, onSelect, onClose }) {
  if (!open) return null;

  const selected = current || "Dumbbell";
  const accent = accentColor || "hsl(var(--primary))";

  return (
    <PickerPopupShell title="Customize" onClose={onClose}>
      <div className="grid grid-cols-5 gap-2.5 max-h-72 overflow-y-auto pr-0.5">
        {GENERAL_ICONS.map((name) => {
          const Icon = ICON_MAP[name];
          const isSelected = selected === name;
          return (
            <button
              key={name}
              onClick={() => { onSelect(name); onClose(); }}
              className={`h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                isSelected
                  ? "ring-2 ring-offset-1 ring-primary bg-primary/10"
                  : "bg-secondary hover:bg-secondary/70"
              }`}
              title={name}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: isSelected ? accent : "hsl(var(--foreground) / 0.5)" }}
              />
            </button>
          );
        })}
      </div>
    </PickerPopupShell>
  );
}