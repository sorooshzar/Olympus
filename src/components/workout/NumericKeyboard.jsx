import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete } from "lucide-react";

export default function NumericKeyboard({ visible, value, onValue, onDone, label, quickAdds }) {
  const handleKey = (key) => {
    if (key === "back") {
      const s = String(value ?? "");
      onValue(s.slice(0, -1));
    } else if (key === ".") {
      const s = String(value ?? "");
      if (!s.includes(".")) onValue(s + ".");
    } else {
      const s = String(value ?? "");
      if (s.length >= 6) return;
      onValue(s + key);
    }
  };

  const handleQuickAdd = (amount) => {
    const num = parseFloat(value) || 0;
    onValue(String(+(num + amount).toFixed(2)));
  };

  const rows = [["7","8","9"], ["4","5","6"], ["1","2","3"], [".","0","back"]];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="kb"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
          data-kb-root
          className="fixed bottom-0 left-0 right-0 z-[200] bg-card border-t border-border shadow-2xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Label + quick adds */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
            {quickAdds && (
              <div className="flex gap-1.5">
                {quickAdds.map(a => (
                  <button key={a} onPointerDown={() => handleQuickAdd(a)}
                    className="px-3 py-1 rounded-lg bg-primary/15 text-primary text-xs font-bold active:scale-95 transition-transform">
                    +{a}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Value display */}
          <div className="mx-4 mb-3 h-11 bg-secondary rounded-xl flex items-center justify-center">
            <span className="text-2xl font-bold tracking-widest">
              {value === "" || value == null
                ? <span className="text-muted-foreground/40">0</span>
                : value}
            </span>
          </div>

          {/* Keys */}
          <div className="flex gap-2 px-4 pb-4">
            {/* Left: 4×3 numpad */}
            <div className="flex-1 grid grid-cols-3 gap-2">
              {rows.map((row, ri) =>
                row.map(k => (
                  <button
                    key={`${ri}-${k}`}
                    onPointerDown={() => handleKey(k)}
                    className="h-14 rounded-xl bg-secondary flex items-center justify-center active:opacity-60 active:scale-95 transition-all select-none"
                  >
                    {k === "back"
                      ? <Delete className="w-5 h-5 text-foreground" />
                      : <span className="text-xl font-semibold text-foreground">{k}</span>}
                  </button>
                ))
              )}
            </div>
            {/* Right: Done */}
            <button
              onPointerDown={onDone}
              className="w-20 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:opacity-80 active:scale-95 transition-all select-none font-bold text-base"
            >
              Done
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}