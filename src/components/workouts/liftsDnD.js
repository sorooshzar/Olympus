import { useState, useRef, useCallback, useEffect } from "react";

const LONG_PRESS_MS = 380;
const MOVE_THRESHOLD = 10; // px to cancel long-press (treat as scroll/tap)
const EDGE_ZONE = 80; // px from top/bottom that triggers auto-scroll
const EDGE_MAX_SPEED = 14; // px per frame at the very edge

// Custom long-press drag-and-drop for the Lifts page.
// - One flat hit-test pass over rendered bars (data-lift attrs) -> drop slots.
// - Folder drag: only top-level gaps are valid; other folders force-collapse.
// - Workout drag: top-level gaps (-> standalone) + interior gaps of OPEN folders.
// - GPU transforms via fixed-position ghost; auto-scroll near viewport edges.
export function useLiftsDrag({ containerRef, onDrop, isOpen }) {
  const [ghost, setGhost] = useState(null); // { descriptor, y, left, width }
  const [indicator, setIndicator] = useState(null); // { y, left, width }

  const onDropRef = useRef(onDrop); onDropRef.current = onDrop;
  const isOpenRef = useRef(isOpen); isOpenRef.current = isOpen;

  const s = useRef({
    active: false, pointerId: null, startX: 0, startY: 0, timer: null,
    descriptor: null, offsetY: 0, lastY: 0, raf: 0, scrollRaf: 0, el: null,
    pre: null, bound: false,
  });
  const targetRef = useRef(null); // current drop slot
  const onUpRef = useRef(null);

  const computeTarget = useCallback((clientY) => {
    const st = s.current;
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();

    const topEls = Array.from(container.querySelectorAll('[data-lift="top"]'));
    if (!topEls.length) { targetRef.current = null; setIndicator(null); return; }

    // Build top-level "blocks": folders span header..last-child; workouts span themselves.
    const blocks = topEls.map(el => {
      const r = el.getBoundingClientRect();
      if (el.dataset.liftIsheader === "1") {
        const fid = el.dataset.liftId;
        const childEls = Array.from(container.querySelectorAll(`[data-lift-folder="${fid}"]`));
        let bottom = r.bottom;
        if (childEls.length) bottom = childEls[childEls.length - 1].getBoundingClientRect().bottom;
        return { top: r.top, bottom, kind: "folder", id: fid };
      }
      return { top: r.top, bottom: r.bottom, kind: "workout", id: el.dataset.liftId };
    });

    const gaps = [];
    // Top-level gaps (valid for both folder + workout drags)
    for (let k = 0; k <= blocks.length; k++) {
      const y = k === 0 ? blocks[0].top : blocks[k - 1].bottom;
      gaps.push({ kind: "top", index: k, y });
    }
    // Interior gaps of open folders (valid only for workout drags)
    if (st.descriptor && st.descriptor.kind === "workout") {
      for (const b of blocks) {
        if (b.kind !== "folder") continue;
        if (!isOpenRef.current(b.id)) continue;
        const childEls = Array.from(container.querySelectorAll(`[data-lift-folder="${b.id}"]`));
        if (childEls.length) {
          for (let j = 0; j <= childEls.length; j++) {
            const y = j === 0
              ? childEls[0].getBoundingClientRect().top
              : childEls[j - 1].getBoundingClientRect().bottom;
            gaps.push({ kind: "folder", folderId: b.id, index: j, y });
          }
        } else {
          const content = container.querySelector(`[data-folder-children="${b.id}"]`);
          if (content) gaps.push({ kind: "folder", folderId: b.id, index: 0, y: content.getBoundingClientRect().top + 10 });
        }
      }
    }

    let best = null, bestDist = Infinity;
    for (const g of gaps) {
      const d = Math.abs(clientY - g.y);
      if (d < bestDist) { bestDist = d; best = g; }
    }
    targetRef.current = best;
    setIndicator(best ? { y: best.y, left: cRect.left, width: cRect.width } : null);
  }, [containerRef]);

  const edgeScroll = useCallback(() => {
    const st = s.current;
    const step = () => {
      if (!st.active) return;
      const y = st.lastY;
      const vh = window.innerHeight;
      let delta = 0;
      if (y < EDGE_ZONE) delta = -EDGE_MAX_SPEED * (1 - y / EDGE_ZONE);
      else if (y > vh - EDGE_ZONE) delta = EDGE_MAX_SPEED * (1 - (vh - y) / EDGE_ZONE);
      if (Math.abs(delta) > 0.4) {
        window.scrollBy(0, delta);
        computeTarget(y);
      }
      st.scrollRaf = requestAnimationFrame(step);
    };
    cancelAnimationFrame(st.scrollRaf);
    st.scrollRaf = requestAnimationFrame(step);
  }, [computeTarget]);

  const onMove = useCallback((e) => {
    const st = s.current;
    if (!st.active || e.pointerId !== st.pointerId) return;
    e.preventDefault();
    st.lastY = e.clientY;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = requestAnimationFrame(() => {
      const cRect = containerRef.current.getBoundingClientRect();
      setGhost(g => g ? { ...g, y: e.clientY - st.offsetY, left: cRect.left, width: cRect.width } : g);
      computeTarget(e.clientY);
    });
  }, [computeTarget, containerRef]);

  const onTouchMove = useCallback((e) => {
    if (s.current.active) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, []);

  const clear = useCallback(() => {
    const st = s.current;
    if (st.timer) { clearTimeout(st.timer); st.timer = null; }
    if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
    if (st.scrollRaf) { cancelAnimationFrame(st.scrollRaf); st.scrollRaf = 0; }
    if (st.pre) {
      window.removeEventListener("pointermove", st.pre.move);
      window.removeEventListener("pointerup", st.pre.up);
      window.removeEventListener("pointercancel", st.pre.up);
      st.pre = null;
    }
    if (st.bound) {
      window.removeEventListener("pointermove", onMove);
      if (onUpRef.current) {
        window.removeEventListener("pointerup", onUpRef.current);
        window.removeEventListener("pointercancel", onUpRef.current);
      }
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      st.bound = false;
    }
    document.body.style.userSelect = "";
    try { if (st.el && st.el.releasePointerCapture) st.el.releasePointerCapture(st.pointerId); } catch {}
    st.active = false; st.descriptor = null; st.el = null; st.pointerId = null;
    targetRef.current = null;
    setGhost(null); setIndicator(null);
  }, [onMove, onTouchMove]);

  const onUp = useCallback((e) => {
    const st = s.current;
    if (!st.active || e.pointerId !== st.pointerId) return;
    const target = targetRef.current;
    const descriptor = st.descriptor;
    // swallow the click that follows a drag so taps don't fire
    const kill = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener("click", kill, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", kill, { capture: true }), 400);
    clear();
    if (target && descriptor) onDropRef.current({ source: descriptor, target });
  }, [clear]);
  onUpRef.current = onUp;

  const beginDrag = useCallback((e) => {
    const st = s.current;
    st.timer = null;
    st.active = true;
    document.body.style.userSelect = "none";
    // remove pre-drag listeners
    if (st.pre) {
      window.removeEventListener("pointermove", st.pre.move);
      window.removeEventListener("pointerup", st.pre.up);
      window.removeEventListener("pointercancel", st.pre.up);
      st.pre = null;
    }
    try { st.el.setPointerCapture(st.pointerId); } catch {}
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    st.bound = true;
    const cRect = containerRef.current.getBoundingClientRect();
    setGhost({ descriptor: st.descriptor, y: e.clientY - st.offsetY, left: cRect.left, width: cRect.width });
    computeTarget(e.clientY);
    edgeScroll();
  }, [onMove, onUp, onTouchMove, computeTarget, edgeScroll, containerRef]);

  const bindBar = useCallback((descriptor) => ({
    onPointerDown: (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const st = s.current;
      if (st.active) return;
      st.pointerId = e.pointerId;
      st.startX = e.clientX; st.startY = e.clientY;
      st.descriptor = descriptor;
      st.lastY = e.clientY;
      const el = e.currentTarget;
      st.el = el;
      const r = el.getBoundingClientRect();
      st.offsetY = e.clientY - r.top;

      const preMove = (ev) => {
        if (ev.pointerId !== st.pointerId) return;
        const dx = ev.clientX - st.startX, dy = ev.clientY - st.startY;
        if (Math.hypot(dx, dy) > MOVE_THRESHOLD) cancelPre();
      };
      const preUp = (ev) => {
        if (ev.pointerId !== st.pointerId) return;
        cancelPre();
      };
      const cancelPre = () => {
        if (st.timer) { clearTimeout(st.timer); st.timer = null; }
        window.removeEventListener("pointermove", preMove);
        window.removeEventListener("pointerup", preUp);
        window.removeEventListener("pointercancel", preUp);
        st.pre = null;
      };
      st.pre = { move: preMove, up: preUp };
      window.addEventListener("pointermove", preMove);
      window.addEventListener("pointerup", preUp);
      window.addEventListener("pointercancel", preUp);
      st.timer = setTimeout(() => beginDrag(e), LONG_PRESS_MS);
    },
  }), [beginDrag]);

  useEffect(() => () => clear(), [clear]);

  const dragInfo = ghost ? { id: ghost.descriptor.id, kind: ghost.descriptor.kind } : null;
  return { bindBar, ghost, indicator, dragInfo };
}