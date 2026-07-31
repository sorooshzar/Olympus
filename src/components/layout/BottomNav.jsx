import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Dumbbell, Plus, X, Activity, Apple } from "lucide-react";
import { motion } from "framer-motion";
import QuickActionMenu from "./QuickActionMenu";


export default function BottomNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  
  const currentPage = location.pathname.split('/').pop() || 'Profile';

  const tabs = [
    { name: "Profile", icon: User, page: "Profile" },
    { name: "Lifts", icon: Dumbbell, page: "Lifts" },
    { name: "plus", icon: Plus, page: null },
    { name: "Cardio", icon: Activity, page: "Cardio" },
    { name: "Macros", icon: Apple, page: "Macros" },
  ];

  const isActive = (page) => {
    if (!page) return false;
    if (page === "Lifts") return ["Lifts", "Workouts", "Exercises"].includes(currentPage);
    return currentPage === page;
  };

  return (
    <>
      <QuickActionMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl border-t border-border/50">
        <div className="flex items-center h-[52px] max-w-lg mx-auto">
          {tabs.map((tab) => {
            if (tab.name === "plus") {
              return (
                <div key="plus" className="flex-1 flex items-center justify-center">
                  <button onClick={() => setMenuOpen(!menuOpen)} className="relative -mt-5">
                    <motion.div
                      animate={{ rotate: menuOpen ? 45 : 0, scale: menuOpen ? 1.05 : 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                    >
                      {menuOpen ? (
                        <X className="w-5 h-5 text-primary-foreground" />
                      ) : (
                        <Plus className="w-5 h-5 text-primary-foreground" />
                      )}
                    </motion.div>
                  </button>
                </div>
              );
            }

            const Icon = tab.icon;
            const active = isActive(tab.page);

            return (
              <Link key={tab.name} to={createPageUrl(tab.page)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative">
                <Icon className={`w-[22px] h-[22px] transition-all duration-200 ${active ? "text-primary" : "text-muted-foreground/70"}`} strokeWidth={active ? 2.2 : 1.8} />
                <span className={`text-[9.5px] font-medium tracking-tight transition-colors duration-200 ${active ? "text-primary font-semibold" : "text-muted-foreground/70"}`}>
                  {tab.name}
                </span>
                {active && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute top-0 w-5 h-[2.5px] bg-primary rounded-full"
                    style={{ left: "calc(50% - 10px)" }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
}