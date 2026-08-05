import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ArrowLeftRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useWeightUnit } from "@/components/utils/useWeightUnit";

const MODES = ["Regular", "Plate", "1RM", "Unit"];

// IPF Standard Plate Colors
const PLATE_COLORS = {
  55: "#C41E3A", // Red (55lb)
  45: "#0047AB", // Blue (45lb)
  35: "#FFD700", // Yellow (35lb)
  25: "#228B22", // Green (25lb)
  10: "#FFFFFF", // White (10lb)
  5: "#FF0000",  // Red (5lb)
  2.5: "#0047AB", // Blue (2.5lb)
};

const BAR_TYPES = {
  standard: { name: "Standard Barbell", weight_kg: 20, weight_lbs: 45, plates: [45, 35, 25, 10, 5, 2.5] },
  womens: { name: "Women's Barbell", weight_kg: 15, weight_lbs: 35, plates: [35, 25, 10, 5, 2.5] },
  ezbar: { name: "EZ Bar", weight_kg: 10, weight_lbs: 25, plates: [25, 10, 5, 2.5] },
};

const REP_MAXES = [
  { pct: 115, reps: "--" },
  { pct: 100, reps: 1 },
  { pct: 95, reps: 2 },
  { pct: 90, reps: "3-4" },
  { pct: 85, reps: 6 },
  { pct: 80, reps: "8-10" },
  { pct: 75, reps: 12 },
  { pct: 70, reps: 15 },
  { pct: 65, reps: "18-20" },
  { pct: 60, reps: "20-25" },
  { pct: 55, reps: "25-30" },
  { pct: 50, reps: "30-40" },
];

const UNIT_CONVERSIONS = {
  weight: {
    kg: { label: "kg", factor: 1 },
    lbs: { label: "lbs", factor: 2.20462 },
    g: { label: "g", factor: 1000 },
    oz: { label: "oz", factor: 35.274 },
  },
  volume: {
    ml: { label: "ml", factor: 1 },
    l: { label: "L", factor: 0.001 },
    oz: { label: "fl oz", factor: 0.033814 },
    cup: { label: "cup", factor: 0.004167 },
  },
  length: {
    cm: { label: "cm", factor: 1 },
    m: { label: "m", factor: 0.01 },
    in: { label: "in", factor: 0.393701 },
    ft: { label: "ft", factor: 0.0328084 },
  },
};

function RegularMode() {
  const [expression, setExpression] = useState("0");
  const [result, setResult] = useState(null);

  const handleNum = (num) => {
    if (expression === "0") {
      setExpression(String(num));
    } else {
      setExpression(expression + num);
    }
    setResult(null);
  };

  const handleDecimal = () => {
    const lastNum = expression.split(/[+\-×÷]/).pop();
    if (!lastNum.includes(".")) {
      setExpression(expression + ".");
    }
  };

  const handleOperation = (op) => {
    if (expression && !expression.endsWith(" ")) {
      setExpression(expression + " " + op + " ");
    }
  };

  const handleEquals = () => {
    try {
      const evalStr = expression.replace(/×/g, "*").replace(/÷/g, "/");
      const res = eval(evalStr);
      setResult(String(res));
      setExpression(String(res));
    } catch (e) {
      setResult("Error");
    }
  };

  const handleClear = () => {
    setExpression("0");
    setResult(null);
  };

  const handlePercent = () => {
    try {
      const parts = expression.split(/[+\-×÷]/);
      if (parts.length >= 2) {
        const lastPart = parseFloat(parts[parts.length - 1]);
        const firstPart = parseFloat(parts[0]);
        const percentage = (firstPart * (lastPart / 100)).toFixed(2);
        setExpression(expression.slice(0, expression.lastIndexOf(" ") + 1) + percentage);
      }
    } catch (e) {}
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-6 space-y-2">
        <p className="text-sm text-muted-foreground text-right">{expression}</p>
        <p className="text-4xl font-bold text-primary text-right break-words">{result || expression}</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {/* Row 1 */}
        {[7, 8, 9, "/"].map(v => (
          <button key={v} onClick={() => v === "/" ? handleOperation("÷") : handleNum(v)}
            className="h-14 bg-secondary rounded-xl font-bold text-lg hover:bg-secondary/80 active:scale-95">
            {v === "/" ? "÷" : v}
          </button>
        ))}
        {/* Row 2 */}
        {[4, 5, 6, "*"].map(v => (
          <button key={v} onClick={() => v === "*" ? handleOperation("×") : handleNum(v)}
            className="h-14 bg-secondary rounded-xl font-bold text-lg hover:bg-secondary/80 active:scale-95">
            {v === "*" ? "×" : v}
          </button>
        ))}
        {/* Row 3 */}
        {[1, 2, 3, "-"].map(v => (
          <button key={v} onClick={() => v === "-" ? handleOperation("-") : handleNum(v)}
            className="h-14 bg-secondary rounded-xl font-bold text-lg hover:bg-secondary/80 active:scale-95">
            {v}
          </button>
        ))}
        {/* Row 4 */}
        <button onClick={() => handleNum(0)} className="h-14 bg-secondary rounded-xl font-bold text-lg hover:bg-secondary/80 active:scale-95">0</button>
        <button onClick={handleDecimal} className="h-14 bg-secondary rounded-xl font-bold text-lg hover:bg-secondary/80 active:scale-95">.</button>
        <button onClick={handlePercent} className="h-14 bg-secondary rounded-xl font-bold text-lg hover:bg-secondary/80 active:scale-95">%</button>
        <button onClick={() => handleOperation("+")} className="h-14 bg-secondary rounded-xl font-bold text-lg hover:bg-secondary/80 active:scale-95">+</button>
        {/* Row 5 */}
        <button onClick={handleClear} className="h-14 bg-destructive/20 text-destructive rounded-xl font-bold text-lg hover:bg-destructive/30 active:scale-95">C</button>
        <button onClick={() => {}} className="h-14 bg-secondary rounded-xl font-bold text-lg hover:bg-secondary/80 active:scale-95 opacity-0 pointer-events-none"></button>
        <button onClick={() => {}} className="h-14 bg-secondary rounded-xl font-bold text-lg hover:bg-secondary/80 active:scale-95 opacity-0 pointer-events-none"></button>
        <button onClick={handleEquals} className="h-14 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 active:scale-95">=</button>
      </div>
    </div>
  );
}

function PlateMode() {
  const { unit: weightUnit } = useWeightUnit();
  const [barType, setBarType] = useState("standard");
  const [target, setTarget] = useState("");
  const [use55lb, setUse55lb] = useState(false);

  const bar = BAR_TYPES[barType];
  const barWeight = weightUnit === "lbs" ? bar.weight_lbs : bar.weight_kg;
  const availablePlates = use55lb ? [55, ...bar.plates] : bar.plates;

  const calculatePlates = () => {
    if (!target) return null;
    const targetVal = parseFloat(target);
    const sideWeight = (targetVal - barWeight) / 2;
    if (sideWeight < 0) return { breakdown: [], sideWeight, remainder: 0 };
    const breakdown = [];
    let remaining = sideWeight;
    for (const plate of availablePlates) {
      const count = Math.floor(remaining / plate);
      if (count > 0) {
        breakdown.push({ plate, count });
        remaining -= plate * count;
      }
    }
    return { breakdown, sideWeight, remainder: remaining };
  };

  const result = calculatePlates();
  const plateHeights = { 55: 28, 45: 28, 35: 24, 25: 21, 10: 18, 5: 16, 2.5: 16 };

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Bar Type</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(BAR_TYPES).map(([k, v]) => (
              <button key={k} onClick={() => setBarType(k)}
                className={`px-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${barType === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {v.name.split(" ")[0]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Bar weight: <span className="font-semibold text-foreground">{barWeight} {weightUnit}</span></p>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Target Total</label>
          <div className="relative">
            <input type="number" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)}
              placeholder={weightUnit === "kg" ? "100" : "220"}
              className="w-full bg-secondary border-0 rounded-xl px-4 py-3.5 text-lg font-bold pr-14 focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">{weightUnit}</span>
          </div>
        </div>

        <button onClick={() => setUse55lb(!use55lb)} className="w-full flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
          <span className="text-sm font-semibold">Include 55 lb plates</span>
          <div className={`w-10 h-6 rounded-full transition-colors relative ${use55lb ? "bg-primary" : "bg-muted"}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${use55lb ? "left-[18px]" : "left-0.5"}`} />
          </div>
        </button>
      </div>

      {/* Results */}
      {result && result.breakdown.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
          <div className="flex items-end justify-between border-b border-border pb-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Weight</p>
              <p className="text-3xl font-bold text-primary mt-0.5">{target} <span className="text-base text-muted-foreground font-semibold">{weightUnit}</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Per side</p>
              <p className="text-lg font-bold">{result.sideWeight.toFixed(1)} {weightUnit}</p>
            </div>
          </div>

          {/* Plate visualization */}
          <div className="flex items-end justify-center gap-1 py-2 min-h-[36px]">
            {result.breakdown.flatMap((p, idx) =>
              [...Array(p.count)].map((_, i) => (
                <div key={`${idx}-${i}`}
                  style={{ width: "14px", height: `${plateHeights[p.plate]}px`, backgroundColor: PLATE_COLORS[p.plate], border: p.plate === 10 ? "1px solid hsl(var(--border))" : "none", borderRadius: "6px" }}
                />
              ))
            )}
          </div>

          {/* Per-side breakdown */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Per Side</p>
            <div className="space-y-2">
              {result.breakdown.map(p => (
                <div key={p.plate} className="flex items-center gap-3 bg-secondary/50 rounded-xl px-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px]" style={{ backgroundColor: PLATE_COLORS[p.plate], color: p.plate === 10 ? "#000" : "#fff" }}>{p.plate}</div>
                  <span className="flex-1 text-sm font-semibold">{p.count} × {p.plate} {weightUnit}</span>
                  <span className="text-sm text-muted-foreground font-medium">{(p.count * p.plate).toFixed(p.plate < 10 ? 1 : 0)} {weightUnit}</span>
                </div>
              ))}
            </div>
            {result.remainder > 0 && (
              <p className="text-xs text-amber-500 mt-2 text-center">Can't load exact weight — {result.remainder.toFixed(2)} {weightUnit} left per side.</p>
            )}
          </div>
        </div>
      ) : target && result && result.breakdown.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No standard plate combination found for this target.</p>
        </div>
      ) : null}
    </div>
  );
}

function OneRMMode() {
  const { unit: weightUnit } = useWeightUnit();
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rir, setRir] = useState("0");

  const calculate1RM = () => {
    if (!weight || !reps) return null;
    const w = parseFloat(weight);
    const r = parseInt(reps) + parseInt(rir);

    const brzycki = w * (36 / (37 - r));
    const epley = w * (1 + r / 30);
    const lander = (100 * w) / (101.3 - 2.67123 * r);

    return (brzycki + epley + lander) / 3;
  };

  const oneRMVal = calculate1RM();
  const oneRM = oneRMVal ? oneRMVal.toFixed(1) : null;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div>
          <label className="text-sm font-semibold mb-2 block">Weight ({weightUnit})</label>
          <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
            placeholder={weightUnit === "lbs" ? "e.g. 175" : "e.g. 80"} className="w-full bg-secondary border-0 rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold mb-2 block">Reps</label>
            <input type="number" value={reps} onChange={e => setReps(e.target.value)}
              placeholder="e.g. 5" className="w-full bg-secondary border-0 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">RIR</label>
            <input type="number" value={rir} onChange={e => setRir(e.target.value)}
              placeholder="e.g. 0" className="w-full bg-secondary border-0 rounded-lg px-3 py-2.5 text-sm" />
          </div>
        </div>
      </div>

      {oneRM && (
        <>
          <div className="bg-card rounded-2xl border border-border p-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Estimated 1RM</p>
            <p className="text-5xl font-bold text-primary">{oneRM}</p>
            <p className="text-xs text-muted-foreground">{weightUnit} (avg of 3 formulas)</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 text-muted-foreground font-semibold">%</th>
                  <th className="text-left py-2 text-muted-foreground font-semibold">Weight</th>
                  <th className="text-left py-2 text-muted-foreground font-semibold">Reps</th>
                </tr>
              </thead>
              <tbody>
                {REP_MAXES.map(({ pct, reps }) => {
                   const weight = (oneRMVal * (pct / 100)).toFixed(1);
                   return (
                     <tr key={pct} className="border-b border-border/30 hover:bg-secondary/30">
                       <td className="py-2 font-semibold">{pct}%</td>
                       <td className="py-2">{weight} {weightUnit}</td>
                       <td className="py-2 text-muted-foreground">{reps}</td>
                     </tr>
                   );
                 })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function UnitConverter() {
  const [category, setCategory] = useState("weight");
  const [fromUnit, setFromUnit] = useState("kg");
  const [toUnit, setToUnit] = useState("lbs");
  const [value, setValue] = useState("");

  const units = UNIT_CONVERSIONS[category];
  const unitKeys = Object.keys(units);
  const numValue = parseFloat(value);
  const result = value && !isNaN(numValue)
    ? (numValue / units[fromUnit].factor) * units[toUnit].factor
    : null;

  const swap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    if (result != null) setValue(result.toFixed(4));
  };

  return (
    <div className="space-y-4">
      {/* Category toggle */}
      <div className="bg-card rounded-2xl border border-border p-2">
        <div className="grid grid-cols-3 gap-1">
          {["weight", "volume", "length"].map(cat => (
            <button key={cat} onClick={() => { setCategory(cat); setValue(""); setFromUnit(Object.keys(UNIT_CONVERSIONS[cat])[0]); setToUnit(Object.keys(UNIT_CONVERSIONS[cat])[1]); }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${category === cat ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Conversion panels */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          {/* From */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</label>
            <input type="number" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)}
              placeholder="0"
              className="w-full bg-secondary border-0 rounded-xl px-3 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <select value={fromUnit} onChange={e => setFromUnit(e.target.value)}
              className="w-full bg-secondary border-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-center focus:outline-none">
              {unitKeys.map(u => <option key={u} value={u}>{units[u].label}</option>)}
            </select>
          </div>

          {/* Swap */}
          <div className="flex items-center justify-center pt-6">
            <button onClick={swap} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-90 transition-transform">
              <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* To */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</label>
            <div className="w-full bg-primary/10 rounded-xl px-3 py-3 text-2xl font-bold text-center text-primary min-h-[52px] flex items-center justify-center">
              {result != null ? result.toFixed(2) : "—"}
            </div>
            <select value={toUnit} onChange={e => setToUnit(e.target.value)}
              className="w-full bg-secondary border-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-center focus:outline-none">
              {unitKeys.map(u => <option key={u} value={u}>{units[u].label}</option>)}
            </select>
          </div>
        </div>

        {result != null && (
          <p className="text-sm text-muted-foreground text-center pt-1">
            <span className="font-semibold text-foreground">{value}</span> {units[fromUnit].label} = <span className="font-semibold text-primary">{result.toFixed(4)}</span> {units[toUnit].label}
          </p>
        )}
      </div>
    </div>
  );
}



export default function Calculator() {
  const [mode, setMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    return MODES.includes(t) ? t : "Regular";
  });
  const backTo = (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("from") || "Lifts";
  })();

  return (
    <div className="max-w-lg mx-auto pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 pt-5 pb-4 border-b border-border/30">
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl(backTo)}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Calculator</h1>
        </div>

        {/* Mode selector */}
        <div className="flex gap-1.5 flex-wrap">
          {MODES.map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === m ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-6 pb-6">
        {mode === "Regular" && <RegularMode />}
        {mode === "Plate" && <PlateMode />}
        {mode === "1RM" && <OneRMMode />}
        {mode === "Unit" && <UnitConverter />}
      </div>
    </div>
  );
}