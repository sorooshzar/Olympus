import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import StationarySessionScreen from "@/components/cardio/StationarySessionScreen";
import MobileSessionScreen from "@/components/cardio/MobileSessionScreen";
import SessionSummarySheet from "@/components/cardio/SessionSummarySheet";
import { getActivityMode } from "@/components/cardio/cardioConfig";

export default function CardioSession() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const [userWeightKg, setUserWeightKg] = useState(null);
  const [summary, setSummary] = useState(null);

  const mode = params.get("mode") || "stationary";
  const activity = params.get("activity") || "Treadmill (Run)";

  // Resolve mode from activity if not given
  const effectiveMode = params.get("mode") || getActivityMode(activity);

  useEffect(() => {
    base44.auth
      .me()
      .then(async (u) => {
        const weightUnit = u?.weight_unit || "kg";
        // Latest BodyWeight record
        try {
          const logs = await base44.entities.BodyWeight.filter(
            { created_by: u.email },
            "-date",
            1
          );
          if (logs && logs.length > 0) {
            const bw = logs[0];
            const kg =
              bw.unit === "lbs" || bw.unit === "lb"
                ? bw.weight / 2.20462
                : bw.weight;
            setUserWeightKg(kg);
            return;
          }
        } catch {
          /* ignore */
        }
        setUserWeightKg(75);
      })
      .catch(() => setUserWeightKg(75));
  }, []);

  const handleEnd = (data) => setSummary(data);

  const handleSave = async (finalData) => {
    const finishedAt = new Date().toISOString();
    const record = {
      type: finalData.mode,
      mode: finalData.mode,
      activity: finalData.activity,
      date: format(new Date(), "yyyy-MM-dd"),
      started_at: finalData.startedAt,
      finished_at: finishedAt,
      duration_seconds: finalData.durationSeconds,
      moving_time: finalData.movingTime,
      pause_count: finalData.pauseCount || 0,
      distance: finalData.distanceKm != null ? +finalData.distanceKm.toFixed(4) : null,
      distance_unit: "km",
      route_points: finalData.routePoints || [],
      splits: finalData.splits || [],
      calories: finalData.calories != null ? Math.round(finalData.calories) : null,
      avg_pace: finalData.avgPaceSecKm
        ? `${Math.floor(finalData.avgPaceSecKm / 60)}:${String(Math.round(finalData.avgPaceSecKm % 60)).padStart(2, "0")} /km`
        : null,
      notes: finalData.notes || null,
    };
    await base44.entities.CardioLog.create(record);
    queryClient.invalidateQueries({ queryKey: ["cardioLogs"] });
    setSummary(null);
    navigate("/Cardio", { replace: true });
  };

  const handleDiscard = () => {
    setSummary(null);
    navigate("/Cardio", { replace: true });
  };

  const handleCancel = () => navigate("/Cardio", { replace: true });

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {effectiveMode === "stationary" ? (
        <StationarySessionScreen
          activity={activity}
          userWeightKg={userWeightKg}
          onEnd={handleEnd}
          onCancel={handleCancel}
        />
      ) : (
        <MobileSessionScreen
          activity={activity}
          userWeightKg={userWeightKg}
          onEnd={handleEnd}
          onCancel={handleCancel}
        />
      )}

      <SessionSummarySheet
        open={!!summary}
        summary={summary}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}