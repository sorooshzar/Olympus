import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Dumbbell, MapPin } from "lucide-react";
import { haptic } from "@/components/utils/haptics";
import { STATIONARY_ACTIVITIES, MOBILE_ACTIVITIES } from "./cardioConfig";

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
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-border p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto"
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
                  icon={Dumbbell}
                  title="Stationary"
                  subtitle="Treadmill, bike, elliptical and more"
                  onClick={() => handleMode("stationary")}
                />
                <ModeCard
                  icon={MapPin}
                  title="Mobile"
                  subtitle="Running, cycling, hiking with GPS"
                  onClick={() => handleMode("mobile")}
                />
              </div>
            )}

            {step === "activities" && (
              <div className="space-y-1.5 pt-1">
                {mode === "mobile" && (
                  <p className="text-xs text-muted-foreground px-1 pb-2">
                    GPS location will be used to track distance and route.
                  </p>
                )}
                {activities.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.name}
                      onClick={() => handleActivity(a.name)}
                      className="w-full flex items-center gap-3 bg-secondary hover:bg-secondary/70 rounded-xl px-4 py-3.5 transition-colors active:scale-[0.98] active:bg-secondary/80"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium flex-1 text-left">{a.name}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ModeCard({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 bg-secondary hover:bg-secondary/70 rounded-2xl p-4 transition-colors active:scale-[0.98]"
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-bold text-base">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </button>
  );
}