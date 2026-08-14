import React, { useState, useRef, useCallback, useEffect } from "react";

/**
 * Self-contained, auto-dismissing pill toast — no reliance on the global toaster.
 * Returns `{ showToast, element }`. Render `element` anywhere in your component.
 * Fades out via CSS transition; unmounts after the fade completes.
 */
export function useInlineToast() {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef(null);
  const unmountTimer = useRef(null);

  const showToast = useCallback((message) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    setMsg(message);
    // mount + fade in next tick so the transition runs
    requestAnimationFrame(() => setVisible(true));
    hideTimer.current = setTimeout(() => {
      setVisible(false); // CSS fade-out
      unmountTimer.current = setTimeout(() => setMsg(""), 300); // unmount after fade
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
    };
  }, []);

  const element = msg ? (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium shadow-lg transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {msg}
    </div>
  ) : null;

  return { showToast, element };
}