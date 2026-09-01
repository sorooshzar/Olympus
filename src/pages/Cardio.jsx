import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Bike, MapPin, Play, Pause, ChevronRight, Flame, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTotalMins(mins) {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const STATIONARY_MACHINES = ["Treadmill", "Cycling / Bike", "Elliptical", "Stair Climber", "Rowing Machine", "Other"];
const MOBILE_ACTIVITIES = ["Running", "Walking", "Cycling", "Hiking", "Other"];

// MET values for calorie estimation
const MET = { Running: 9.8, Walking: 3.5, Cycling: 6.8, Hiking: 5.3, Other: 5.0 };

// ─── TEMPORARY: Cardio under construction — render a placeholder instead ──────
// To restore the original Cardio page, delete the CardioPlaceholder block + the
// `export default CardioPlaceholder;` line below, and re-add
// `export default function Cardio()` at the original declaration further down.
function CardioPlaceholder() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <Activity className="w-10 h-10 text-muted-foreground mb-4" />
      <h1 className="text-xl font-bold mb-1">Cardio Page Coming Soon</h1>
      <p className="text-sm text-muted-foreground">We're still building this. Check back later.</p>
    </div>
  );
}
export default CardioPlaceholder;
// ─── Confetti helper ─────────────────────────────────────────────────────────
function fireConfetti() {
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#3b82f6", "#22c55e", "#f59e0b", "#ec4899"] });
}

// ─── Stationary Session ──────────────────────────────────────────────────────
function StationarySession({ machine, onSave, onCancel }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showDataEntry, setShowDataEntry] = useState(false);
  const [distance, setDistance] = useState("");
  const [calories, setCalories] = useState("");
  const timerRef = useRef(null);
  const startedAt = useRef(null);

  const tick = useCallback(() => setElapsed(e => e + 1), []);

  const handleStartStop = () => {
    if (!running) {
      if (!startedAt.current) startedAt.current = new Date().toISOString();
      timerRef.current = setInterval(tick, 1000);
      setRunning(true);
    } else {
      clearInterval(timerRef.current);
      setRunning(false);
      setShowEndConfirm(true);
    }
  };

  const handleEndCardio = () => {
    clearInterval(timerRef.current);
    setRunning(false);
    setShowEndConfirm(true);
  };

  const confirmEnd = () => {
    setShowEndConfirm(false);
    setShowDataEntry(true);
  };

  const handleDone = () => {
    fireConfetti();
    setTimeout(() => {
      onSave({
        type: "stationary",
        activity: machine,
        date: format(new Date(), "yyyy-MM-dd"),
        started_at: startedAt.current || new Date().toISOString(),
        finished_at: new Date().toISOString(),
        duration_seconds: elapsed,
        distance: parseFloat(distance) || null,
        distance_unit: "km",
        calories: parseInt(calories) || null,
      });
    }, 1200);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  // Data entry popup
  if (showDataEntry) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4 sm:items-center">
        <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold">Session Complete 🎉</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Optionally enter your machine readouts</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Distance (km) — optional</label>
              <Input type="number" step="0.1" placeholder="e.g. 5.2" value={distance} onChange={e => setDistance(e.target.value)} className="bg-secondary border-0" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Calories (kcal) — optional</label>
              <Input type="number" placeholder="e.g. 320" value={calories} onChange={e => setCalories(e.target.value)} className="bg-secondary border-0" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setDistance(""); setCalories(""); handleDone(); }}>Skip</Button>
            <Button className="flex-1" onClick={handleDone}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Machine label */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-semibold text-green-500">{machine}</span>
      </div>

      {/* Timer */}
      <div className="text-center py-6">
        <div className="text-7xl font-mono font-bold tabular-nums tracking-tight">{formatDuration(elapsed)}</div>
        <p className="text-xs text-muted-foreground mt-2">{running ? "Session running…" : elapsed > 0 ? "Paused" : "Ready to start"}</p>
      </div>

      {/* Start / Stop */}
      <Button
        className="w-full h-14 rounded-xl font-bold text-base gap-2"
        onClick={handleStartStop}
      >
        {running ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> {elapsed === 0 ? "Start Session" : "Resume"}</>}
      </Button>

      {/* End button */}
      {(running || elapsed > 0) && (
        <Button variant="outline" className="w-full h-11 rounded-xl text-destructive border-destructive/40 hover:bg-destructive/10" onClick={handleEndCardio}>
          End Cardio
        </Button>
      )}

      <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onCancel}>Cancel</Button>

      {/* End confirm popup */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4 sm:items-center" onClick={() => setShowEndConfirm(false)}>
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold">End this session?</h3>
            <p className="text-sm text-muted-foreground">Your {formatDuration(elapsed)} session will be saved.</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowEndConfirm(false)}>Keep Going</Button>
              <Button className="flex-1" onClick={confirmEnd}>End Session</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mobile Session ──────────────────────────────────────────────────────────
function MobileSession({ activity, userWeightKg, onSave, onCancel }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0); // km
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const timerRef = useRef(null);
  const watchRef = useRef(null);
  const startedAt = useRef(null);
  const lastPos = useRef(null);

  const met = MET[activity] || 5.0;
  const weight = userWeightKg || 75;
  const calories = Math.round(met * weight * (elapsed / 3600));
  const pace = elapsed > 0 && distance > 0 ? (elapsed / 60 / distance).toFixed(1) : "--";

  const startGPS = () => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (lastPos.current) {
          const d = haversine(lastPos.current.coords, pos.coords);
          setDistance(prev => +(prev + d).toFixed(3));
        }
        lastPos.current = pos;
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const haversine = (c1, c2) => {
    const R = 6371;
    const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
    const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((c1.latitude * Math.PI) / 180) * Math.cos((c2.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleStart = () => {
    startedAt.current = new Date().toISOString();
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    setRunning(true);
    startGPS();
  };

  const handleEnd = () => {
    clearInterval(timerRef.current);
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    setRunning(false);
    setShowEndConfirm(true);
  };

  const confirmEnd = () => {
    setShowEndConfirm(false);
    fireConfetti();
    setTimeout(() => {
      onSave({
        type: "mobile",
        activity,
        date: format(new Date(), "yyyy-MM-dd"),
        started_at: startedAt.current || new Date().toISOString(),
        finished_at: new Date().toISOString(),
        duration_seconds: elapsed,
        distance: +distance.toFixed(2),
        distance_unit: "km",
        calories,
      });
    }, 1200);
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${running ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
        <span className={`text-sm font-semibold ${running ? "text-green-500" : "text-muted-foreground"}`}>
          {running ? "GPS Tracking" : activity}
        </span>
      </div>

      {/* Timer */}
      <div className="text-center py-4">
        <div className="text-6xl font-mono font-bold tabular-nums tracking-tight">{formatDuration(elapsed)}</div>
      </div>

      {/* Live metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Distance", value: `${distance.toFixed(2)} km`, icon: TrendingUp },
          { label: "Pace", value: `${pace} min/km`, icon: Activity },
          { label: "Calories", value: `${calories} kcal`, icon: Flame },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-secondary rounded-xl p-3 text-center">
            <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-sm font-bold">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {!running ? (
        <Button className="w-full h-14 rounded-xl font-bold text-base gap-2" onClick={handleStart}>
          <Play className="w-5 h-5" /> Start Session
        </Button>
      ) : (
        <Button variant="outline" className="w-full h-11 rounded-xl text-destructive border-destructive/40 hover:bg-destructive/10" onClick={handleEnd}>
          End Cardio
        </Button>
      )}

      <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onCancel}>Cancel</Button>

      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4 sm:items-center" onClick={() => setShowEndConfirm(false)}>
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold">End this session?</h3>
            <p className="text-sm text-muted-foreground">{formatDuration(elapsed)} · {distance.toFixed(2)} km · {calories} kcal</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowEndConfirm(false)}>Keep Going</Button>
              <Button className="flex-1" onClick={confirmEnd}>End Session</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────────
function CardioHistoryItem({ log }) {
  return (
    <div className="flex items-center bg-card rounded-xl border border-border p-3.5 gap-3">
      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
        {log.type === "mobile" ? <MapPin className="w-5 h-5 text-primary" /> : <Bike className="w-5 h-5 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{log.activity || (log.type === "mobile" ? "Outdoor" : "Stationary")}</p>
        <p className="text-xs text-muted-foreground">
          {log.date} · {log.duration_seconds ? formatDuration(log.duration_seconds) : "--"}
          {log.distance ? ` · ${log.distance}km` : ""}
          {log.calories ? ` · ${log.calories} kcal` : ""}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function Cardio() {
  const [screen, setScreen] = useState("home"); // home | pick_type | pick_machine | pick_activity | session
  const [sessionType, setSessionType] = useState(null);
  const [machine, setMachine] = useState(null);
  const [activity, setActivity] = useState(null);
  const [userWeight, setUserWeight] = useState(75);
  const queryClient = useQueryClient();

  // Load user weight for calorie calc
  useEffect(() => {
    base44.auth.me().then(u => { if (u?.weight_kg) setUserWeight(u.weight_kg); });
  }, []);

  const { data: logs = [] } = useQuery({
    queryKey: ["cardioLogs"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.CardioLog.filter({ created_by: user.email }, "-created_date", 100);
    },
  });

  const handleSave = async (data) => {
    await base44.entities.CardioLog.create(data);
    queryClient.invalidateQueries({ queryKey: ["cardioLogs"] });
    setScreen("home");
    setSessionType(null);
    setMachine(null);
    setActivity(null);
  };

  const cancelSession = () => {
    setScreen("home");
    setSessionType(null);
    setMachine(null);
    setActivity(null);
  };

  // Stats
  const totalSeconds = logs.reduce((s, l) => s + (l.duration_seconds || 0), 0);
  const totalMins = Math.round(totalSeconds / 60);
  const totalDist = logs.reduce((s, l) => s + (l.distance || 0), 0);
  const totalCal = logs.reduce((s, l) => s + (l.calories || 0), 0);
  const totalSessions = logs.length;

  // ── Screens ──
  if (screen === "session" && sessionType === "stationary" && machine) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-8">
        <StationarySession machine={machine} onSave={handleSave} onCancel={cancelSession} />
      </div>
    );
  }

  if (screen === "session" && sessionType === "mobile" && activity) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-8">
        <MobileSession activity={activity} userWeightKg={userWeight} onSave={handleSave} onCancel={cancelSession} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-6 space-y-5">
      <h1 className="text-2xl font-bold">Cardio</h1>

      {/* Start Cardio CTA */}
      <Button
        className="w-full h-14 rounded-2xl font-bold text-base gap-2 shadow-lg shadow-primary/20"
        onClick={() => setScreen("pick_type")}
      >
        <Play className="w-5 h-5" /> Start Cardio
      </Button>

      {/* Cardio Rank placeholder */}
      <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Activity className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cardio Rank</p>
          <p className="text-sm font-bold text-muted-foreground">Coming Soon</p>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Sessions", value: totalSessions, icon: Activity },
          { label: "Total Time", value: totalMins > 0 ? formatTotalMins(totalMins) : "0m", icon: Clock },
          { label: "Distance", value: `${totalDist.toFixed(1)} km`, icon: TrendingUp },
          { label: "Calories", value: totalCal > 0 ? `${totalCal.toLocaleString()} kcal` : "—", icon: Flame },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <Icon className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Recent Sessions</h2>
        {logs.length === 0 ? (
          <div className="text-center py-10">
            <Activity className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No sessions yet — start your first cardio!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 20).map(log => <CardioHistoryItem key={log.id} log={log} />)}
          </div>
        )}
      </div>

      {/* Type selection modal */}
      <AnimatePresence>
        {screen === "pick_type" && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4 sm:items-center"
            onClick={() => setScreen("home")}>
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold">Choose Cardio Type</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "stationary", icon: Bike, label: "Stationary", sub: "Treadmill, bike, rower…" },
                  { id: "mobile", icon: MapPin, label: "Mobile", sub: "Run, walk, hike…" },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id}
                      onClick={() => { setSessionType(item.id); setScreen(item.id === "stationary" ? "pick_machine" : "pick_activity"); }}
                      className="flex flex-col items-center gap-2 bg-secondary rounded-xl p-5 active:scale-95 transition-transform">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground text-center">{item.sub}</p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {screen === "pick_machine" && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4 sm:items-center"
            onClick={() => setScreen("pick_type")}>
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold">Select Machine</h3>
              <div className="space-y-2">
                {STATIONARY_MACHINES.map(m => (
                  <button key={m} onClick={() => { setMachine(m); setScreen("session"); }}
                    className="w-full flex items-center justify-between bg-secondary hover:bg-secondary/70 rounded-xl px-4 py-3.5 transition-colors">
                    <span className="text-sm font-medium">{m}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {screen === "pick_activity" && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4 sm:items-center"
            onClick={() => setScreen("pick_type")}>
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold">Select Activity</h3>
              <p className="text-xs text-muted-foreground -mt-2">GPS location will be used to track distance.</p>
              <div className="space-y-2">
                {MOBILE_ACTIVITIES.map(a => (
                  <button key={a}
                    onClick={() => {
                      navigator.geolocation.getCurrentPosition(
                        () => { setActivity(a); setScreen("session"); },
                        () => { setActivity(a); setScreen("session"); } // still allow if denied
                      );
                    }}
                    className="w-full flex items-center justify-between bg-secondary hover:bg-secondary/70 rounded-xl px-4 py-3.5 transition-colors">
                    <span className="text-sm font-medium">{a}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}