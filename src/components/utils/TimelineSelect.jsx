import React from "react";
import { TIMELINE_OPTIONS, weeksLabel } from "@/components/utils/useGoalWeight";

// Shared timeline picker (3-col button grid) used by the Measurements page
// and the Profile stats goal editor so both offer identical options.
export default function TimelineSelect({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {TIMELINE_OPTIONS.map(w => (
        <button
          key={w}
          type="button"
          onClick={() => onChange(w)}
          className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${value === w ? "bg-primary text-white" : "bg-secondary text-foreground"}`}
        >
          {weeksLabel(w)}
        </button>
      ))}
    </div>
  );
}