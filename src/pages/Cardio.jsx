import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Flame,
  Clock,
  TrendingUp,
  Play,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { format, startOfWeek, isWithinInterval } from "date-fns";
import StartSessionModal from "@/components/cardio/StartSessionModal";
import { getActivityIcon, getActivityColor } from "@/components/cardio/cardioConfig";
import { formatDuration, formatTotalSeconds } from "@/components/cardio/cardioUtils";
import { useDistanceUnit } from "@/components/utils/useDistanceUnit";
import { userStorage } from "@/components/utils/userStorage";
import RouteThumbnail from "@/components/cardio/RouteThumbnail";
import WeeklyActivityChart from "@/components/cardio/WeeklyActivityChart";
import CaloriesTrendChart from "@/components/cardio/CaloriesTrendChart";

function getWeekStart() {
  const ws = userStorage.getItem("gym-week-start") || "monday";
  const now = new Date();
  return startOfWeek(now, { weekStartsOn: ws === "sunday" ? 0 : 1 });
}

export default function Cardio() {
  const navigate = useNavigate();
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
    <div className="max-w-lg mx-auto px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-28 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Cardio</h1>

      {/* This Week */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
          This Week
        </p>
        <div className="grid grid-cols-2 gap-3">
          <StatTile icon={Activity} accent="#AB47BC" label="Sessions" value={String(weekLogs.length)} />
          <StatTile
            icon={TrendingUp}
            accent="#2196F3"
            label="Distance"
            value={`${toDisplay(weekDistKm).toFixed(1)}`}
            unit={label}
          />
          <StatTile icon={Clock} accent="#5C6BC0" label="Total Time" value={formatTotalSeconds(weekSeconds)} />
          <StatTile
            icon={Flame}
            accent="#FF5722"
            label="Calories"
            value={weekCal > 0 ? weekCal.toLocaleString() : "0"}
            unit="kcal"
          />
        </div>
      </div>

      {/* Weekly activity chart */}
      <WeeklyActivityChart weekStart={weekStart} weekLogs={weekLogs} />

      {/* All Time */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
          All Time
        </p>
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={Activity} accent="#AB47BC" label="Sessions" value={String(logs.length)} />
          <StatTile
            icon={TrendingUp}
            accent="#2196F3"
            label="Distance"
            value={toDisplay(allDistKm).toFixed(1)}
            unit={label}
          />
          <StatTile icon={Clock} accent="#5C6BC0" label="Time" value={formatTotalSeconds(allSeconds)} />
        </div>
      </div>

      {/* Calories trend */}
      <CaloriesTrendChart logs={logs} />

      {/* Recent sessions */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
          Recent Sessions
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[72px] bg-card rounded-2xl border border-border animate-pulse" />
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

      {/* Sticky floating Start CTA */}
      <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 pointer-events-none">
        <div className="max-w-lg mx-auto px-4 pointer-events-auto">
          <button
            onClick={() => setModalOpen(true)}
            className="relative w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 text-white shadow-[0_8px_24px_-6px_rgba(255,87,34,0.6)] active:scale-[0.99] transition-transform"
            style={{ background: "linear-gradient(135deg,#FF7043,#FF5722)" }}
          >
            <span className="absolute inset-0 rounded-2xl ring-2 ring-orange-500/40 animate-pulse" />
            <Play className="w-5 h-5 relative" fill="currentColor" />
            <span className="relative">Start Session</span>
          </button>
        </div>
      </div>

      <StartSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectActivity={handleSelectActivity}
      />
    </div>
  );
}

function StatTile({ icon: Icon, accent, label, value, unit }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 min-h-[68px] flex items-center gap-3 relative overflow-hidden">
      <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: accent }} />
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}1F` }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
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
  const { label, toDisplay } = useDistanceUnit();
  const Icon = getActivityIcon(log.activity);
  const color = getActivityColor(log.activity);
  const isMobile = (log.mode || log.type) === "mobile";
  const hasRoute = isMobile && log.route_points && log.route_points.length >= 2;
  const distVal = log.distance ? toDisplay(log.distance).toFixed(2) : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center bg-card rounded-2xl border border-border p-3 gap-3 active:scale-[0.99] transition-transform overflow-hidden"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ background: hasRoute ? "#0a0a0a" : `${color}1F` }}
      >
        {hasRoute ? (
          <RouteThumbnail points={log.route_points} color={color} className="w-full h-full" />
        ) : (
          <Icon className="w-5 h-5" style={{ color }} />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-bold truncate">{log.activity}</p>
          <p className="text-xs text-muted-foreground flex-shrink-0">
            {format(new Date(log.started_at || log.date), "MMM d")}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" style={{ color: "#5C6BC0" }} />
            <span className="tabular-nums">
              {log.duration_seconds ? formatDuration(log.duration_seconds) : "--"}
            </span>
          </span>
          {distVal != null && (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" style={{ color: "#2196F3" }} />
              <span className="tabular-nums">{distVal} {label}</span>
            </span>
          )}
          {log.calories ? (
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3" style={{ color: "#FF5722" }} />
              <span className="tabular-nums">{log.calories} kcal</span>
            </span>
          ) : null}
          {isMobile && <MapPin className="w-3 h-3 ml-auto" style={{ color }} />}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}