import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { createPageUrl } from "@/utils";

export const THEMES = [
  { id: "default",   label: "Blue",   color: "#2563eb" },
  { id: "halloween", label: "Orange", color: "#f97316" },
  { id: "crimson",   label: "Red",    color: "#dc2626" },
  { id: "forest",    label: "Green",  color: "#16a34a" },
  { id: "fairy",     label: "Pink",   color: "#ec4899" },
  { id: "gold",      label: "Gold",   color: "#eab308" },
  { id: "ocean",     label: "Cyan",   color: "#0891b2" },
  { id: "violet",    label: "Violet", color: "#7c3aed" },
];

export function Seg({ options, value, onChange }) {
  return (
    <div className="flex bg-secondary rounded-lg p-0.5 shrink-0">
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${value === o.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Row({ label, description, children }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Divider() {
  return <div className="h-px bg-border/60 mx-4" />;
}

export function TimerStepper({ value, onChange, min = 15, max = 600, step = 15 }) {
  const fmt = (s) => s >= 60 ? `${Math.floor(s / 60)}m${s % 60 > 0 ? ` ${s % 60}s` : ""}` : `${s}s`;
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(Math.max(min, value - step))}
        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-base font-bold text-muted-foreground">−</button>
      <span className="text-sm font-bold w-14 text-center">{fmt(value)}</span>
      <button onClick={() => onChange(Math.min(max, value + step))}
        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-base font-bold text-muted-foreground">+</button>
    </div>
  );
}

export function SettingsPageShell({ title, children }) {
  return (
    <div className="max-w-lg mx-auto px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-12">
      <div className="flex items-center gap-3 mb-4">
        <Link to={createPageUrl("Settings")}>
          <button className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function SettingsCard({ children, divided = true }) {
  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden ${divided ? "divide-y divide-border/40" : ""}`}>
      {children}
    </div>
  );
}