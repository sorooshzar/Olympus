import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Flame,
  Clock,
  TrendingUp,
  Play,
  ChevronRight,
  MapPin,
  Footprints,
} from "lucide-react";
import { format, startOfWeek, isWithinInterval } from "date-fns";
import StartSessionModal from "@/components/cardio/StartSessionModal";
import { getActivityIcon } from "@/components/cardio/cardioConfig";
import { formatDuration, formatTotalSeconds } from "@/components/cardio/cardioUtils";
import { useDistanceUnit } from "@/components/utils/useDistanceUnit";
import { userStorage } from "@/components/utils/userStorage";

function getWeekStart() {
  const ws = userStorage.getItem("gym-week-start") || "monday";
  const now = new Date();
  return startOfWeek(now, { weekStartsOn: ws === "sunday" ? 0 : 1 });
}

export default function Cardio() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const { isMetric, label, toDisplay } = useDistanceUnit();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["cardioLogs"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.CardioLog.filter({ created_by: user.email }, "-created_date", 500);
    },
  });

  const handleSelectActivity = ({ mode, activity }) => {
    setModalOpen(false);
    navigate(`/CardioSession?mode=${encodeURIComponent(mode)}&activity=${encodeURIComponent(activity)}`);
  };

  // This week's logs
  const weekStart = getWeekStart();
  const weekEnd = new Date();
  const weekLogs = logs.filter((l) => {
    if (!l.date) return false;
    try {
      return isWithinInterval(new Date(l.date), { start: weekStart, end: weekEnd });
    } catch {
      return false;
    }
  });

  const weekSeconds = weekLogs.reduce((s, l) => s + (l.duration_seconds || 0), 0);
  const weekDistKm = weekLogs.reduce((s, l) => s + (l.distance || 0), 0);
  const weekCal = weekLogs.reduce((s, l) => s + (l.calories || 0), 0);

  const allSeconds = logs.reduce((s, l) => s + (l.duration_seconds || 0), 0);
  const allDistKm = logs.reduce((s, l) => s + (l.distance || 0), 0);

  return (
    <div className="max-w-lg mx-auto px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-6 space-y-6">
      <h1 className="text-2xl font-bold">Cardio</h1>

      {/* This Week */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
          This Week
        </p>
        <div className="grid grid-cols-2 gap-3">
          <StatTile icon={Activity} label="Sessions" value={String(weekLogs.length)} />
          <StatTile
            icon={TrendingUp}
            label="Distance"
            value={`${toDisplay(weekDistKm).toFixed(1)}`}
            unit={label}
          />
          <StatTile icon={Clock} label="Total Time" value={formatTotalSeconds(weekSeconds)} />
          <StatTile
            icon={Flame}
            label="Calories"
            value={weekCal > 0 ? weekCal.toLocaleString() : "0"}
            unit="kcal"
          />
        </div>
      </div>

      {/* All Time */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
          All Time
        </p>
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={Activity} label="Sessions" value={String(logs.length)} />
          <StatTile
            icon={TrendingUp}
            label="Distance"
            value={toDisplay(allDistKm).toFixed(1)}
            unit={label}
          />
          <StatTile icon={Clock} label="Time" value={formatTotalSeconds(allSeconds)} />
        </div>
      </div>

      {/* Recent sessions */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
          Recent Sessions
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 bg-card rounded-xl border border-border animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No sessions yet. Start your first cardio workout!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 15).map((log) => (
              <SessionRow key={log.id} log={log} onClick={() => navigate(`/CardioSessionDetail?id=${log.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Start Session CTA */}
      <div className="pt-2">
        <Button
          className="w-full h-14 rounded-2xl font-bold text-base gap-2 shadow-lg shadow-primary/20"
          onClick={() => setModalOpen(true)}
        >
          <Play className="w-5 h-5" /> Start Session
        </Button>
      </div>

      <StartSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectActivity={handleSelectActivity}
      />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, unit }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 min-h-[68px] flex items-center gap-3">
      <Icon className="w-5 h-5 text-primary flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-none">{label}</p>
        <p className="text-lg font-bold mt-1 tabular-nums leading-none truncate">
          {value}
          {unit && <span className="text-xs text-muted-foreground font-normal ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

function SessionRow({ log, onClick }) {
  const Icon = getActivityIcon(log.activity);
  const isMobile = (log.mode || log.type) === "mobile";
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center bg-card rounded-xl border border-border p-3.5 gap-3 active:scale-[0.99] transition-transform"
    >
      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold truncate">{log.activity}</p>
        <p className="text-xs text-muted-foreground truncate">
          {format(new Date(log.started_at || log.date), "MMM d")} ·{" "}
          {log.duration_seconds ? formatDuration(log.duration_seconds) : "--"}
          {log.distance ? ` · ${log.distance.toFixed(1)}km` : ""}
          {log.calories ? ` · ${log.calories} kcal` : ""}
        </p>
      </div>
      {isMobile ? (
        <MapPin className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
      ) : null}
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}