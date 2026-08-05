import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * First-visit contextual tooltip. Shows once per user (dismissal persisted in
 * localStorage), then never again. Floats near the feature it explains.
 *
 * props:
 *  - storageKey: unique id for this tooltip (used in localStorage)
 *  - title: short heading
 *  - text: 1-2 sentence explanation
 *  - pointerAlign: "left" | "center" | "right" — where the arrow sits
 *  - arrow: "top" (default, card below target pointing up) | "bottom" (card above target pointing down)
 *  - offsetClass: tailwind positioning relative to the wrapping element
 */
export default function FirstVisitTooltip({
  storageKey,
  title,
  text,
  pointerAlign = "right",
  arrow = "top",
  offsetClass,
}) {
  const [visible, setVisible] = useState(false);

  const resolvedOffset =
    offsetClass || (arrow === "bottom" ? "bottom-full mb-2" : "top-full mt-2");

  useEffect(() => {
    if (!storageKey) return;
    let dismissed = false;
    try {
      dismissed = !!localStorage.getItem(`tooltip-${storageKey}`);
    } catch {}
    if (!dismissed) {
      const t = setTimeout(() => setVisible(true), 350);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(`tooltip-${storageKey}`, "1");
    } catch {}
  };

  const alignClass =
    pointerAlign === "left"
      ? "left-1"
      : pointerAlign === "center"
      ? "left-1/2 -translate-x-1/2"
      : "right-1";

  const arrowLeft =
    pointerAlign === "left"
      ? "12px"
      : pointerAlign === "center"
      ? "calc(50% - 6px)"
      : "calc(100% - 24px)";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: arrow === "top" ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: arrow === "top" ? 8 : -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`absolute ${resolvedOffset} ${alignClass} z-30 w-[300px] max-w-[calc(100vw-2rem)] pointer-events-auto`}
        >
          <div className="relative bg-[#1c1c22] border border-white/10 rounded-2xl p-3.5 shadow-2xl">
            {/* Pointer arrow */}
            <div
              className="absolute w-3 h-3 bg-[#1c1c22] border-white/10 rotate-45"
              style={
                arrow === "top"
                  ? { top: "-6px", left: arrowLeft, borderTop: "1px solid rgba(255,255,255,0.1)", borderLeft: "1px solid rgba(255,255,255,0.1)" }
                  : { bottom: "-6px", left: arrowLeft, borderBottom: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.1)" }
              }
            />
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                  {text}
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-2.5">
              <button
                onClick={handleDismiss}
                className="flex items-center gap-1 bg-primary/15 text-primary text-[11px] font-semibold px-3 py-1.5 rounded-full active:scale-95 transition"
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}