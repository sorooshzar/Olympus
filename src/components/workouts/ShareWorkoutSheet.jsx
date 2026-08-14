import React, { useState, useRef, useEffect } from "react";
import { UserPlus, Link, ClipboardList, ChevronRight, X } from "lucide-react";
import { useWeightUnit } from "@/components/utils/useWeightUnit";
import { WorkoutIcon } from "./IconPickerModal";

export default function ShareWorkoutSheet({ template, onClose }) {
  const { unit, toDisplay } = useWeightUnit();
  const accentColor = template.color || null;

  // Self-contained, auto-dismissing toast (no reliance on the global toaster).
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const hideTimer = useRef(null);
  const unmountTimer = useRef(null);

  const showToast = (msg) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    setToastMsg(msg);
    // mount + fade in next tick so the transition runs
    requestAnimationFrame(() => setToastVisible(true));
    hideTimer.current = setTimeout(() => {
      setToastVisible(false); // CSS fade-out
      unmountTimer.current = setTimeout(() => setToastMsg(""), 300); // unmount after fade
    }, 2200);
  };

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
    };
  }, []);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/Lifts?shared=${template.id}`;
    navigator.clipboard?.writeText(url);
    showToast("Link copied!");
  };

  const handleCopyText = () => {
    const lines = [`${template.name}`, ""];
    (template.exercises || []).forEach(ex => {
      lines.push(`${ex.exercise_name}${ex.muscle_group ? ` — ${ex.muscle_group}` : ""}`);
      (ex.sets || []).forEach((s, i) => {
        const weight = s.weight ? `${toDisplay(s.weight)}${unit}` : "BW";
        const repsStr = s.reps ? `${s.reps} reps` : "";
        const rirStr = s.rir != null ? ` (RIR ${s.rir})` : "";
        lines.push(`  • Set ${i + 1}: ${weight} × ${repsStr}${rirStr}`);
      });
      lines.push("");
    });
    navigator.clipboard?.writeText(lines.join("\n").trim());
    showToast("Copied!");
  };

  const handleShareToFriend = () => {
    // Feature not built yet — do NOT create any workout copy or records.
    showToast("Sharing with friends is coming soon!");
  };

  const options = [
    {
      key: "friend",
      icon: <UserPlus className="w-5 h-5" />,
      label: "Send to a friend",
      sub: "They can add it to their routines",
      onTap: handleShareToFriend,
    },
    {
      key: "link",
      icon: <Link className="w-5 h-5" />,
      label: "Copy link",
      sub: "Anyone with the link can view this workout",
      onTap: handleCopyLink,
    },
    {
      key: "text",
      icon: <ClipboardList className="w-5 h-5" />,
      label: "Copy as text",
      sub: "Paste anywhere",
      onTap: handleCopyText,
    },
  ];

  return (
    <>
      {/* Centered modal overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60" />
        <div
          className="relative w-full max-w-md bg-card rounded-3xl p-5 pt-6 pb-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-secondary/70 flex items-center justify-center active:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5 pr-10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: accentColor ? accentColor + "22" : "hsl(var(--primary)/0.1)" }}
            >
              <WorkoutIcon
                name={template.icon}
                className="w-5 h-5"
                style={{ color: accentColor ? accentColor + "cc" : "hsl(var(--primary))" }}
              />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base truncate">{template.name}</p>
              <p className="text-xs text-muted-foreground">
                {(template.exercises || []).length} exercise{(template.exercises || []).length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {options.map(opt => (
              <button
                key={opt.key}
                onClick={opt.onTap}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-secondary/60 active:bg-secondary transition-colors text-left"
              >
                <span className="text-primary flex-shrink-0">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Slim auto-dismissing toast */}
      {toastMsg && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium shadow-lg transition-opacity duration-300 ${toastVisible ? "opacity-100" : "opacity-0"}`}
        >
          {toastMsg}
        </div>
      )}
    </>
  );
}