import React, { useState } from "react";
import { Info, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RankedInfoBanner({ active }) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.button
            type="button"
            onClick={() => setShowInfo(true)}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full overflow-hidden"
          >
            <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl bg-amber-400/10 border border-amber-400/15 text-left">
              <Info className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
              <span className="text-xs text-muted-foreground flex-1 truncate">
                Showing ranked exercises only
              </span>
              <span className="text-xs font-semibold text-amber-400 underline underline-offset-2 flex-shrink-0">
                Learn More
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Crown className="w-5 h-5 text-amber-400 flex-shrink-0" fill="#FFD700" strokeWidth={1.5} />
                <DialogTitle className="text-lg font-bold">What are Ranked Exercises?</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ranked exercises are lifts that have established strength standards based on your bodyweight and gender. When you log these exercises in your workouts, Olympus calculates your estimated one-rep max and compares it against calibrated benchmarks to assign you a rank.
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Ranks range from <span className="text-bronze font-medium">Bronze</span> all the way up to <span className="text-rank-olympian font-medium">Olympian</span> — each tier represents a different level of relative strength. As you get stronger, you'll climb the ranks.
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Your highest achieved rank for each muscle group is displayed on your Body Model. Muscles light up with their corresponding rank color, giving you a visual map of your strongest and most developed areas.
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Exercises marked with a <Crown className="inline-block w-3.5 h-3.5 text-amber-400 align-text-bottom" fill="#FFD700" strokeWidth={1.5} /> gold crown icon are ranked — meaning they contribute to your muscle ranks and body model. Non-ranked exercises are still great for training, but they don't have strength standards to compare against.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}