import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format, eachDayOfInterval, isSameDay } from "date-fns";
import { getActivityColor } from "./cardioConfig";
import { formatTotalSeconds } from "./cardioUtils";

function formatTick(seconds) {
  if (!seconds) return "";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${(m / 60).toFixed(1)}h` : `${m}m`;
}

// Stacked daily duration (sec) per activity for the current week, Mon-Sun.
export default function WeeklyActivityChart({ weekStart, weekLogs = [] }) {
  const { data, activities } = useMemo(() => {
    const days = eachDayOfInterval({
      start: weekStart,
      end: new Date(weekStart.getTime() + 6 * 86400000),
    });
    const acts = [];
    for (const l of weekLogs) {
      if (l.activity && !acts.includes(l.activity)) acts.push(l.activity);
    }
    const data = days.map((d) => {
      const row = { day: format(d, "EEE") };
      for (const a of acts) row[a] = 0;
      return row;
    });
    for (const l of weekLogs) {
      if (!l.activity || !l.duration_seconds) continue;
      try {
        const di = days.findIndex((d) => isSameDay(d, new Date(l.started_at || l.date)));
        if (di >= 0) data[di][l.activity] += l.duration_seconds;
      } catch {
        /* skip malformed date */
      }
    }
    return { data, activities: acts };
  }, [weekStart, weekLogs]);

  if (!weekLogs.length) {
    return (
      <div className="bg-card rounded-2xl border border-border h-[150px] flex items-center justify-center">
        <p className="text-xs text-muted-foreground">No activity this week yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-3 pt-4">
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "#8E8E93", fontSize: 10 }}
            axisLine={{ stroke: "#2A2A2A" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatTick}
            tick={{ fill: "#8E8E93", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#1E1E1E",
              border: "1px solid #333",
              borderRadius: 12,
              fontSize: 12,
              color: "#fff",
            }}
            formatter={(v, name) => [formatTotalSeconds(v), name]}
          />
          {activities.map((a) => (
            <Bar
              key={a}
              dataKey={a}
              stackId="t"
              fill={getActivityColor(a)}
              radius={[3, 3, 0, 0]}
              maxBarSize={34}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}