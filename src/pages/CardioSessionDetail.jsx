import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  Flame,
  Clock,
  TrendingUp,
  Activity,
  Footprints,
  Trash2,
  Check,
  Navigation,
} from "lucide-react";
import RouteMapView from "@/components/cardio/RouteMapView";
import SplitsList from "@/components/cardio/SplitsList";
import { getActivityIcon } from "@/components/cardio/cardioConfig";
import {
  formatDuration,
  formatTotalMins,
  formatPace,
  sessionDateTime,
} from "@/components/cardio/cardioUtils";
import { useDistanceUnit } from "@/components/utils/useDistanceUnit";

export default function CardioSessionDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const { isMetric, label, toDisplay } = useDistanceUnit();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const id = params.get("id");

  useEffect(() => {
    if (!id) return;
    base44.entities.CardioLog
      .get(id)
      .then((rec) => {
        setLog(rec);
        setCalories(rec?.calories != null ? String(rec.calories) : "");
        setNotes(rec?.notes || "");
      })
      .catch(() => setLog(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      calories: calories !== "" ? Number(calories) : null,
      notes: notes.trim() || null,
    };
    await base44.entities.CardioLog.update(id, updates);
    queryClient.invalidateQueries({ queryKey: ["cardioLogs"] });
    setSaving(false);
    navigate("/Cardio", { replace: true });
  };

  const handleDelete = async () => {
    await base44.entities.CardioLog.delete(id);
    queryClient.invalidateQueries({ queryKey: ["cardioLogs"] });
    navigate("/Cardio", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (!log) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <Activity className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Session not found.</p>
        <Button variant="ghost" className="mt-3" onClick={() => navigate("/Cardio")}>
          Back to Cardio
        </Button>
      </div>
    );
  }

  const Icon = getActivityIcon(log.activity);
  const isMobile = (log.mode || log.type) === "mobile";
  const distanceKm = log.distance;
  const avgPaceSecKm = (() => {
    if (log.avg_pace) {
      const m = log.avg_pace.match(/(\d+):(\d+)/);
      if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
    }
    if (distanceKm && log.moving_time) return log.moving_time / distanceKm;
    if (distanceKm && log.duration_seconds) return log.duration_seconds / distanceKm;
    return 0;
  })();

  const stats = [
    { label: "Duration", value: formatDuration(log.duration_seconds), icon: Clock },
    { label: "Calories", value: `${log.calories ?? 0}`, unit: "kcal", icon: Flame },
  ];
  if (distanceKm != null) {
    stats.splice(1, 0, {
      label: "Distance",
      value: `${toDisplay(distanceKm).toFixed(2)}`,
      unit: label,
      icon: TrendingUp,
    });
  }
  if (isMobile && log.moving_time != null) {
    stats.push({ label: "Moving", value: formatDuration(log.moving_time), icon: Navigation });
  }
  if (distanceKm != null) {
    stats.push({
      label: "Avg Pace",
      value: formatPace(avgPaceSecKm, isMetric),
      unit: `/${label}`,
      icon: Footprints,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/Cardio")}
            className="p-1 -ml-1 text-muted-foreground active:scale-90 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight truncate">{log.activity}</h1>
              <p className="text-xs text-muted-foreground">{sessionDateTime(log)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-32 space-y-5 pt-4">
        {/* Route map for mobile */}
        {isMobile && log.route_points && log.route_points.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-border h-64">
            <RouteMapView points={log.route_points} fit interactive />
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => {
            const SIcon = s.icon;
            return (
              <div key={s.label} className="bg-card rounded-xl border border-border p-4">
                <SIcon className="w-4 h-4 text-primary mb-2" />
                <p className="text-xl font-bold tabular-nums leading-none">
                  {s.value}
                  {s.unit && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">{s.unit}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Splits */}
        {isMobile && (
          <div>
            <h2 className="text-sm font-semibold mb-3">Splits</h2>
            <SplitsList splits={log.splits} avgPaceSecKm={avgPaceSecKm} isMetric={isMetric} />
          </div>
        )}

        {/* Editable calories */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
              Calories (kcal)
            </label>
            <Input
              type="number"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="bg-secondary border-0 no-spinner"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
              Notes
            </label>
            <Input
              placeholder="Add a note…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-secondary border-0"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
          <Button className="flex-1 gap-1.5" onClick={handleSave} disabled={saving}>
            <Check className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold">Delete this session?</h3>
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}