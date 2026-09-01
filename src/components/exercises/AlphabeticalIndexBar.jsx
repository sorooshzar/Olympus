import React, { useRef, useState, useCallback, useLayoutEffect } from "react";

const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
// Touch zone hugs the list's right edge inside the row gutter. It must NOT
// extend left over the favourite-star button (which sits ~16px inside the
// list edge), so 14px leaves a small gap while staying grabbable.
const TOUCH_WIDTH = 14;

/**
 * iOS-style A-Z letter scrubber for the alphabetical exercises view.
 * It is a fixed overlay hugging the right edge of the list — it does NOT
 * take part in layout, so exercise rows keep their full width behind it.
 *
 * - TAP a letter → smooth-scrolls to the first exercise under that letter.
 * - SLIDE up/down anywhere in the touch zone → continuously scrubs the alphabet.
 * The active letter highlights in the accent color while touched; returns to
 * muted on release. All inactive letters share the same muted baseline style.
 * Tapping a letter with no matching exercises snaps to the nearest present one.
 */
export default function AlphabeticalIndexBar({ availableLetters = new Set() }) {
  const barRef = useRef(null);
  const [active, setActive] = useState(null);
  const touchedRecently = useRef(false);

  // Position the bar at the list's right edge, starting where the list content
  // begins (below search / New / filter row). Re-measured every render so it
  // tracks layout shifts (e.g. the ranked info banner toggling) and on resize.
  useLayoutEffect(() => {
    const bar = barRef.current;
    const list = document.querySelector("[data-exercise-list]");
    if (!bar || !list) return;
    const measure = () => {
      const r = list.getBoundingClientRect();
      // r.top is viewport-relative; add scrollY to get the fixed top at scroll 0.
      bar.style.top = `${Math.round(r.top + window.scrollY)}px`;
      bar.style.left = `${Math.round(r.right - TOUCH_WIDTH)}px`;
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  });

  const scrollToLetter = useCallback((letter) => {
    let target = document.querySelector(`[data-letter="${letter}"]`);
    if (!target) {
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
    if (touchedRecently.current) return;
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
      className="fixed z-30 flex flex-col items-end gap-0 py-1 select-none touch-none cursor-pointer"
      style={{ width: `${TOUCH_WIDTH}px` }}
    >
      {LETTERS.map((l) => {
        const isActive = active === l;
        return (
          <span
            key={l}
            className={`leading-[10px] text-[9px] font-medium transition-colors ${isActive ? "text-primary font-bold" : "text-muted-foreground/50"}`}
          >
            {l}
          </span>
        );
      })}
    </div>
  );
}