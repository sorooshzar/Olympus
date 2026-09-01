import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Scale, ChevronRight, Settings, X, Target, Plus, Ruler, Users, FlaskConical } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MedalsBook from "../components/profile/MedalsBook";
import MuscleModel from "../components/profile/MuscleModel";
import WeightChart from "../components/profile/WeightChart";
import RankLegend from "../components/profile/RankLegend";
import SettingsPanel, { applyTheme } from "../components/profile/SettingsPanel";
import { Switch } from "@/components/ui/switch";

import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import AddTrackerModal from "../components/profile/AddTrackerModal";
import { MeasurementTracker, ExerciseTracker, HabitsTracker, MacrosTracker } from "../components/profile/TrackerWidgets";
import { useWeightUnit } from "@/components/utils/useWeightUnit";
import { userStorage } from "@/components/utils/userStorage";
import { useGoalWeight } from "@/components/utils/useGoalWeight";
import TimelineSelect from "@/components/utils/TimelineSelect";
import { computeRecovery } from "@/components/utils/recoveryEngine";

import MuscleRankModal from "../components/profile/MuscleRankModal";
import RankTester from "../components/profile/RankTester";
import NutritionRankCard from "../components/macros/NutritionRank";
import { computeNutritionStreak } from "../components/macros/NutritionRank";
import ProfilePictureModal from "../components/profile/ProfilePictureModal";
import FirstVisitTooltip from "@/components/info/FirstVisitTooltip";



function LogWeightModal({ onClose }) {
  const [weight, setWeight] = useState("");
  // Use local date (not UTC) to avoid timezone-off-by-one
  const todayLocal = new Date();
  const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, "0")}-${String(todayLocal.getDate()).padStart(2, "0")}`;
  const [date, setDate] = useState(todayStr);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { unit, toKg } = useWeightUnit();

  const handleSave = async () => {
    if (!weight) return;
    setSaving(true);
    // Always store in kg (base unit)
    const kgWeight = toKg(parseFloat(weight));
    await base44.entities.BodyWeight.create({ weight: kgWeight, unit: "kg", date });
    queryClient.invalidateQueries({ queryKey: ["bodyWeights"] });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={onClose}>
      <div className="bg-card w-full max-w-sm rounded-t-3xl sm:rounded-3xl border-t sm:border border-border/50 p-5 space-y-4"
        onClick={e => e.stopPropagation()}>
        {/* iOS drag handle */}
        <div className="w-9 h-1 bg-muted-foreground/25 rounded-full mx-auto -mt-1 mb-2" />
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Log Weight ({unit})</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-secondary/80">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        <Input type="number" step="0.1" placeholder={unit === "lbs" ? "176.0" : "80.0"} value={weight}
          onChange={e => setWeight(e.target.value)}
          className="text-center text-2xl font-bold h-14 bg-secondary border-0" autoFocus />
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-secondary border-0" />
        <Button onClick={handleSave} disabled={!weight || saving} className="w-full h-11 rounded-xl font-semibold">
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function ProfileInfoPanel({ user, onClose, xp, profilePictureUrl }) {
  const handleSignOut = () => {
    base44.auth.logout();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-lg bg-card rounded-t-3xl border-t border-border/40 overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "88vh" }}>

        <div className="p-6 pb-8 space-y-4">
          {/* iOS drag handle */}
          <div className="w-9 h-1 bg-muted-foreground/25 rounded-full mx-auto -mt-1 mb-1" />
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Account</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/80">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* User identity */}
          <div className="flex items-center gap-3 bg-secondary rounded-2xl px-4 py-3.5">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              {profilePictureUrl || user?.profile_picture_url ? (
                <img 
                  src={profilePictureUrl || user?.profile_picture_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-primary">{user?.full_name?.[0]?.toUpperCase() || "A"}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {user?.full_name && <p className="text-sm font-bold truncate">{user.full_name}</p>}
              {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
            </div>
          </div>

          {/* Level card */}
          <div className="bg-secondary rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Level</p>
              <span className="text-xl font-black text-primary">{xp.level}</span>
            </div>
            <div className="h-2 bg-background/60 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${Math.min(xp.progress * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
              {Math.round(xp.xpIntoLevel).toLocaleString()} / {Math.round(xp.xpNeeded).toLocaleString()} XP
            </p>
          </div>

          {/* Settings / Sign out */}
          <div className="flex gap-3">
            <Link to={createPageUrl("Settings")} onClick={onClose} className="flex-1">
              <button className="w-full flex items-center justify-center gap-2 bg-secondary rounded-xl py-3 text-sm font-semibold">
                <Settings className="w-4 h-4" /> Settings
              </button>
            </Link>
            <button onClick={handleSignOut}
              className="flex-1 bg-destructive/10 text-destructive rounded-xl py-3 text-sm font-semibold">
              Sign Out
            </button>
          </div>

          {/* Medals section — fully reachable by scrolling */}
          <MedalsBook unlockedIds={[]} />
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [showRecovery, setShowRecovery] = useState(false);
  const [showLogWeight, setShowLogWeight] = useState(false);
  const [showProfilePicture, setShowProfilePicture] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [rankModalMuscle, setRankModalMuscle] = useState(null);
  const [showRankTester, setShowRankTester] = useState(false);
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalWeightInput, setGoalWeightInput] = useState("");
  const [goalWeeks, setGoalWeeks] = useState(12);
  const { goalKg: goalWeight, weeks: hookWeeks, saveGoal } = useGoalWeight();
  useEffect(() => { setGoalWeeks(hookWeeks); }, [hookWeeks]);


  const [activeTab, setActiveTab] = useState("rank");
  const [showAddTracker, setShowAddTracker] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const [darkMode, setDarkMode] = useState(true);
  const { unit: weightUnit, toDisplay, toKg } = useWeightUnit();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
    }).catch(() => {});
    const saved = localStorage.getItem("gym-dark-mode");
    setDarkMode(saved === null ? true : saved === "true");
    const savedTheme = localStorage.getItem("gym-theme");
    if (savedTheme) applyTheme(savedTheme);
  }, []);

  const toggleDark = (v) => {
    setDarkMode(v);
    localStorage.setItem("gym-dark-mode", String(v));
    document.documentElement.classList.toggle("dark", v);
    window.dispatchEvent(new Event("darkModeChanged"));
  };

  const { data: workoutLogs = [] } = useQuery({
    queryKey: ["workoutLogs"],
    queryFn: () => base44.entities.WorkoutLog.filter({ created_by: user.email }, "-finished_at", 2000),
    enabled: !!user,
  });

  // Recovery-only query — fetches just 50 recent logs (sorted by -finished_at, so
  // most-recent-first). The 7-day decay window means we never need more than a
  // handful of recent sessions; keeping this separate from the 2000-log rank/stats
  // query makes the Recovery view noticeably faster for users with long histories.
  const { data: recoveryLogs = [] } = useQuery({
    queryKey: ["workoutLogs", "recovery"],
    queryFn: () => base44.entities.WorkoutLog.filter({ created_by: user.email }, "-finished_at", 50),
    enabled: !!user && showRecovery,
  });

  // Exercises — used to look up each exercise's secondary_muscles so recovery
  // fatigue is attributed to synergist muscles (e.g. bench → Triceps, Front Delt).
  const { data: allExercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => base44.entities.Exercise.list(),
    enabled: !!user,
  });
  const exerciseSecondaryMap = React.useMemo(() => {
    const m = {};
    allExercises.forEach(e => { m[e.id] = { secondary_muscles: e.secondary_muscles, movement_pattern: e.movement_pattern }; });
    return m;
  }, [allExercises]);

  const { data: bodyWeights = [] } = useQuery({
    queryKey: ["bodyWeights"],
    // Sort by measurement `date` (NOT created_date) so a backdated entry doesn't
    // override a newer measurement — matches the calculateRanks backend, which
    // also sorts by `-date`. Keeps the Rank Tester and save path on the same bodyweight.
    queryFn: () => base44.entities.BodyWeight.filter({ created_by: user.email }, "-date", 50),
    enabled: !!user,
  });

  // For nutrition rank — fetch all macro + water entries to compute streak
  const { data: allMacroEntries = [] } = useQuery({
    queryKey: ["profileAllMacroEntries"],
    queryFn: () => base44.entities.MacroEntry.filter({ created_by: user.email }, "-date", 500),
    enabled: !!user,
  });
  const { data: allWaterLogs = [] } = useQuery({
    queryKey: ["profileAllWaterLogs"],
    queryFn: () => base44.entities.WaterLog.filter({ created_by: user.email }, "-date", 500),
    enabled: !!user,
  });
  const nutritionStreak = computeNutritionStreak(allMacroEntries, allWaterLogs);

  const refetchTrackers = () => queryClient.invalidateQueries({ queryKey: ["userTrackers"] });
  const { data: userTrackers = [] } = useQuery({
    queryKey: ["userTrackers"],
    queryFn: () => base44.entities.UserTracker.filter({ created_by: user.email }, "order", 50),
    enabled: !!user,
  });

  const removeTracker = async (id) => {
    await base44.entities.UserTracker.delete(id);
    refetchTrackers();
  };

  // Recomputes live whenever the Recovery view is toggled, using the current time
  // as the reference point so muscles visibly decay toward "Ready" as sessions age
  // past the 5-day recovery window. Uses a dedicated 50-log query (not the full
  // 2000-log history) for fast recalculation.
  const recoveryData = React.useMemo(
    () => computeRecovery(recoveryLogs, exerciseSecondaryMap),
    [recoveryLogs, exerciseSecondaryMap, showRecovery]
  );

  // latestWeight stored in kg, display converts it
  const latestWeightKg = bodyWeights[0]?.weight;
  const latestWeightDisplay = latestWeightKg ? toDisplay(latestWeightKg) : null;

  // Fetch muscle ranks from database (primary source - permanently saved by calculateRanks backend)
  const { data: dbMuscleRanks = [] } = useQuery({
    queryKey: ["userMuscleRanks"],
    queryFn: () => base44.entities.UserMuscleRank.filter({ created_by: user.email }, null, 100),
    enabled: !!user,
  });

  // Convert database ranks to simple map — prefer displayed_rank (rolling window best)
  const dbMuscleRankMap = React.useMemo(() => {
    return dbMuscleRanks.reduce((acc, record) => {
      // Only color a muscle when it has events in the rolling window — a stale
      // displayed_rank with empty history is ignored so cascade deletes show up.
      const hasEvents = Array.isArray(record.rank_history) && record.rank_history.length > 0;
      if (record.muscle && record.displayed_rank && hasEvents) {
        acc[record.muscle] = record.displayed_rank;
      }
      return acc;
    }, {});
  }, [dbMuscleRanks]);

  // Quick lookup muscle -> full UserMuscleRank record (for the rank modal)
  const dbMuscleRankRecord = React.useMemo(() => {
    const m = {};
    dbMuscleRanks.forEach(r => { m[r.muscle] = r; });
    return m;
  }, [dbMuscleRanks]);

  // DB is the single source of truth for the body model. No client-side
  // fallback — the rank tables (calculateRanks) populate this on workout save
  // and via backfill. After a cascade delete the muscle is correctly unranked.
  const muscleRankNames = dbMuscleRankMap;

  // totalVolume always in kg for XP — never affected by unit toggle
  const totalVolume = workoutLogs.reduce((s, l) => s + (l.total_volume || 0), 0);

  // XP / Level calculation based on total volume
  function getLevelData(volume) {
    if (!volume || volume <= 0) return { level: 1, xpIntoLevel: 0, xpNeeded: 500, progress: 0 };
    let level = 1;
    let xpUsed = 0;
    while (level <= 999) {
      const xpNeeded = Math.floor(Math.pow(level, 1.5) * 500);
      if (xpNeeded <= 0) break;
      if (xpUsed + xpNeeded > volume) {
        return { level, xpIntoLevel: volume - xpUsed, xpNeeded, progress: Math.min((volume - xpUsed) / xpNeeded, 1) };
      }
      xpUsed += xpNeeded;
      level++;
    }
    return { level: 999, xpIntoLevel: 0, xpNeeded: 1, progress: 1 };
  }
  const xp = getLevelData(totalVolume);

  return (
    <div className="max-w-lg mx-auto px-4 pb-4">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl pt-[calc(1rem+env(safe-area-inset-top))] pb-2 border-b border-border/20 mb-4 relative">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Profile</h1>
          <div className="flex items-center gap-1.5">
             <Link to="/Friends">
               <button className="flex items-center gap-2 h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                 <Users className="w-3.5 h-3.5" /> Friends
               </button>
             </Link>
             <Link to={createPageUrl("Measurements")}>
               <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
                 <Ruler className="w-[18px] h-[18px] text-muted-foreground" />
               </button>
             </Link>
             <Link to={createPageUrl("Settings")}>
               <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
                 <Settings className="w-[18px] h-[18px] text-muted-foreground" />
                 </button>
                 </Link>
                 </div>
                 </div>
                 <FirstVisitTooltip
                 storageKey="profile"
                 title="Your Profile"
                 text="Track your body weight, measurements, and strength stats all in one place. Your body model shows which muscle groups you've built ranked strength in — tap any section to dive deeper."
                 pointerAlign="left"
                 />
                 </div>

      <div className="space-y-4">
        {/* Profile info bar — minimalist, clickable */}
        {(() => {
          // BMI calculation: weight(kg) / height(m)^2
          const heightCm = user?.height_cm;
          const bmi = (latestWeightKg && heightCm && heightCm > 0)
            ? (latestWeightKg / Math.pow(heightCm / 100, 2)).toFixed(1)
            : null;
          return (
            <button onClick={() => setShowProfileInfo(true)}
              className="w-full flex items-center gap-3 bg-card rounded-2xl border border-border px-4 py-3.5 text-left active:scale-[0.98] transition-all duration-150">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfilePicture(true);
                }}
                className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center ring-2 ring-primary/30 shrink-0 hover:opacity-80 transition-opacity">
                {profilePictureUrl || user?.profile_picture_url ? (
                  <img 
                    src={profilePictureUrl || user?.profile_picture_url} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-base font-bold text-primary">{user?.full_name?.[0]?.toUpperCase() || "A"}</span>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{workoutLogs.length}</span> workouts</span>
                  <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{latestWeightDisplay ? `${latestWeightDisplay}${weightUnit}` : "--"}</span></span>
                  {bmi && <span className="text-xs text-muted-foreground">BMI <span className="font-semibold text-foreground">{bmi}</span></span>}
                  <span className="ml-auto text-xs font-bold text-primary">Lv {xp.level}</span>
                </div>
                {/* XP Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(xp.progress * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          );
        })()}

        {/* Rank / Stats tab toggle */}
         <div className="flex bg-secondary/80 rounded-xl p-0.5">
           {["rank", "stats"].map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab)}
               className={`flex-1 py-1.5 rounded-[10px] text-xs font-semibold capitalize transition-all duration-200 ${activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
               {tab === "rank" ? "Rank" : "Stats"}
             </button>
           ))}
         </div>

        <>
        {activeTab === "stats" ? (
          <div className="space-y-4">

        {/* Weight Progress */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Weight Progress</h2>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs rounded-lg px-2.5" onClick={() => setShowGoalInput(v => !v)}>
                <Target className="w-3 h-3" /> Goal
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs rounded-lg px-2.5" onClick={() => setShowLogWeight(true)}>
                <Scale className="w-3 h-3" /> Log
              </Button>
            </div>
          </div>
          {showGoalInput && (
            <div className="mb-3 space-y-2">
              <div className="flex gap-2 items-center">
                <Input type="number" step="0.1"
                  placeholder={goalWeight ? `Current: ${toDisplay(goalWeight)}${weightUnit}` : `Goal weight (${weightUnit})`}
                  value={goalWeightInput} onChange={e => setGoalWeightInput(e.target.value)}
                  className="h-8 text-sm bg-secondary border-0 flex-1" />
                <Button size="sm" className="h-8 px-3 text-xs" onClick={() => {
                  const val = parseFloat(goalWeightInput);
                  if (val) { const kgVal = toKg(val); saveGoal(kgVal, goalWeeks); }
                  setShowGoalInput(false); setGoalWeightInput("");
                }}>Set</Button>
                {goalWeight && <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-destructive" onClick={() => {
                  saveGoal(null, goalWeeks); setShowGoalInput(false);
                }}>Clear</Button>}
              </div>
              <TimelineSelect value={goalWeeks} onChange={setGoalWeeks} />
            </div>
          )}
          <WeightChart data={bodyWeights} goalWeight={goalWeight} />
        </div>

        {/* Tracker widgets */}
        {userTrackers.map(t => {
          const props = { key: t.id, tracker: t, onRemove: () => removeTracker(t.id) };
          if (t.type === "measurement") return <MeasurementTracker {...props} />;
          if (t.type === "exercise") return <ExerciseTracker {...props} />;
          if (t.type === "habits") return <HabitsTracker {...props} />;
          if (t.type === "macros") return <MacrosTracker {...props} />;
          return null;
        })}

        {/* Add Tracker bar */}
        <button onClick={() => setShowAddTracker(true)}
          className="w-full h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-primary/15">
          <Plus className="w-4 h-4" /> Add Tracker
        </button>
          </div>
        ) : (
          <div className="space-y-4">

        {/* Muscle Model Card — map left, legend right */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Muscle Map</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Recovery</span>
              <Switch checked={showRecovery} onCheckedChange={setShowRecovery} className="scale-75" />
            </div>
          </div>

          <div className="flex items-start">
            {/* Muscle model — pushed left, given less width so legend fits */}
            <div className="shrink-0 -ml-4" style={{ width: 230 }}>
              <MuscleModel muscleRanks={muscleRankNames} recoveryData={recoveryData} showRecovery={showRecovery} onMuscleRank={setRankModalMuscle} compact />
            </div>

            {/* Legend + Rank Tester button — right of model */}
            <div className="flex flex-col items-start ml-2 flex-1 self-stretch">
              {!showRecovery ? (
                <div className="flex flex-col flex-1 w-full justify-center pt-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">Rank</p>
                    <RankLegend />
                  </div>
                  <button
                    onClick={() => setShowRankTester(true)}
                    className="mt-5 w-[85%] flex flex-col items-center justify-center gap-1 bg-secondary/80 border border-border/60 rounded-xl px-2 py-2.5 active:scale-[0.97] transition-all duration-150"
                  >
                    <FlaskConical className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-semibold text-foreground leading-tight text-center">Rank Tester</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 justify-center flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">Recovery</p>
                  {[
                    { name: "Ready", color: "#22c55e" },
                    { name: "Light", color: "#84cc16" },
                    { name: "Moderate", color: "#eab308" },
                    { name: "Heavy", color: "#f97316" },
                    { name: "Sore", color: "#ef4444" },
                  ].map(r => (
                    <div key={r.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: r.color }}>{r.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nutrition Rank Card */}
        <NutritionRankCard streak={nutritionStreak} />
          </div>
        )}
        </>

      </div>

      {showLogWeight && <LogWeightModal onClose={() => setShowLogWeight(false)} />}
      {showProfileInfo && <ProfileInfoPanel user={user} onClose={() => setShowProfileInfo(false)} xp={xp} profilePictureUrl={profilePictureUrl} />}
      {showAddTracker && <AddTrackerModal onClose={() => setShowAddTracker(false)} onAdded={refetchTrackers} />}
      {showRankTester && (
        <RankTester onClose={() => setShowRankTester(false)} bodyWeightKg={latestWeightKg} gender={user?.sex || "male"} />
      )}
      {rankModalMuscle && (
        <MuscleRankModal
          muscle={rankModalMuscle}
          rankRecord={dbMuscleRankRecord[rankModalMuscle]}
          onClose={() => setRankModalMuscle(null)}
        />
      )}
      {showProfilePicture && (
        <ProfilePictureModal 
          onClose={() => setShowProfilePicture(false)}
          onSuccess={(url) => setProfilePictureUrl(url)}
        />
      )}
    </div>
  );
}