import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, TrendingUp, TrendingDown } from "lucide-react";
import { calcBMR, calcTDEE } from "@/components/utils/bmrCalc";
import { useGoalWeight } from "@/components/utils/useGoalWeight";

// Subtle two-line banner shown at the top of the nutrition settings page:
// line 1 — BMR; line 2 — recommended daily surplus/deficit based on goal weight + timeline.
export default function BmrBanner() {
  const queryClient = useQueryClient();
  const { goalKg, weeks } = useGoalWeight();

  const { data: user } = useQuery({
    queryKey: ["bmrUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: bodyWeights = [] } = useQuery({
    queryKey: ["bodyWeights"],
    queryFn: async () => {
      const u = await base44.auth.me();
      return base44.entities.BodyWeight.filter({ created_by: u.email }, "-created_date", 1);
    },
  });

  useEffect(() => {
    const handler = () => queryClient.invalidateQueries({ queryKey: ["bmrUser"] });
    window.addEventListener("bmrUpdated", handler);
    return () => window.removeEventListener("bmrUpdated", handler);
  }, [queryClient]);

  const currentKg = bodyWeights[0]?.weight;
  const bmr = user?.bmr || (user ? calcBMR({ weightKg: currentKg || user.weight_kg, heightCm: user.height_cm, age: user.age, sex: user.sex }) : null);
  const tdee = user ? calcTDEE(bmr, user.activity_level) : null;

  const advice = (() => {
    if (!goalKg || !currentKg || !weeks) return null;
    const diffKg = goalKg - currentKg;
    const days = weeks * 7;
    const dailyAdjust = Math.round((diffKg * 7700) / days);
    return { dailyAdjust, direction: diffKg > 0 ? "surplus" : "deficit" };
  })();

  return (
    <div className="px-4 py-3 mb-3 rounded-xl bg-secondary/60 border border-border/60 space-y-1">
      <div className="flex items-center gap-1.5 text-sm">
        <Flame className="w-3.5 h-3.5 text-primary" />
        <span className="text-muted-foreground">TDEE:</span>
        <span className="font-bold text-foreground">{tdee ? `${tdee.toLocaleString()} cal` : "—"}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        {advice ? (
          <>
            {advice.direction === "surplus"
              ? <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              : <TrendingDown className="w-3.5 h-3.5 text-orange-500" />}
            <span className="text-muted-foreground">Recommended {advice.direction}:</span>
            <span className={`font-bold ${advice.direction === "surplus" ? "text-green-500" : "text-orange-500"}`}>
              {advice.direction === "surplus" ? "+" : "−"}{Math.abs(advice.dailyAdjust)} cal/day
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Set a goal weight to see calorie recommendations</span>
        )}
      </div>
    </div>
  );
}