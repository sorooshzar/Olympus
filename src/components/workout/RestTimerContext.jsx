import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { userStorage } from "@/components/utils/userStorage";
import { haptic } from "@/components/utils/haptics";

const RestTimerContext = createContext(null);

export function RestTimerProvider({ children }) {
  const [seconds, setSeconds]       = useState(0);
  const [total, setTotal]           = useState(0);
  const [running, setRunning]       = useState(false);
  const [visible, setVisible]       = useState(false);
  const [completed, setCompleted]   = useState(false); // "Rest Complete" flash
  const intervalRef                 = useRef(null);
  const startedAtRef                = useRef(null);   // wall-clock when timer started
  const remainingAtPauseRef         = useRef(0);

  // Cleanup on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const _clearInterval = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const _tick = useCallback((duration) => {
    _clearInterval();
    startedAtRef.current = Date.now();
    remainingAtPauseRef.current = duration;

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const remaining = Math.max(0, remainingAtPauseRef.current - elapsed);
      setSeconds(remaining);
      if (remaining <= 0) {
        _clearInterval();
        setRunning(false);
        setCompleted(true);
        // Light haptic on completion (fails silently on unsupported devices)
        haptic.light();
        // Sound
        if (userStorage.getItem("gym-timer-sound") !== "false") {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.8);
          } catch {}
        }
        // Vibration
        if (userStorage.getItem("gym-timer-vibration") !== "false" && navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
        // Auto-hide after 3s
        setTimeout(() => {
          setVisible(false);
          setCompleted(false);
          setSeconds(0);
          setTotal(0);
        }, 3000);
      }
    }, 250); // poll every 250ms for accuracy
  }, []);

  const start = useCallback((duration) => {
    _clearInterval();
    setTotal(duration);
    setSeconds(duration);
    setRunning(true);
    setVisible(true);
    setCompleted(false);
    remainingAtPauseRef.current = duration;
    startedAtRef.current = Date.now();
    _tick(duration);
  }, [_tick]);

  const pause = useCallback(() => {
    if (!running) return;
    _clearInterval();
    // Snapshot remaining
    const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
    remainingAtPauseRef.current = Math.max(0, remainingAtPauseRef.current - elapsed);
    setSeconds(remainingAtPauseRef.current);
    setRunning(false);
  }, [running]);

  const resume = useCallback(() => {
    if (running || seconds <= 0) return;
    startedAtRef.current = Date.now();
    setRunning(true);
    _tick(seconds);
  }, [running, seconds, _tick]);

  const adjust = useCallback((delta) => {
    setSeconds(prev => {
      const next = Math.max(0, prev + delta);
      // Update the remaining snapshot so tick re-anchors correctly
      if (running) {
        _clearInterval();
        remainingAtPauseRef.current = next;
        startedAtRef.current = Date.now();
        intervalRef.current = null;
        // restart tick with new value
        setTimeout(() => _tick(next), 0);
      } else {
        remainingAtPauseRef.current = next;
      }
      return next;
    });
  }, [running, _tick]);

  const skip = useCallback(() => {
    _clearInterval();
    setRunning(false);
    setVisible(false);
    setCompleted(false);
    setSeconds(0);
    setTotal(0);
  }, []);

  return (
    <RestTimerContext.Provider value={{ seconds, total, running, visible, completed, start, pause, resume, adjust, skip }}>
      {children}
    </RestTimerContext.Provider>
  );
}

export function useRestTimer() {
  return useContext(RestTimerContext);
}