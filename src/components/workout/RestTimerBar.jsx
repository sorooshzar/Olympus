import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Pause, Play, X, Plus, Minus } from "lucide-react";
import { useRestTimer } from "./RestTimerContext";

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CountdownRing({ progress, completed }) {
  const size = 40;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - (completed ? 0 : progress));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ willChange: "transform" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="hsl(var(--primary))" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.25s linear", willChange: "stroke-dashoffset" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Timer className={`w-4 h-4 ${completed ? "text-primary" : "text-muted-foreground"}`} />
      </div>
    </div>
  );
}

export default function RestTimerBar() {
  const { seconds, total, running, visible, completed, pause, resume, adjust, skip } = useRestTimer();

  const progress = total > 0 ? seconds / total : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 35 }}
          className="fixed bottom-20 left-0 right-0 z-[60] px-3 pointer-events-none"
        >
          <div className="pointer-events-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-secondary w-full">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.25, ease: "linear" }}
              />
            </div>

            <div className="px-4 py-3 flex items-center gap-3">
              {/* Label + icon */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <CountdownRing progress={progress} completed={completed} />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">
                    {completed ? "Rest Complete!" : "Rest Timer"}
                  </p>
                  <p className={`text-xl font-black font-mono leading-tight ${completed ? "text-primary" : "text-foreground"}`}>
                    {completed ? "Done" : fmt(seconds)}
                  </p>
                </div>
              </div>

              {!completed && (
                <div className="flex items-center gap-1.5">
                  {/* −15 */}
                  <button
                    onClick={() => adjust(-15)}
                    className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <div className="flex items-center gap-0.5">
                      <Minus className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-muted-foreground">15</span>
                    </div>
                  </button>

                  {/* Pause / Resume */}
                  <button
                    onClick={running ? pause : resume}
                    className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center active:scale-90 transition-transform"
                  >
                    {running
                      ? <Pause className="w-4 h-4 text-primary-foreground" />
                      : <Play className="w-4 h-4 text-primary-foreground" />
                    }
                  </button>

                  {/* +15 */}
                  <button
                    onClick={() => adjust(15)}
                    className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <div className="flex items-center gap-0.5">
                      <Plus className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-muted-foreground">15</span>
                    </div>
                  </button>

                  {/* Skip */}
                  <button
                    onClick={skip}
                    className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              )}

              {completed && (
                <button
                  onClick={skip}
                  className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}