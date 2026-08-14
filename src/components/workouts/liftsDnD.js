import { useState, useRef, useCallback, useEffect } from "react";

const HOLD_MS = 400;
const MOVE_THRESHOLD = 10; // px of movement before HOLD_MS cancels the hold (treat as scroll/tap)
const EDGE_ZONE = 80; // px from top/bottom that triggers auto-scroll
const EDGE_MAX_SPEED = 14; // px per frame at the very edge

// Long-press drag-and-drop for the Lifts page.
// SCROLL SAFETY: bars do NOT set touch-action:none. Before the 400ms hold fires,
// no touch events are prevented -> the browser scrolls normally. Only after the
// hold fires (finger still for 400ms) does drag mode engage and a non-passive
// capture touchmove listener begin calling preventDefault to stop scrolling.
// RELEASE SAFETY: pointerup, pointercancel, touchend AND touchcancel all end the
// drag; clear() is idempotent so duplicate events are harmless.
export function useLiftsDrag({ containerRef, onDrop, isOpen, onDragStart }) {
  const [ghost, setGhost] = useState(null); // { descriptor, y, left, width }
  const [indicator, setIndicator] = useState(null); // { y, left, width }

  const onDropRef = useRef(onDrop); onDropRef.current = onDrop;
  const onDragStartRef = useRef(onDragStart); onDragStartRef.current = onDragStart;
  const isOpenRef = useRef(isOpen); isOpenRef.current = isOpen;

  const s = useRef({
    active: false, pointerId: null, startX: 0, startY: 0, timer: null,
    descriptor: null, offsetY: 0, lastY: 0, raf: 0, scrollRaf: 0, el: null,
    pre: null, bound: null,
  });
  const targetRef = useRef(null);
  const onUpRef = useRef(null);

  const computeTarget = useCallback((clientY) => {
    const st = s.current;
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();

    const topEls = Array.from(container.querySelectorAll('[data-lift="top"]'));
    if (!topEls.length) { targetRef.current = null; setIndicator(null); return; }

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
    for (let k = 0; k <= blocks.length; k++) {
      const y = k === 0 ? blocks[0].top : blocks[k - 1].bottom;
      gaps.push({ kind: "top", index: k, y });
    }
    // interior gaps of OPEN folders, only when dragging a workout
    if (st.descriptor && st.descriptor.kind === "workout") {
      for (const b of blocks) {
        if (b.kind !== "folder") continue;
        if (!isOpenRef.current(b.id)) continue;
        const childEls = Array.from(container.querySelectorAll(`[data-lift-folder="${b.id}"]`));
        if (childEls.length) {
          for (let j = 0; j <= childEls.length; j++) {
            const y = j === 0 ? childEls[0].getBoundingClientRect().top : childEls[j - 1].getBoundingClientRect().bottom;
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
      window.removeEventListener("pointermove", st.bound.move);
      if (onUpRef.current) {
        window.removeEventListener("pointerup", onUpRef.current);
        window.removeEventListener("pointercancel", onUpRef.current);
      }
      window.removeEventListener("touchmove", st.bound.touchMove, { capture: true });
      window.removeEventListener("touchend", st.bound.touchEnd, { capture: true });
      window.removeEventListener("touchcancel", st.bound.touchEnd, { capture: true });
      st.bound = null;
    }
    document.body.style.userSelect = "";
    st.active = false;
    st.descriptor = null;
    st.el = null;
    st.pointerId = null;
    targetRef.current = null;
    setGhost(null);
    setIndicator(null);
  }, []);

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

  const onUp = useCallback((e) => {
    const st = s.current;
    if (!st.active) return;
    if (e && e.pointerId !== undefined && e.pointerId !== st.pointerId) return;
    const target = targetRef.current;
    const descriptor = st.descriptor;
    // swallow the synthetic click that follows a hold+drag so taps don't fire
    const kill = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener("click", kill, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", kill, { capture: true }), 500);
    clear();
    if (target && descriptor) onDropRef.current({ source: descriptor, target });
  }, [clear]);
  onUpRef.current = onUp;

  // Safety nets: prevent page scroll during an active drag, and force-end on any touch end/cancel
  const onTouchMove = useCallback((e) => {
    if (s.current.active) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, []);
  const onTouchEnd = useCallback(() => {
    if (s.current.active && onUpRef.current) onUpRef.current();
  }, []);

  const beginDrag = useCallback((e) => {
    const st = s.current;
    st.timer = null;
    st.active = true;
    document.body.style.userSelect = "none";
    if (st.pre) {
      window.removeEventListener("pointermove", st.pre.move);
      window.removeEventListener("pointerup", st.pre.up);
      window.removeEventListener("pointercancel", st.pre.up);
      st.pre = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    window.addEventListener("touchend", onTouchEnd, { capture: true });
    window.addEventListener("touchcancel", onTouchEnd, { capture: true });
    st.bound = { move: onMove, touchMove: onTouchMove, touchEnd: onTouchEnd };
    const cRect = containerRef.current.getBoundingClientRect();
    // offsetY = where on the bar the finger pressed; ghost top = clientY - offsetY keeps the
    // finger at that same spot on the bar as it moves (bar rides under the finger, not above it)
    setGhost({ descriptor: st.descriptor, y: e.clientY - st.offsetY, left: cRect.left, width: cRect.width });
    computeTarget(e.clientY);
    edgeScroll();
    if (onDragStartRef.current) onDragStartRef.current(st.descriptor.kind, st.descriptor.id);
  }, [onMove, onUp, onTouchMove, onTouchEnd, computeTarget, edgeScroll, containerRef]);

  const bindBar = useCallback((descriptor) => ({
    onPointerDown: (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const st = s.current;
      // A workout inside a folder bubbles its pointerdown to the folder's handler too.
      // Guard so only the innermost bar starts a hold (prevents orphaned timers that
      // fired regardless of movement — the "scroll picks up a folder" bug).
      if (st.active || st.pre || st.timer) return;
      st.pointerId = e.pointerId;
      st.startX = e.clientX; st.startY = e.clientY;
      st.descriptor = descriptor;
      st.lastY = e.clientY;
      st.el = e.currentTarget;
      const r = e.currentTarget.getBoundingClientRect();
      st.offsetY = e.clientY - r.top;

      const preMove = (ev) => {
        if (ev.pointerId !== st.pointerId) return;
        if (Math.hypot(ev.clientX - st.startX, ev.clientY - st.startY) > MOVE_THRESHOLD) cancelPre();
      };
      const preUp = (ev) => {
        if (ev && ev.pointerId !== undefined && ev.pointerId !== st.pointerId) return;
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
      st.timer = setTimeout(() => beginDrag(e), HOLD_MS);
    },
  }), [beginDrag]);

  useEffect(() => () => clear(), [clear]);

  const dragInfo = ghost ? { id: ghost.descriptor.id, kind: ghost.descriptor.kind } : null;
  return { bindBar, ghost, indicator, dragInfo };
}