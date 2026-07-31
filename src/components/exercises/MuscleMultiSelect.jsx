import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { getAllSubSections } from "@/components/utils/muscleHierarchy";
import { getMuscleDisplayLabel } from "@/components/utils/movementPatterns";

export default function MuscleMultiSelect({ value = [], onChange, exclude = null, placeholder = "Select muscles…" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const options = getAllSubSections()
    .filter((m) => m !== exclude)
    .sort((a, b) => getMuscleDisplayLabel(a).localeCompare(getMuscleDisplayLabel(b)));

  const toggle = (m) => {
    onChange(value.includes(m) ? value.filter((x) => x !== m) : [...value, m]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-secondary border-0 rounded-lg px-3 py-2.5 text-sm font-medium flex items-center justify-between gap-2 focus:outline-none focus:ring-1 focus:ring-primary min-h-[42px]"
      >
        <span className={`flex-1 text-left truncate ${value.length === 0 ? "text-muted-foreground/60" : "text-foreground"}`}>
          {value.length === 0
            ? placeholder
            : `${value.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg">
          {options.map((m) => {
            const checked = value.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggle(m)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-secondary/60 transition-colors"
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-primary border-primary" : "border-border"}`}>
                  {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                </span>
                <span className={checked ? "font-semibold text-foreground" : "text-foreground"}>{getMuscleDisplayLabel(m)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}