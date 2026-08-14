import { useEffect, useRef } from "react";

/**
 * Continuous, instant barcode detection over a live camera stream.
 * - Prefers the native BarcodeDetector API (Chrome Android) via rAF loop.
 * - Falls back to @zxing/browser decoding individual frames from an offscreen
 *   canvas (NOT decodeFromStream — its controls.stop() also stops the camera
 *   stream, which would break the shared camera when switching scan modes).
 *
 * CRITICAL: this hook NEVER stops the MediaStream. The stream is owned by the
 * parent's CameraManager; we only read frames from the already-playing <video>.
 * Cleanup only cancels the decode loop. This keeps the camera alive across mode
 * switches (barcode ↔ nutrition label).
 *
 * @param {Object} opts
 * @param {Object} opts.videoRef    - ref to the <video> playing the stream
 * @param {MediaStream|null} opts.stream - the active camera stream (for gating only)
 * @param {boolean} opts.active     - detection only runs while true
 * @param {(barcode: string) => void} opts.onDetected
 */
export function useBarcodeDetector({ videoRef, stream, active, onDetected }) {
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    if (!active || !videoRef.current || !stream) return;
    const video = videoRef.current;
    let cancelled = false;
    let raf = null;
    let zxTimer = null;

    const cleanup = () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (zxTimer) clearTimeout(zxTimer);
    };

    const emit = (raw) => {
      if (cancelled || firedRef.current) return;
      const v = String(raw).replace(/\D/g, "");
      if (v.length >= 6) {
        firedRef.current = true;
        onDetectedRef.current(v);
      }
    };

    const startNative = async () => {
      try {
        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "codabar"],
        });
        const loop = async () => {
          if (cancelled) return;
          try {
            const codes = await detector.detect(video);
            if (codes && codes.length && codes[0].rawValue) emit(codes[0].rawValue);
          } catch (_) {}
          if (cancelled) return;
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (_) {
        startZxing();
      }
    };

    const startZxing = async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const loop = async () => {
          if (cancelled) return;
          try {
            if (video.videoWidth > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const result = await reader.decodeFromCanvas(canvas);
              if (result && result.getText()) emit(result.getText());
            }
          } catch (_) {
            // no code in this frame — keep scanning
          }
          if (cancelled) return;
          zxTimer = setTimeout(loop, 180);
        };
        zxTimer = setTimeout(loop, 180);
      } catch (_) {
        // detection unavailable — user can still switch to label mode
      }
    };

    if ("BarcodeDetector" in window) startNative();
    else startZxing();

    return cleanup;
  }, [active, stream, videoRef]);
}