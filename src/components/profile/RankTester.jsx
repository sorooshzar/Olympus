import React, { useState, useMemo } from "react";
import { X, FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RANKS } from "@/components/utils/rankEngine";
import { calculateExerciseRank, indexStandards } from "@/components/utils/strengthStandards";
import { useWeightUnit } from "@/components/utils/useWeightUnit";

// Rank Tester uses the SAME StrengthStandard engine as the backend
// (calculateRanks) and WorkoutSummary: bodyweight-bracket thresholds in lb,
// explicit tier order (olympian → bronze), kg→lb conversion. It does NOT use
// the legacy ratio-based rankEngine thresholds.
export default function RankTester({ onClose, bodyWeightKg, gender = "male" }) {
  const [search, setSearch] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rir, setRir] = useState("0");
  const { unit, toKg, toDisplay } = useWeightUnit();

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => base44.entities.Exercise.list(null, 500),
  });

  const { data: standards = [] } = useQuery({
    queryKey: ["strengthStandards"],
    queryFn: () => base44.entities.StrengthStandard.list(null, 500),
  });

  const standardsMap = useMemo(() => indexStandards(standards), [standards]);

  // Only show exercises that are rankable AND have a matching strength standard.
  const rankableExercises = useMemo(() =>
    exercises.filter(ex => ex.is_rankable && ex.rankable_standard_name && standardsMap[ex.rankable_standard_name]),
    [exercises, standardsMap]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return rankableExercises;
    return rankableExercises
      .filter(ex => ex.name.toLowerCase().includes(search.toLowerCase()));
  }, [rankableExercises, search]);

  const rank = useMemo(() => {
    if (!selectedExercise || !weight || !reps) return null;
    const weightKg = toKg(parseFloat(weight));
    const repsNum = parseInt(reps);
    const rirNum = parseInt(rir) || 0;
    if (!weightKg || !repsNum || repsNum < 1) return null;
    const standard = standardsMap[selectedExercise.rankable_standard_name];
    if (!standard) return null;
    // Epley with RIR: effective reps = reps + rir (matches the tester's intent;
    // rir=0 reproduces the backend's raw-reps e1RM exactly).
    const set = { weight: weightKg, reps: repsNum + rirNum, completed: true, type: "working" };
    const bwKg = bodyWeightKg && bodyWeightKg > 0 ? bodyWeightKg : 80;
    const result = calculateExerciseRank(selectedExercise, [set], standard, gender, bwKg, "kg");
    if (!result.rank) return null;
    return { tier: result.rank, e1rmKg: (result.best_metric || 0) / 2.20462, rankObj: RANKS.find(r => r.name === result.rank) };
  }, [selectedExercise, weight, reps, rir, bodyWeightKg, gender, standardsMap, toKg]);

  const handleSelectExercise = (ex) => {
    setSelectedExercise(ex);
    setSearch(ex.name);
    setShowDropdown(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onClick={onClose}>
      <div className="bg-card w-full max-w-sm rounded-3xl border border-border shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold">Rank Tester</h2>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/80">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="overflow-y-auto px-5 py-5 space-y-4">
        {/* Exercise Selector */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Exercise</label>
          <div className="relative">
            <Input
              placeholder="Search exercises..."
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true); setSelectedExercise(null); }}
              onFocus={() => setShowDropdown(true)}
              className="bg-secondary border-0 h-11"
            />
            {showDropdown && search.length > 0 && filtered.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-xl max-h-52 overflow-y-auto">
                {filtered.map(ex => (
                  <button
                    key={ex.id}
                    onMouseDown={() => handleSelectExercise(ex)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors border-b border-border/30 last:border-0"
                  >
                    <span className="font-medium">{ex.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{ex.primary_muscle}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedExercise && (
            <p className="text-xs text-muted-foreground mt-1 ml-1">
              Muscle: <span className="text-foreground font-semibold">{selectedExercise.primary_muscle}</span>
            </p>
          )}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Weight ({unit})</label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="bg-secondary border-0 h-11 text-center font-semibold"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Reps</label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={reps}
              onChange={e => setReps(e.target.value)}
              className="bg-secondary border-0 h-11 text-center font-semibold"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">RIR</label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={rir}
              onChange={e => setRir(e.target.value)}
              className="bg-secondary border-0 h-11 text-center font-semibold"
            />
          </div>
        </div>

        {/* Result */}
        {rank ? (
          <div
            className="mt-2 rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-300"
            style={{ backgroundColor: rank.rankObj.color + "22", border: `2px solid ${rank.rankObj.color}` }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shadow-lg"
              style={{ backgroundColor: rank.rankObj.color, color: rank.rankObj.textColor }}
            >
              {rank.rankObj.label[0]}
            </div>
            <p className="text-xl font-black tracking-wide" style={{ color: rank.rankObj.color }}>{rank.rankObj.label}</p>
            <p className="text-[11px] text-muted-foreground">Est. 1RM: {toDisplay(rank.e1rmKg).toFixed(1)} {unit}</p>
            <p className="text-xs text-muted-foreground text-center">{rank.rankObj.description}</p>
          </div>
        ) : (
          <div className="mt-2 rounded-2xl p-5 flex flex-col items-center gap-2 bg-secondary/50 border border-border/40">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <FlaskConical className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {!selectedExercise ? "Select a rankable exercise to get started" : "Enter weight and reps to see your rank"}
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}