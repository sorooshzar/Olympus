import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useWeightUnit } from "@/components/utils/useWeightUnit";
import { ACTIVITY_LEVELS, calcBMR, calcTDEE } from "@/components/utils/bmrCalc";

function cmToFtIn(cm) {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}
function ftInToCm(feet, inches) {
  return +((feet * 12 + inches) * 2.54).toFixed(1);
}

// BMR calculator popup. All fields pre-populate from saved biometric data; the
// user only changes what they want. Live BMR + TDEE preview updates as they type.
export default function BmrCalculatorModal({ onClose }) {
  const { unit: weightUnit, toKg, toDisplay } = useWeightUnit();
  const isImperialW = weightUnit === "lbs";

  const { data: user } = useQuery({ queryKey: ["bmrUser"], queryFn: () => base44.auth.me() });
  const { data: bodyWeights = [] } = useQuery({
    queryKey: ["bodyWeights"],
    queryFn: async () => {
      const u = await base44.auth.me();
      return base44.entities.BodyWeight.filter({ created_by: u.email }, "-created_date", 1);
    },
  });

  const latestKg = bodyWeights[0]?.weight;
  const distanceImperial = user?.distance_unit === "imperial";

  const [weightInput, setWeightInput] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [ft, setFt] = useState("");
  const [ins, setIns] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [activity, setActivity] = useState("sedentary");
  const [showInfo, setShowInfo] = useState(false);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (user && !initializedRef.current) {
      initializedRef.current = true;
      const wKg = latestKg || user.weight_kg;
      if (wKg) setWeightInput(isImperialW ? String(Math.round(toDisplay(wKg))) : String(wKg));
      const hCm = user.height_cm;
      if (hCm) {
        setHeightCm(String(hCm));
        if (distanceImperial) {
          const fi = cmToFtIn(hCm);
          setFt(String(fi.feet));
          setIns(String(fi.inches));
        }
      }
      if (user.age) setAge(String(user.age));
      if (user.sex) setSex(user.sex);
      if (user.activity_level) setActivity(user.activity_level);
    }
  }, [user, latestKg]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFt = (v) => { setFt(v); if (v !== "" && ins !== "") setHeightCm(String(ftInToCm(parseInt(v) || 0, parseInt(ins) || 0))); };
  const handleIn = (v) => { setIns(v); if (ft !== "" && v !== "") setHeightCm(String(ftInToCm(parseInt(ft) || 0, parseInt(v) || 0))); };

  const weightKg = useMemo(() => {
    const v = parseFloat(weightInput);
    if (!v) return null;
    return isImperialW ? toKg(v) : v;
  }, [weightInput, isImperialW, toKg]);

  const bmr = useMemo(() => calcBMR({ weightKg, heightCm: parseFloat(heightCm), age: parseInt(age), sex }), [weightKg, heightCm, age, sex]);
  const tdee = useMemo(() => calcTDEE(bmr, activity), [bmr, activity]);

  const handleSave = async () => {
    await base44.auth.updateMe({
      weight_kg: weightKg,
      height_cm: parseFloat(heightCm),
      age: parseInt(age),
      sex,
      activity_level: activity,
      bmr: bmr || null,
    });
    window.dispatchEvent(new CustomEvent("bmrUpdated", { detail: { bmr } }));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-card rounded-3xl border border-border/40 overflow-y-auto" style={{ maxHeight: "88vh" }} onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">BMR Calculator</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowInfo(v => !v)} className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Info className="w-3.5 h-3.5" />
                What is BMR?
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/80">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {showInfo && (
            <div className="bg-secondary/60 rounded-xl p-3 text-xs text-muted-foreground leading-relaxed">
              BMR (Basal Metabolic Rate) is the number of calories your body burns at rest to maintain basic life-sustaining functions like breathing, circulation, and cell production. It represents the minimum energy your body needs if you were to rest all day. Your total daily energy expenditure (TDEE) is your BMR multiplied by your activity level factor.
            </div>
          )}

          {/* Weight */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Weight ({weightUnit})</p>
            <Input type="number" value={weightInput} onChange={e => setWeightInput(e.target.value)} className="bg-secondary border-0" placeholder="0" inputMode="decimal" />
          </div>

          {/* Height */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Height ({distanceImperial ? "ft / in" : "cm"})</p>
            {distanceImperial ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type="number" value={ft} onChange={e => handleFt(e.target.value)} className="bg-secondary border-0 pr-8" placeholder="5" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">ft</span>
                </div>
                <div className="relative flex-1">
                  <Input type="number" value={ins} onChange={e => handleIn(e.target.value)} className="bg-secondary border-0 pr-8" placeholder="11" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">in</span>
                </div>
              </div>
            ) : (
              <Input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} className="bg-secondary border-0" placeholder="175" />
            )}
          </div>

          {/* Age */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Age</p>
            <Input type="number" value={age} onChange={e => setAge(e.target.value)} className="bg-secondary border-0" placeholder="25" inputMode="numeric" />
          </div>

          {/* Gender */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Gender</p>
            <Select value={sex} onValueChange={setSex}>
              <SelectTrigger className="bg-secondary border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Activity Level */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Activity Level</p>
            <Select value={activity} onValueChange={setActivity}>
              <SelectTrigger className="bg-secondary border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_LEVELS.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.label} — {a.desc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Live preview */}
          <div className="bg-primary/10 rounded-xl p-3 text-center space-y-1">
            <p className="text-xs text-muted-foreground">Your BMR</p>
            <p className="text-xl font-black text-primary">{bmr ? `${bmr.toLocaleString()} cal/day` : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Your TDEE</p>
            <p className="text-sm font-bold text-primary">{tdee ? `${tdee.toLocaleString()} cal/day` : "—"}</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 rounded-xl" onClick={handleSave} disabled={!bmr}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}