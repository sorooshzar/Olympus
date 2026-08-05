import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { userStorage } from "@/components/utils/userStorage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, History, X, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useGoalWeight, weeksLabel } from "@/components/utils/useGoalWeight";
import TimelineSelect from "@/components/utils/TimelineSelect";

const BODY_PARTS = [
  "Height", "Neck", "Shoulders", "Chest", "Upper Arm", "Forearm",
  "Waist", "Hips", "Thigh", "Calf",
];

// Height conversion helpers
function cmToFtIn(cm) {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}
function ftInToCm(feet, inches) {
  return +((feet * 12 + inches) * 2.54).toFixed(1);
}
function formatHeight(valueCm, isImperial) {
  if (!valueCm) return "--";
  if (!isImperial) return `${parseFloat(valueCm).toFixed(1)} cm`;
  const { feet, inches } = cmToFtIn(valueCm);
  return `${feet}'${inches}"`;
}

function HistoryPanel({ part, measurements, isImperial, onClose }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const entries = measurements
    .filter(m => m.body_part === part)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const saveEdit = async (m) => {
    await base44.entities.BodyMeasurement.update(m.id, { value: parseFloat(editValue) });
    queryClient.invalidateQueries({ queryKey: ["bodyMeasurements"] });
    setEditingId(null);
  };

  const deleteEntry = async (m) => {
    await base44.entities.BodyMeasurement.delete(m.id);
    queryClient.invalidateQueries({ queryKey: ["bodyMeasurements"] });
  };

  const displayVal = (m) => {
    if (part === "Height" && isImperial) {
      // stored in cm, display as ft'in"
      return formatHeight(m.value, true);
    }
    return `${parseFloat(m.value).toFixed(1)} ${m.unit}`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      className="mt-2 mb-3 bg-secondary/60 rounded-xl p-3 border border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">History — {part}</p>
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {entries.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No history yet</p>}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {entries.map(m => (
          <div key={m.id} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20 shrink-0">{format(new Date(m.date), "MMM d, yyyy")}</span>
            {editingId === m.id ? (
              <>
                <Input type="number" step="0.1" value={editValue} onChange={e => setEditValue(e.target.value)}
                  className="h-6 text-xs bg-card border-border px-2 flex-1" autoFocus />
                <button onClick={() => saveEdit(m)} className="text-xs text-primary font-semibold px-1">Save</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground px-1">✕</button>
              </>
            ) : (
              <>
                <span className="text-xs font-medium flex-1">{displayVal(m)}</span>
                <button onClick={() => { setEditingId(m.id); setEditValue(String(m.value)); }} className="text-[10px] text-primary px-1">Edit</button>
                <button onClick={() => deleteEntry(m)} className="text-[10px] text-destructive px-1 active:opacity-60 transition-opacity">Del</button>
              </>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Height input component for ft+in or cm
function HeightLogInput({ value, onChange, isImperial }) {
  const [ft, setFt] = useState("");
  const [ins, setIns] = useState("");

  if (!isImperial) {
    return (
      <div className="relative flex-1">
        <Input type="number" placeholder="175.0" value={value} onChange={e => onChange(e.target.value)}
          className="h-8 text-sm bg-secondary border-0 pr-10" autoFocus />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">cm</span>
      </div>
    );
  }

  const handleFt = (v) => { setFt(v); if (v && ins !== "") onChange(ftInToCm(parseInt(v) || 0, parseInt(ins) || 0)); };
  const handleIn = (v) => { setIns(v); if (ft !== "") onChange(ftInToCm(parseInt(ft) || 0, parseInt(v) || 0)); };

  return (
    <div className="flex gap-1 flex-1">
      <div className="relative flex-1">
        <Input type="number" placeholder="5" min="3" max="8" value={ft} onChange={e => handleFt(e.target.value)}
          className="h-8 text-sm bg-secondary border-0 pr-6" autoFocus />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">ft</span>
      </div>
      <div className="relative flex-1">
        <Input type="number" placeholder="11" min="0" max="11" value={ins} onChange={e => handleIn(e.target.value)}
          className="h-8 text-sm bg-secondary border-0 pr-6" />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">in</span>
      </div>
    </div>
  );
}

// Goal weight panel — uses the shared useGoalWeight hook so the goal weight +
// timeline are synced server-side with the Profile stats page.
function GoalWeightPanel({ isImperial }) {
  const { goalKg, weeks, saveGoal } = useGoalWeight();
  const [goalInput, setGoalInput] = useState("");
  const [editWeeks, setEditWeeks] = useState(weeks);
  const [editing, setEditing] = useState(false);

  useEffect(() => { setEditWeeks(weeks); }, [weeks]);

  const { data: bodyWeights = [] } = useQuery({
    queryKey: ["bodyWeights"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.BodyWeight.filter({ created_by: user.email }, "-created_date", 1);
    },
  });

  const currentKg = bodyWeights[0]?.weight;
  const displayGoal = goalKg
    ? isImperial ? `${(goalKg * 2.20462).toFixed(1)} lbs` : `${goalKg} kg`
    : null;

  const advice = (() => {
    if (!goalKg || !currentKg || !weeks) return null;
    const diffKg = goalKg - currentKg;
    const days = weeks * 7;
    const dailyAdjust = Math.round((diffKg * 7700) / days);
    return { dailyAdjust, direction: diffKg > 0 ? "surplus" : "deficit", diffKg };
  })();

  const handleSave = () => {
    const val = parseFloat(goalInput);
    if (!val) return;
    const kg = isImperial ? +(val / 2.20462).toFixed(2) : val;
    saveGoal(kg, editWeeks);
    setEditing(false);
    setGoalInput("");
  };

  const handleClear = () => {
    saveGoal(null, editWeeks);
    setEditing(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" /> Goal Weight
        </h2>
        <button onClick={() => setEditing(v => !v)} className="text-xs text-primary font-semibold">
          {editing ? "Cancel" : goalKg ? "Edit" : "Set Goal"}
        </button>
      </div>

      {goalKg && !editing && (
        <div className="space-y-2 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Target</span>
            <span className="text-sm font-bold">{displayGoal}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Timeline</span>
            <span className="text-sm font-bold">{weeksLabel(weeks)}</span>
          </div>
          {advice && (
            <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${advice.direction === "deficit" ? "bg-orange-500/10 text-orange-400" : "bg-green-500/10 text-green-400"}`}>
              {advice.direction === "deficit" ? "🔥" : "💪"} Daily {advice.direction} of <strong>{Math.abs(advice.dailyAdjust)} kcal</strong>
            </div>
          )}
        </div>
      )}

      {!goalKg && !editing && (
        <p className="text-xs text-muted-foreground">Set a goal weight to get daily calorie advice.</p>
      )}

      {editing && (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Goal weight ({isImperial ? "lbs" : "kg"})</p>
            <div className="flex items-center bg-secondary rounded-xl overflow-hidden">
              <input type="number" step="0.5" placeholder={isImperial ? "155" : "70"}
                value={goalInput} onChange={e => setGoalInput(e.target.value)}
                className="flex-1 h-10 bg-transparent px-4 text-sm font-bold focus:outline-none" />
              <span className="px-3 text-xs text-muted-foreground">{isImperial ? "lbs" : "kg"}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Timeline</p>
            <TimelineSelect value={editWeeks} onChange={setEditWeeks} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleSave} disabled={!goalInput}>Save</Button>
            {goalKg && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Measurements() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addingPart, setAddingPart] = useState(null);
  const [historyPart, setHistoryPart] = useState(null);
  const [newValue, setNewValue] = useState("");
  const [newFt, setNewFt] = useState("");
  const [newIn, setNewIn] = useState("");
  const [unit, setUnit] = useState(() => {
    const saved = userStorage.getItem("gym-weight-unit");
    return saved === "lbs" ? "in" : "cm";
  });
  const [weightInput, setWeightInput] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);

  const isImperial = unit === "in";
  const weightUnit = isImperial ? "lbs" : "kg";
  const lengthUnit = isImperial ? "in" : "cm";

  const { data: bodyWeights = [] } = useQuery({
    queryKey: ["bodyWeights"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.BodyWeight.filter({ created_by: user.email }, "-created_date", 50);
    },
  });

  const { data: bodyMeasurements = [] } = useQuery({
    queryKey: ["bodyMeasurements"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.BodyMeasurement.filter({ created_by: user.email }, "-date", 500);
    },
  });

  const latestByPart = {};
  bodyMeasurements.forEach(m => {
    if (!latestByPart[m.body_part]) latestByPart[m.body_part] = m;
  });

  const latestWeight = bodyWeights[0];

  const saveWeight = async () => {
    if (!weightInput) return;
    setSavingWeight(true);
    // Always store in kg
    const kg = isImperial ? +(parseFloat(weightInput) / 2.20462).toFixed(2) : parseFloat(weightInput);
    await base44.entities.BodyWeight.create({ weight: kg, unit: "kg", date: new Date().toISOString().split("T")[0] });
    queryClient.invalidateQueries({ queryKey: ["bodyWeights"] });
    setSavingWeight(false);
    setWeightInput("");
  };

  const logMeasurement = async (part) => {
    let valueToStore;
    if (part === "Height" && isImperial) {
      // stored in cm
      valueToStore = ftInToCm(parseInt(newFt) || 0, parseInt(newIn) || 0);
    } else {
      if (!newValue) return;
      valueToStore = parseFloat(newValue);
    }
    if (!valueToStore) return;
    await base44.entities.BodyMeasurement.create({
      body_part: part,
      value: valueToStore,
      unit: part === "Height" ? "cm" : lengthUnit,
      date: new Date().toISOString().split("T")[0],
    });
    setAddingPart(null);
    setNewValue(""); setNewFt(""); setNewIn("");
    queryClient.invalidateQueries({ queryKey: ["bodyMeasurements"] });
  };

  const displayLatest = (part, m) => {
    if (!m) return "--";
    if (part === "Height") return formatHeight(m.value, isImperial);
    const val = isImperial && m.unit === "cm" ? (parseFloat(m.value) / 2.54).toFixed(1) : parseFloat(m.value).toFixed(1);
    return `${val} ${isImperial ? "in" : "cm"}`;
  };

  const displayWeight = latestWeight
    ? isImperial
      ? `${(parseFloat(latestWeight.weight) * 2.20462).toFixed(1)} lbs`
      : `${parseFloat(latestWeight.weight).toFixed(1)} kg`
    : "--";

  return (
    <div className="max-w-lg mx-auto px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold flex-1">Measurements</h1>
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {[{ id: "cm", label: "Metric" }, { id: "in", label: "Imperial" }].map((u) => (
            <button key={u.id} onClick={() => setUnit(u.id)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${unit === u.id ? "bg-primary text-white" : "text-muted-foreground"}`}>
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* Goal Weight */}
      <GoalWeightPanel isImperial={isImperial} />

      {/* Weight */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Current Weight</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-2xl font-bold">{displayWeight}</p>
            {latestWeight && <p className="text-xs text-muted-foreground">{format(new Date(latestWeight.date), "MMM d, yyyy")}</p>}
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Input type="number" step="0.1" placeholder="0.0" value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                className="w-24 h-9 text-sm bg-secondary border-0 text-center pr-7" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{weightUnit}</span>
            </div>
            <Button size="sm" className="h-9 px-3" onClick={saveWeight} disabled={!weightInput || savingWeight}>
              {savingWeight ? "..." : "Log"}
            </Button>
          </div>
        </div>
      </div>

      {/* Body Measurements */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Body Measurements</h2>
        <div className="space-y-0">
          {BODY_PARTS.map((part) => {
            const latest = latestByPart[part];
            const isAdding = addingPart === part;
            const isHistory = historyPart === part;

            return (
              <div key={part}>
                <div className="flex items-center py-3 gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-medium">{part}</span>
                    {latest && <span className="text-xs text-muted-foreground ml-2 font-medium">{displayLatest(part, latest)}</span>}
                    {!latest && <span className="text-xs text-muted-foreground/50 ml-2">—</span>}
                  </div>
                  <button
                    onClick={() => setHistoryPart(isHistory ? null : part)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isHistory ? "bg-primary/20 text-primary scale-110" : "bg-secondary text-muted-foreground"}`}>
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setAddingPart(isAdding ? null : part); setHistoryPart(null); setNewValue(""); setNewFt(""); setNewIn(""); }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isAdding ? "bg-primary text-white scale-110" : "bg-secondary text-primary"}`}>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <AnimatePresence>
                  {isHistory && (
                    <HistoryPanel part={part} measurements={bodyMeasurements} isImperial={isImperial} onClose={() => setHistoryPart(null)} />
                  )}
                  {isAdding && (
                    <motion.div key="addinput" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="flex gap-2 pb-3 pl-1">
                        {part === "Height" && isImperial ? (
                          <>
                            <div className="relative flex-1">
                              <Input type="number" placeholder="5" min="3" max="8" value={newFt} onChange={e => setNewFt(e.target.value)}
                                className="h-8 text-sm bg-secondary border-0 pr-6" autoFocus />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ft</span>
                            </div>
                            <div className="relative flex-1">
                              <Input type="number" placeholder="11" min="0" max="11" value={newIn} onChange={e => setNewIn(e.target.value)}
                                className="h-8 text-sm bg-secondary border-0 pr-6" />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">in</span>
                            </div>
                          </>
                        ) : (
                          <div className="relative flex-1">
                            <Input type="number" placeholder="0.0" value={newValue} onChange={e => setNewValue(e.target.value)}
                              className="h-8 text-sm bg-secondary border-0 pr-10" autoFocus />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                              {part === "Height" ? "cm" : lengthUnit}
                            </span>
                          </div>
                        )}
                        <Button size="sm" className="h-8 px-3" onClick={() => logMeasurement(part)}>Log</Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setAddingPart(null)}>✕</Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="h-px bg-border" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}