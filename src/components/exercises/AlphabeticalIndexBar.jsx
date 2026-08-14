import React, { useRef, useState, useCallback } from "react";

const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

/**
 * iOS-style A-Z letter scrubber. Only meant for the alphabetical exercises view.
 * - TAP a letter → smooth-scrolls to the first exercise under that letter.
 * - SLIDE up/down → continuously scrubs through the alphabet.
 * Active letter highlights in the accent color while touched; returns to muted on release.
 * Letters with no matching exercises are dimmed; tapping them snaps to the nearest present letter.
 */
export default function AlphabeticalIndexBar({ availableLetters = new Set() }) {
  const barRef = useRef(null);
  const [active, setActive] = useState(null);
  const touchedRecently = useRef(false);

  const scrollToLetter = useCallback((letter) => {
    let target = document.querySelector(`[data-letter="${letter}"]`);
    if (!target) {
      // Snap to nearest present letter
      const idx = LETTERS.indexOf(letter);
      for (let d = 1; d < LETTERS.length; d++) {
        const hi = idx + d, lo = idx - d;
        if (hi < LETTERS.length && availableLetters.has(LETTERS[hi])) { target = document.querySelector(`[data-letter="${LETTERS[hi]}"]`); break; }
        if (lo >= 0 && availableLetters.has(LETTERS[lo])) { target = document.querySelector(`[data-letter="${LETTERS[lo]}"]`); break; }
      }
    }
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [availableLetters]);

  const letterFromY = useCallback((clientY) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.height <= 0) return null;
    let idx = Math.round((clientY - rect.top) / (rect.height / LETTERS.length));
    idx = Math.max(0, Math.min(LETTERS.length - 1, idx));
    return LETTERS[idx];
  }, []);

  const scrub = useCallback((clientY) => {
    const l = letterFromY(clientY);
    if (!l) return;
    setActive(l);
    scrollToLetter(l);
  }, [letterFromY, scrollToLetter]);

  const onTouchStart = (e) => { scrub(e.touches[0].clientY); };
  const onTouchMove = (e) => { scrub(e.touches[0].clientY); };
  const onTouchEnd = () => {
    setActive(null);
    touchedRecently.current = true;
    setTimeout(() => { touchedRecently.current = false; }, 400);
  };
  const onClick = (e) => {
    if (touchedRecently.current) return; // avoid double-fire after touch
    const l = letterFromY(e.clientY);
    if (!l) return;
    setActive(l);
    scrollToLetter(l);
    setTimeout(() => setActive(null), 350);
  };

  return (
    <div
      ref={barRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={onClick}
      className="fixed z-30 flex flex-col items-center justify-between py-1 select-none touch-none cursor-pointer"
      style={{
        right: "max(8px, calc(50% - 252px))",
        top: "calc(env(safe-area-inset-top) + 76px)",
        bottom: "calc(env(safe-area-inset-bottom) + 72px)",
        width: "16px",
      }}
    >
      {LETTERS.map((l) => {
        const present = availableLetters.has(l);
        const isActive = active === l;
        return (
          <span
            key={l}
            className={`leading-none transition-colors text-[10px] ${isActive ? "text-primary font-bold" : present ? "text-muted-foreground/60" : "text-muted-foreground/20"}`}
          >
            {l}
          </span>
        );
      })}
    </div>
  );
}