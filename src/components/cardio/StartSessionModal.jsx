import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Navigation, Clock } from "lucide-react";
import { haptic } from "@/components/utils/haptics";
import { STATIONARY_ACTIVITIES, MOBILE_ACTIVITIES, getActivityColor, MODE_COLORS } from "./cardioConfig";

export default function StartSessionModal({ open, onClose, onSelectActivity }) {
  const [step, setStep] = useState("mode"); // "mode" | "activities"
  const [mode, setMode] = useState(null);

  const handleClose = () => {
    setStep("mode");
    setMode(null);
    onClose();
  };

  const handleMode = (m) => {
    haptic.light();
    setMode(m);
    setStep("activities");
  };

  const handleActivity = (name) => {
    haptic.medium();
    onSelectActivity({ mode, activity: name });
    setStep("mode");
    setMode(null);
  };

  const activities = mode === "stationary" ? STATIONARY_ACTIVITIES : MOBILE_ACTIVITIES;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            style={{ borderRadius: 16, background: "#1E1E1E" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {step === "activities" && (
                  <button
                    onClick={() => { haptic.light(); setStep("mode"); }}
                    className="p-1 -ml-1 text-muted-foreground active:scale-90 transition-transform"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <h3 className="text-lg font-bold">
                  {step === "mode" ? "Start Session" : mode === "stationary" ? "Stationary" : "Mobile"}
                </h3>
              </div>
              <button onClick={handleClose} className="p-1 text-muted-foreground active:scale-90 transition-transform">
                <X className="w-5 h-5" />
              </button>
            </div>

            {step === "mode" && (
              <div className="grid grid-cols-1 gap-3 pt-1">
                <ModeCard
                  icon={Navigation}
                  color={MODE_COLORS.mobile}
                  title="Mobile"
                  subtitle="Running, cycling, hiking with GPS route tracking"
                  onClick={() => handleMode("mobile")}
                />
                <ModeCard
                  icon={Clock}
                  color={MODE_COLORS.stationary}
                  title="Stationary"
                  subtitle="Treadmill, bike, elliptical and more"
                  onClick={() => handleMode("stationary")}
                />
              </div>
            )}

            {step === "activities" && (
              <div className="pt-1">
                {mode === "mobile" && (
                  <p className="text-xs text-muted-foreground px-1 pb-3">
                    GPS location will be used to track distance and route.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {activities.map((a) => {
                    const Icon = a.icon;
                    const c = getActivityColor(a.name);
                    return (
                      <button
                        key={a.name}
                        onClick={() => handleActivity(a.name)}
                        className="flex flex-col items-center gap-2 bg-secondary rounded-2xl p-4 active:scale-[0.97] transition-transform"
                      >
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{ background: `${c}1F` }}
                        >
                          <Icon className="w-6 h-6" style={{ color: c }} />
                        </div>
                        <span className="text-sm font-semibold text-center leading-tight">{a.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ModeCard({ icon: Icon, color, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 bg-secondary rounded-2xl p-4 transition-colors active:scale-[0.98] relative overflow-hidden"
    >
      <span className="absolute left-0 top-0 h-full w-1.5" style={{ background: color }} />
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}1F` }}
      >
        <Icon className="w-7 h-7" style={{ color }} />
      </div>
      <div className="flex-1 text-left">
        <p className="font-bold text-base">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </button>
  );
}