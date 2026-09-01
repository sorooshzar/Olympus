import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Activity, Scale, Apple, ChevronRight, Bike, MapPin, FolderOpen, ChevronDown, Dumbbell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useActiveWorkout } from "@/components/workout/ActiveWorkoutContext";

function WorkoutPicker({ onClose }) {
  const navigate = useNavigate();
  const { startWorkout } = useActiveWorkout();
  const [openFolders, setOpenFolders] = useState({});
  const { data: folders = [] } = useQuery({ queryKey: ["folders"], queryFn: () => base44.entities.WorkoutFolder.list("order", 100) });
  const { data: templates = [] } = useQuery({ queryKey: ["templates"], queryFn: () => base44.entities.WorkoutTemplate.list("order", 100) });

  const start = (t) => { onClose(); startWorkout(t); navigate(createPageUrl("ActiveWorkout")); };
  const quickStart = () => { onClose(); startWorkout(null); navigate(createPageUrl("ActiveWorkout")); };

  const toggle = (id) => setOpenFolders(p => ({ ...p, [id]: !p[id] }));

  const archivedFolder = folders.find(f => f.name === "Archived");
  const regularFolders = folders.filter(f => f.name !== "Archived");

  const renderFolder = (folder, defaultOpen = true) => {
    const ft = templates.filter(t => t.folder_id === folder.id);
    const isOpen = folder.id in openFolders ? openFolders[folder.id] : defaultOpen;
    return (
      <div key={folder.id} className="bg-secondary/50 rounded-xl overflow-hidden">
        <button onClick={() => toggle(folder.id)} className="flex items-center w-full px-4 py-3 gap-2">
          <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="flex-1 text-left text-sm font-semibold">{folder.name}</span>
          <span className="text-xs text-muted-foreground">{ft.length}</span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {isOpen && ft.map(t => (
          <button key={t.id} onClick={() => start(t)} className="flex items-center w-full px-4 py-2.5 gap-3 hover:bg-secondary/80 border-t border-border/30">
            <Dumbbell className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.exercises?.length || 0} exercises</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col" style={{ height: "85vh" }}>
      <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
        <h2 className="text-lg font-bold">Start Workout</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {regularFolders.map(folder => renderFolder(folder, true))}
        {templates.filter(t => !t.folder_id).map(t => (
          <button key={t.id} onClick={() => start(t)} className="flex items-center w-full bg-secondary/50 rounded-xl px-4 py-3 gap-3">
            <Dumbbell className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.exercises?.length || 0} exercises</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
        {archivedFolder && (
          <div className="opacity-50">{renderFolder(archivedFolder, false)}</div>
        )}
      </div>
      <div className="p-4 pt-2 flex-shrink-0">
        <button onClick={quickStart} className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/30">
          <Zap className="w-5 h-5" /> Quick Start
        </button>
      </div>
    </div>
  );
}

function CardioTypePicker({ onClose }) {
  const navigate = useNavigate();
  const go = (type) => { onClose(); navigate(createPageUrl(`Cardio?type=${type}`)); };
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">Track Cardio</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary"><X className="w-4 h-4" /></button>
      </div>
      <button onClick={() => go("stationary")} className="w-full bg-secondary rounded-2xl p-6 flex items-center gap-4 active:scale-95 transition-transform">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Bike className="w-7 h-7 text-primary" />
        </div>
        <div className="text-left">
          <p className="font-bold text-base">Stationary</p>
          <p className="text-xs text-muted-foreground mt-0.5">Treadmill, bike, elliptical...</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
      </button>
      <button onClick={() => go("mobile")} className="w-full bg-secondary rounded-2xl p-6 flex items-center gap-4 active:scale-95 transition-transform">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
          <MapPin className="w-7 h-7 text-primary" />
        </div>
        <div className="text-left">
          <p className="font-bold text-base">Mobile</p>
          <p className="text-xs text-muted-foreground mt-0.5">Running, walking, cycling...</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
      </button>
    </div>
  );
}

function WeightLogger({ onClose }) {
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);
  const weightUnit = localStorage.getItem("gym-weight-unit") || "kg";

  const save = async () => {
    if (!weight) return;
    setSaving(true);
    await base44.entities.BodyWeight.create({ weight: parseFloat(weight), unit: weightUnit, date });
    setSaving(false);
    onClose();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Log Weight</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary"><X className="w-4 h-4" /></button>
      </div>
      <div className="relative">
        <Input type="number" step="0.1" placeholder="80.0" value={weight}
          onChange={e => setWeight(e.target.value)}
          className="text-center text-3xl font-bold h-16 bg-secondary border-0 rounded-2xl pr-16" autoFocus />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">{weightUnit}</span>
      </div>
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-secondary border-0 rounded-xl" />
      <Button onClick={save} disabled={!weight || saving} className="w-full h-12 rounded-2xl font-bold">
        {saving ? "Saving..." : "Save Weight"}
      </Button>
    </div>
  );
}

export default function QuickActionMenu({ open, onClose }) {
  const [screen, setScreen] = useState("main");
  const navigate = useNavigate();

  const handleClose = () => { setScreen("main"); onClose(); };

  const mainItems = [
    { id: "workout", icon: Zap, label: "Start Workout", color: "text-primary", bg: "bg-primary/10" },
    { id: "cardio", icon: Activity, label: "Track Cardio", color: "text-green-500", bg: "bg-green-500/10" },
    { id: "weight", icon: Scale, label: "Log Weight", color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: "macros", icon: Apple, label: "Record Macros", color: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={handleClose}>
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full max-w-lg bg-card rounded-t-3xl border-t border-border overflow-hidden"
            style={{ maxHeight: "85vh" }}
            onClick={e => e.stopPropagation()}>

            {screen === "main" && (
              <div className="p-6 pb-8">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold">Quick Actions</h2>
                  <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {mainItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <button key={item.id} onClick={() => {
                        if (item.id === "macros") { navigate(createPageUrl("Macros?tab=foods")); handleClose(); }
                        else setScreen(item.id);
                      }}
                        className="flex flex-col items-center gap-3 bg-secondary/50 rounded-2xl p-5 active:scale-95 transition-transform">
                        <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${item.color}`} />
                        </div>
                        <span className="text-sm font-semibold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {screen === "workout" && (
              <div className="overflow-hidden">
                <WorkoutPicker onClose={handleClose} />
              </div>
            )}

            {screen === "cardio" && <CardioTypePicker onClose={handleClose} />}
            {screen === "weight" && <WeightLogger onClose={handleClose} />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}