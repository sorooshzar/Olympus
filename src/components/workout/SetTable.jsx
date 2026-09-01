import React, { useRef, useState, useCallback, useLayoutEffect } from "react";
import { Check, Plus, Flame, ChevronDown, Trash2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWeightUnit } from "@/components/utils/useWeightUnit";
import { motion, AnimatePresence } from "framer-motion";
import NumericKeyboard from "./NumericKeyboard";
import IosWheelPicker from "./IosWheelPicker";
import { getRestDurationForSet } from "./ActiveWorkoutContext";
import { haptic } from "@/components/utils/haptics";

/* ── helpers ───────────────────────────────────────────── */
function getSetLabel(set, workingIndex) {
  if (set.type === "warmup")  return { label: "W", color: "text-amber-500" };
  if (set.type === "failure") return { label: "F", color: "text-destructive" };
  if (set.type === "dropset") return { label: "D", color: "text-purple-400" };
  return { label: String(workingIndex), color: "text-muted-foreground" };
}

function getRowBg(set) {
  if (set.completed && set.type === "failure") return "bg-destructive/10";
  if (set.completed) return "bg-primary/5";
  if (set.type === "failure") return "bg-destructive/5";
  if (set.type === "dropset") return "bg-purple-500/5";
  return "";
}

function calc1RM(weight, reps) {
  if (!weight || !reps) return null;
  return weight * (1 + reps / 30);
}

/* ── grid layout ───────────────────────────────────────── */
// [set 26px] [prev flex] [kg 52px] [reps 44px] [rir 36px] [1rm% 32px] [check? 28px]
const GRID        = "grid-cols-[24px_1fr_48px_40px_32px_28px]";
const GRID_ACTIVE = "grid-cols-[24px_1fr_48px_40px_32px_28px_24px]";

/* ── swipeable row ─────────────────────────────────────── */
const SWIPE_THRESHOLD = 80;

function SwipeableSetRow({ children, onRemove }) {
  const [dragX, setDragX]   = useState(0);
  const [swiped, setSwiped] = useState(false);
  const startX   = useRef(null);
  const startY   = useRef(null);
  const dragging = useRef(false);

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    dragging.current = true;
  };
  const onTouchMove = (e) => {
    if (!dragging.current) return;
    const diffX = e.touches[0].clientX - startX.current;
    const diffY = Math.abs(e.touches[0].clientY - startY.current);
    // Only treat as horizontal swipe if X movement dominates Y movement
    if (diffY > Math.abs(diffX) * 0.8) {
      dragging.current = false;
      setDragX(0);
      return;
    }
    if (diffX < 0) {
      e.preventDefault();
      setDragX(Math.max(diffX, -SWIPE_THRESHOLD * 1.5));
    }
  };
  const onTouchEnd = () => {
    dragging.current = false;
    if (dragX < -SWIPE_THRESHOLD) { setSwiped(true); setTimeout(onRemove, 220); }
    else setDragX(0);
  };

  return (
    <motion.div
      animate={swiped ? { x: "-100%", opacity: 0, height: 0 } : { x: dragX, opacity: 1 }}
      transition={swiped ? { duration: 0.22, ease: "easeIn" } : { type: "spring", stiffness: 500, damping: 40 }}
      style={{ position: "relative", overflow: "visible" }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
    >
      {/* delete reveal */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-1 pr-3 rounded-lg bg-destructive pointer-events-none"
        style={{ width: Math.min(Math.abs(dragX), SWIPE_THRESHOLD * 1.5), opacity: Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1) }}
      >
        <Trash2 className="w-3.5 h-3.5 text-white" />
        <span className="text-white text-xs font-bold">Delete</span>
      </div>
      {children}
    </motion.div>
  );
}

/* ── tappable cell ─────────────────────────────────────── */
function TapCell({ value, onTap, placeholder = "0", className = "" }) {
  // Distinguish a clean tap from a swipe/scroll: only fire onTap when the
  // pointer barely moved between down and up.
  const downRef = useRef(null);

  const handlePointerDown = (e) => {
    downRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const handlePointerUp = (e) => {
    const d = downRef.current;
    downRef.current = null;
    if (!d) return;
    const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (dist < 10 && Date.now() - d.t < 600) {
      onTap(e);
    }
  };
  const cancel = () => { downRef.current = null; };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      className={`h-9 w-full rounded-lg bg-secondary flex items-center justify-center active:opacity-70 transition-opacity select-none ${className}`}
    >
      <span className="text-sm font-semibold text-foreground">
        {value === "" || value == null ? <span className="text-muted-foreground/40">{placeholder}</span> : value}
      </span>
    </button>
  );
}

/* ── main component ────────────────────────────────────── */
export default function SetTable({ sets = [], onChange, isActive = false, previousSets = [], onSetCompleted, showRestEditor = false, onCollapseRest, movementType = "" }) {
  const { unit: weightUnit, toDisplay, toKg } = useWeightUnit();

  // activeKey: { setIndex, field } | null
  const [activeKey, setActiveKey] = useState(null);
  const [kbValue,   setKbValue]   = useState("");

  const activeCellRef = useRef(null);

  const openKb = useCallback((setIndex, field, currentValue, e) => {
    const display = field === "weight"
      ? (currentValue ? String(toDisplay(currentValue)) : "")
      : (currentValue != null && currentValue !== 0 ? String(currentValue) : "");
    activeCellRef.current = e?.currentTarget || null;
    setActiveKey({ setIndex, field });
    setKbValue(display);
    if (showRestEditor && onCollapseRest) onCollapseRest();
  }, [toDisplay, showRestEditor, onCollapseRest]);

  // When the numeric keyboard opens, scroll the edited cell so it sits
  // just above the popup regardless of its original position on screen.
  useLayoutEffect(() => {
    if (!activeKey) { activeCellRef.current = null; return; }
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const cell = activeCellRef.current;
      if (!cell) return;
      const kbEl = document.querySelector("[data-kb-root]");
      const kbHeight = kbEl ? kbEl.getBoundingClientRect().height : 320;
      const rect = cell.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const gap = 12;
      const targetBottom = viewportH - kbHeight - gap;
      const delta = rect.bottom - targetBottom;
      if (Math.abs(delta) < 4) return;
      // find nearest scrollable ancestor
      let scroller = null;
      let node = cell.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
          scroller = node;
          break;
        }
        node = node.parentElement;
      }
      if (scroller) {
        scroller.scrollBy({ top: delta, behavior: "smooth" });
      } else {
        window.scrollBy({ top: delta, behavior: "smooth" });
      }
    });
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [activeKey]);

  const commitKb = useCallback(() => {
    if (!activeKey) return;
    const { setIndex, field } = activeKey;
    const raw = parseFloat(kbValue);
    const updated = [...sets];
    const set = { ...updated[setIndex] };

    if (field === "weight") {
      set.weight = isNaN(raw) ? 0 : toKg(raw);
    } else if (field === "rir") {
      const rir = isNaN(raw) ? 0 : Math.round(raw);
      set.rir = rir;
      // Smart RIR↔Failure sync
      if (rir === 0) {
        set.type = "failure";
      } else if (set.type === "failure") {
        set.type = "working";
      }
    } else {
      set[field] = isNaN(raw) ? 0 : Math.round(raw);
    }

    updated[setIndex] = set;
    onChange(updated);
    setActiveKey(null);
    setKbValue("");
  }, [activeKey, kbValue, sets, onChange, toKg]);

  // Commit current field and jump to the next input in the same row
  // (Weight → Reps → RIR, or Weight → Reps for warmups since RIR is blank).
  const commitAndNext = useCallback(() => {
    if (!activeKey) return;
    const { setIndex, field } = activeKey;
    const raw = parseFloat(kbValue);
    const updated = [...sets];
    const set = { ...updated[setIndex] };

    if (field === "weight") {
      set.weight = isNaN(raw) ? 0 : toKg(raw);
    } else if (field === "rir") {
      const rir = isNaN(raw) ? 0 : Math.round(raw);
      set.rir = rir;
      if (rir === 0) set.type = "failure";
      else if (set.type === "failure") set.type = "working";
    } else {
      set[field] = isNaN(raw) ? 0 : Math.round(raw);
    }

    updated[setIndex] = set;
    onChange(updated);

    // Determine next field — warmups have no RIR input, so reps is the last.
    const isWarmup = set.type === "warmup";
    let nextField = null;
    if (field === "weight") nextField = "reps";
    else if (field === "reps" && !isWarmup) nextField = "rir";

    if (nextField) {
      const currentValue = updated[setIndex][nextField];
      const display = nextField === "weight"
        ? (currentValue ? String(toDisplay(currentValue)) : "")
        : (currentValue != null && currentValue !== 0 ? String(currentValue) : "");
      setKbValue(display);
      setActiveKey({ setIndex, field: nextField });
    } else {
      setActiveKey(null);
      setKbValue("");
    }
  }, [activeKey, kbValue, sets, onChange, toKg]);

  const updateSet = (index, field, value) => {
    const updated = [...sets];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  // Change set type with smart RIR sync
  const changeSetType = (index, type) => {
    const updated = [...sets];
    const set = { ...updated[index], type };
    if (type === "failure") set.rir = 0;
    else if (set.rir === 0 && type !== "failure") set.rir = 2;
    updated[index] = set;
    onChange(updated);
  };

  const addSet = (type = "working") => {
    const last = sets.filter(s => s.type !== "warmup").slice(-1)[0];
    onChange([...sets, { type, weight: last?.weight || 0, reps: last?.reps || 0, rir: last?.rir ?? 2, completed: false, rest_duration: undefined, rest_duration_locked: false }]);
  };

  const removeSet = (index) => onChange(sets.filter((_, i) => i !== index));
  const toggleComplete = (index) => {
    const newCompleted = !sets[index].completed;
    updateSet(index, "completed", newCompleted);
    if (newCompleted) {
      haptic.light();
      if (onSetCompleted) onSetCompleted(sets[index]);
    }
  };

  // pre-compute working labels
  const workingLabels = [];
  let counter = 0;
  sets.forEach(set => {
    workingLabels.push(set.type !== "warmup" ? ++counter : null);
  });

  const kbLabel = activeKey?.field === "weight"
    ? `Weight (${weightUnit})`
    : activeKey?.field === "reps" ? "Reps"
    : activeKey?.field === "rir"  ? "RIR"
    : "";
  const showQuickAdds = activeKey?.field === "weight";
  // Whether the active field is the last input in its row — when true, the
  // keyboard shows one tall Done button; when false, a small → button sits
  // above a shorter Done to jump to the next field.
  const isLastField = activeKey
    ? (activeKey.field === "rir" ||
       (activeKey.field === "reps" && sets[activeKey.setIndex]?.type === "warmup"))
    : false;

  return (
    <>
      <div className="space-y-0.5">
        {/* Header */}
        <div className={`grid gap-0.5 px-0.5 items-center mb-1 ${isActive ? GRID_ACTIVE : GRID}`}>
          <span className="text-[10px] font-semibold text-muted-foreground text-center">SET</span>
          <span className="text-[10px] font-semibold text-muted-foreground text-center">PREVIOUS</span>
          <span className="text-[10px] font-semibold text-muted-foreground text-center">{weightUnit.toUpperCase()}</span>
          <span className="text-[10px] font-semibold text-muted-foreground text-center">REPS</span>
          <span className="text-[10px] font-semibold text-muted-foreground text-center">RIR</span>
          <span className="text-[10px] font-semibold text-primary/70 text-center">1RM%</span>
          {isActive && <div />}
        </div>

        <AnimatePresence initial={false}>
          {sets.map((set, index) => {
            const { label, color } = getSetLabel(set, workingLabels[index]);
            const isDropset = set.type === "dropset";
            const prev = previousSets[index];
            const prevDisplayWeight = prev?.weight ? toDisplay(prev.weight) : 0;
            const prevLabel = prev && (prev.weight || prev.reps)
              ? `${prev.reps || 0}×${prevDisplayWeight}${weightUnit}`
              : "—";

            const current1RM = calc1RM(set.weight, set.reps);
            const prev1RM    = prev ? calc1RM(prev.weight, prev.reps) : null;
            const pctChange  = current1RM && prev1RM ? ((current1RM - prev1RM) / prev1RM) * 100 : null;
            const pctLabel   = pctChange !== null ? `${pctChange >= 0 ? "+" : ""}${Math.round(pctChange)}%` : "—";
            const pctColor   = pctChange === null ? "text-muted-foreground/40" : pctChange > 0 ? "text-primary" : pctChange < 0 ? "text-destructive/70" : "text-muted-foreground";

            const isActiveField = (field) => activeKey?.setIndex === index && activeKey?.field === field;
            const displayWeight = activeKey?.setIndex === index && activeKey?.field === "weight"
              ? kbValue
              : (set.weight ? String(toDisplay(set.weight)) : "");
            const displayReps = activeKey?.setIndex === index && activeKey?.field === "reps"
              ? kbValue
              : (set.reps ? String(set.reps) : "");
            const displayRir = activeKey?.setIndex === index && activeKey?.field === "rir"
              ? kbValue
              : (set.rir != null && set.rir !== "" ? String(set.rir) : "");

            // If user hasn't manually locked a rest time, always read live from settings
            const currentRestDuration = set.rest_duration_locked
              ? (set.rest_duration ?? getRestDurationForSet(set.type, movementType))
              : getRestDurationForSet(set.type, movementType);

            return (
              <React.Fragment key={index}>
                <SwipeableSetRow onRemove={() => removeSet(index)}>
                  {isDropset && index > 0 && (
                    <div className="flex items-center gap-1 pl-6 pb-0.5">
                      <ChevronDown className="w-3 h-3 text-purple-400" />
                      {sets[index - 1]?.weight && set.weight && sets[index - 1].weight > set.weight && (
                        <span className="text-[10px] text-purple-400 font-medium">
                          -{Math.round(((sets[index - 1].weight - set.weight) / sets[index - 1].weight) * 100)}%
                        </span>
                      )}
                    </div>
                  )}

                  <div className={`grid gap-0.5 px-0.5 py-1 items-center rounded-lg transition-colors ${isActive ? GRID_ACTIVE : GRID} ${getRowBg(set)}`}>
                    {/* Set label — tappable in both modes */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center justify-center w-full h-9 active:opacity-60 transition-opacity">
                          <span className={`text-xs font-bold ${color}`}>{label}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="text-xs">
                        <DropdownMenuItem onClick={() => changeSetType(index, "working")}>Working Set</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeSetType(index, "warmup")} className="text-amber-500">Warm-up</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeSetType(index, "failure")} className="text-destructive">Failure Set</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeSetType(index, "dropset")} className="text-purple-400">Drop Set</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Previous */}
                    <span className="text-[11px] text-muted-foreground text-center tracking-wide whitespace-nowrap overflow-hidden">{prevLabel}</span>

                    {/* Weight */}
                    <TapCell
                      value={displayWeight}
                      onTap={(e) => openKb(index, "weight", set.weight, e)}
                      placeholder="0"
                      className={isActiveField("weight") ? "ring-1 ring-primary" : set.type === "failure" ? "text-destructive" : ""}
                    />

                    {/* Reps */}
                    <TapCell
                      value={displayReps}
                      onTap={(e) => openKb(index, "reps", set.reps, e)}
                      placeholder="0"
                      className={isActiveField("reps") ? "ring-1 ring-primary" : ""}
                    />

                    {/* RIR — blank for warmup sets (warmups don't track intensity) */}
                    {set.type === "warmup" ? (
                      <div />
                    ) : (
                      <TapCell
                        value={displayRir}
                        onTap={(e) => openKb(index, "rir", set.rir, e)}
                        placeholder="2"
                        className={isActiveField("rir") ? "ring-1 ring-primary" : ""}
                      />
                    )}

                    {/* 1RM% */}
                    <span className={`text-[10px] font-semibold text-center ${pctColor}`}>{pctLabel}</span>

                    {/* Complete checkbox */}
                    {isActive && (
                      <button onClick={() => toggleComplete(index)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-150 active:scale-90 mx-auto ${
                          set.completed ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                        }`}>
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </SwipeableSetRow>

                {/* Inline rest timer row */}
                <AnimatePresence initial={false}>
                  {showRestEditor && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mx-1 mb-1 px-3 py-2 bg-secondary/30 rounded-lg border border-border/30 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Timer className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">
                              {set.rest_duration_locked ? "Rest (locked)" : "Rest (auto)"}
                            </p>
                            <p className="text-xs font-black text-primary leading-tight">
                              {Math.floor(currentRestDuration / 60)}m {String(currentRestDuration % 60).padStart(2, "0")}s
                            </p>
                          </div>
                        </div>
                        <IosWheelPicker
                          value={currentRestDuration}
                          onChange={(newVal) => {
                            const autoVal = getRestDurationForSet(set.type, movementType);
                            const updated = [...sets];
                            // If user dials back to the auto value, unlock it
                            updated[index] = { ...set, rest_duration: newVal === autoVal ? undefined : newVal, rest_duration_locked: newVal !== autoVal };
                            onChange(updated);
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
        </AnimatePresence>

        {/* Add buttons */}
        <div className="flex gap-1 pt-1 px-1">
          <Button variant="ghost" size="sm" className="text-xs h-6 px-1.5 text-muted-foreground" onClick={() => addSet("working")}>
            <Plus className="w-2.5 h-2.5 mr-0.5" /> Add Set
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-6 px-1.5 text-amber-500" onClick={() => addSet("warmup")}>
            <Flame className="w-2.5 h-2.5 mr-0.5" /> Warm
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-6 px-1.5 text-destructive" onClick={() => addSet("failure")}>
            <Flame className="w-2.5 h-2.5 mr-0.5" /> Fail
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-6 px-1.5 text-purple-400" onClick={() => addSet("dropset")}>
            <ChevronDown className="w-2.5 h-2.5 mr-0.5" /> Drop
          </Button>
        </div>
      </div>

      {/* Custom numeric keyboard */}
      <NumericKeyboard
        visible={!!activeKey}
        value={kbValue}
        onValue={setKbValue}
        onDone={commitKb}
        onNext={commitAndNext}
        isLastField={isLastField}
        label={kbLabel}
        quickAdds={showQuickAdds ? [2.5, 5, 10] : null}
      />

      {/* Backdrop to dismiss keyboard */}
      {activeKey && (
        <div className="fixed inset-0 z-[199]" onPointerDown={commitKb} />
      )}
    </>
  );
}