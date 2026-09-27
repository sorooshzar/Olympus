import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";

// Calories burned over the last ~10 sessions, orange-red gradient area.
export default function CaloriesTrendChart({ logs = [] }) {
  const data = useMemo(() => {
    return logs
      .filter((l) => (l.calories || 0) > 0)
      .slice(0, 10)
      .reverse()
      .map((l) => ({
        label: format(new Date(l.started_at || l.date), "M/d"),
        calories: l.calories,
      }));
  }, [logs]);

  if (data.length < 2) {
    return (
      <div className="bg-card rounded-2xl border border-border h-[120px] flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Log more sessions to see your calorie trend.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-3 pt-4">
      <div className="flex items-center justify-between mb-1 px-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Calories Burned
        </p>
        <span className="text-[10px] text-muted-foreground">Last {data.length} sessions</span>
      </div>
      <ResponsiveContainer width="100%" height={108}>
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -30 }}>
          <defs>
            <linearGradient id="calTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5722" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#FF5722" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8E8E93", fontSize: 10 }}
            axisLine={{ stroke: "#2A2A2A" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#8E8E93", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "#1E1E1E",
              border: "1px solid #333",
              borderRadius: 12,
              fontSize: 12,
              color: "#fff",
            }}
            formatter={(v) => [`${v} kcal`, "Calories"]}
          />
          <Area
            type="monotone"
            dataKey="calories"
            stroke="#FF5722"
            strokeWidth={2.5}
            fill="url(#calTrend)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}