import React, { useState } from "react";
import { X, Zap, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_MEDALS } from "@/components/profile/MedalsBook";
import { useWeightUnit } from "@/components/utils/useWeightUnit";
import FriendWorkoutHistory from "./FriendWorkoutHistory";
import FriendBodyModel from "./FriendBodyModel";

function MedalTile({ medal, unlocked }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
      unlocked
        ? "bg-card border-primary/30"
        : "bg-secondary/40 border-border/40 opacity-50"
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
        unlocked ? "bg-primary/15" : "bg-muted/60"
      }`}>
        <span className={unlocked ? "opacity-100" : "opacity-25"}>🏅</span>
      </div>
      <p className={`text-[9px] font-semibold text-center leading-tight ${
        unlocked ? "text-foreground" : "text-muted-foreground"
      }`}>
        {medal.title}
      </p>
    </div>
  );
}

export default function FriendProfileModal({ friend, xp, onClose, workoutLogs, bodyWeights = [], muscleRanks = {}, nutritionRanks = [], sbdCache = null }) {
  const { unit: weightUnit, toDisplay } = useWeightUnit();
  const [showBodyModel, setShowBodyModel] = useState(false);
  const [showWorkoutHistory, setShowWorkoutHistory] = useState(false);

  // Get latest body weight
   const latestBodyWeight = bodyWeights.length > 0 
     ? bodyWeights.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
     : null;

  // Get nutrition rank (highest rank by impressiveness score)
  const nutritionRank = nutritionRanks.length > 0
    ? nutritionRanks.sort((a, b) => (b.impressiveness_score || 0) - (a.impressiveness_score || 0))[0]
    : null;
  const unlockedCount = friend.unlockedMedals?.length || 0;
  const totalCount = ALL_MEDALS.length;

  // Use cached SBD values (updated live when friend finishes a workout)
  const squat1RM = sbdCache?.squat_1rm || 0;
  const bench1RM = sbdCache?.bench_1rm || 0;
  const deadlift1RM = sbdCache?.deadlift_1rm || 0;
  const totalSBD = squat1RM + bench1RM + deadlift1RM;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card rounded-3xl border border-border/40 overflow-y-auto"
        style={{ maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">Profile</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/80"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Avatar + name + username + action buttons */}
           <div className="flex items-start justify-between gap-4 pt-2">
             {/* Left: Avatar + Name + Username + Weight */}
             <div className="flex items-center gap-3 flex-shrink-0">
               <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/30 flex-shrink-0">
                 <span className="text-xl font-black text-primary">
                   {(friend.username || "?")?.[0]?.toUpperCase()}
                 </span>
               </div>
               <div>
                 <p className="font-bold text-sm">@{friend.username || "unknown"}</p>
                 {latestBodyWeight && (
                   <p className="text-xs text-primary font-semibold mt-0.5">
                     {(() => {
                       const w = latestBodyWeight.weight;
                       const storedUnit = latestBodyWeight.unit || 'kg';
                       const displayWeight = storedUnit === weightUnit
                         ? w
                         : storedUnit === 'kg'
                         ? Math.round(w * 2.20462 * 10) / 10
                         : Math.round(w / 2.20462 * 10) / 10;
                       return `${displayWeight} ${weightUnit}`;
                     })()}
                   </p>
                 )}
               </div>
             </div>



             {/* Right: Buttons - moved left with smaller gap */}
             <div className="flex flex-col gap-2 flex-shrink-0 -ml-4">
               <Button
                 variant="outline"
                 size="sm"
                 className="rounded-xl text-xs px-3"
                 onClick={() => setShowBodyModel(true)}
               >
                 <User className="w-3 h-3 mr-1.5" /> Rank
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 className="rounded-xl text-xs px-3"
                 onClick={() => setShowWorkoutHistory(true)}
               >
                 <Zap className="w-3 h-3 mr-1.5" /> History
               </Button>
             </div>
           </div>

          {/* Level card - full width */}
          <div className="bg-secondary rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Level</p>
              <span className="text-lg font-black text-primary">{xp?.level ?? 1}</span>
            </div>
            <div className="h-1 bg-background/60 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${Math.min((xp?.progress || 0) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
              {Math.round(xp?.xpIntoLevel || 0).toLocaleString()} / {Math.round(xp?.xpNeeded || 500).toLocaleString()} XP
            </p>
          </div>

          {/* SBD Section */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "S", value: squat1RM },
              { label: "B", value: bench1RM },
              { label: "D", value: deadlift1RM },
              { label: "Total", value: totalSBD }
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-2 text-center">
                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</p>
                <p className="text-sm font-black text-primary leading-none mt-0.5 truncate">
                  {stat.value > 0 ? Math.round(toDisplay(stat.value)) : "—"}
                </p>
              </div>
            ))}
          </div>



          {/* Medals */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medals</p>
              <span className="text-xs font-bold text-primary">{unlockedCount} / {totalCount}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ALL_MEDALS.map(medal => (
                <MedalTile
                  key={medal.id}
                  medal={medal}
                  unlocked={(friend.unlockedMedals || []).includes(medal.id)}
                />
              ))}
            </div>
          </div>
          </div>
          </div>

          {/* Body Model Modal */}
          {showBodyModel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowBodyModel(false)}>
          <div className="w-full max-w-lg bg-card rounded-3xl border border-border/40 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Muscle Ranks</h3>
              <button onClick={() => setShowBodyModel(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/80">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <FriendBodyModel muscleRanks={muscleRanks} />
          </div>
          </div>
          )}

          {/* Workout History Modal */}
          {showWorkoutHistory && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowWorkoutHistory(false)}>
          <div className="w-full max-w-sm bg-card rounded-3xl border border-border/40 p-6 flex flex-col" style={{ maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="font-bold text-base">Workout History</h3>
              <button onClick={() => setShowWorkoutHistory(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/80">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <FriendWorkoutHistory workoutLogs={workoutLogs} friend={friend} />
            </div>
          </div>
          </div>
          )}
          </div>
          );
          }