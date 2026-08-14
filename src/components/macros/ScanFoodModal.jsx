import React, { useState, useRef, useEffect } from "react";
import { X, AlertCircle, Loader2, ScanLine, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { CameraManager } from "@/components/scanner/CameraManager";
import { useBarcodeDetector } from "@/components/scanner/useBarcodeDetector";
import { base44 } from "@/api/base44Client";

/**
 * Two-mode food scanner.
 *  - Mode 1 "Scan Barcode": instant auto-detect (native BarcodeDetector / ZXing),
 *    then lookupBarcodeProduct backend function. Found → opens Create Food pre-filled.
 *    Not found → card with "Try scanning the nutrition label instead".
 *  - Mode 2 "Scan Nutrition Label": auto-captures the frame on a timer, runs the
 *    parseNutritionLabel backend function, opens Create Food pre-filled (name/brand blank).
 *
 * Props: onClose(), onResult(prefillData) → opens the Create Food form with prefill.
 */
export default function ScanFoodModal({ onClose, onResult }) {
  const [mode, setMode] = useState("barcode"); // barcode | label
  const [status, setStatus] = useState("init"); // init | scanning | processing | notfound | labelerror
  const [stream, setStream] = useState(null);
  const [flash, setFlash] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(new CameraManager());
  const barcodeLockRef = useRef(false);
  const labelActiveRef = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  // Camera lifecycle
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await cameraRef.current.start(videoRef.current, "environment");
        if (cancelled) return;
        setStream(cameraRef.current.stream);
        setStatus("scanning");
      } catch (e) {
        setStatus("error");
      }
    };
    const t = setTimeout(init, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
      barcodeLockRef.current = false;
      labelActiveRef.current = false;
      cameraRef.current.stop();
    };
  }, []);

  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 260);
  };

  // ---- Barcode mode: instant detection ----
  useBarcodeDetector({
    videoRef,
    stream,
    active: mode === "barcode" && status === "scanning",
    onDetected: (barcode) => handleBarcodeFound(barcode),
  });

  const handleBarcodeFound = async (barcode) => {
    if (barcodeLockRef.current) return;
    barcodeLockRef.current = true;
    setStatus("processing");
    triggerFlash();
    try {
      const res = await base44.functions.invoke("lookupBarcodeProduct", { barcode });
      const data = res.data;
      if (data && data.found) {
        onResult && onResult(data);
        onClose();
      } else {
        setStatus("notfound");
        barcodeLockRef.current = false; // allow retry / mode switch
      }
    } catch (e) {
      setStatus("notfound");
      barcodeLockRef.current = false;
    }
  };

  // ---- Label mode: auto-capture loop (no manual button) ----
  useEffect(() => {
    if (mode !== "label") return;
    let timer;
    labelActiveRef.current = true;

    const capture = async () => {
      if (!labelActiveRef.current) return;
      setStatus("processing");
      try {
        const dataUrl = cameraRef.current.captureFrame(canvasRef.current);
        if (!dataUrl) throw new Error("capture failed");
        const file = dataURLtoFile(dataUrl);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const res = await base44.functions.invoke("parseNutritionLabel", { file_url });
        const data = res.data;
        if (data && data.found !== false && data.calories_per_100g != null) {
          triggerFlash();
          labelActiveRef.current = false;
          onResult && onResult(data);
          onClose();
          return;
        }
        throw new Error("no nutrition data");
      } catch (e) {
        if (!labelActiveRef.current) return;
        setStatus("labelerror");
        timer = setTimeout(() => {
          if (labelActiveRef.current) setStatus("scanning");
        }, 1600);
      }
    };

    // small delay so the user can frame the label before first capture
    timer = setTimeout(capture, 1500);
    const interval = setInterval(() => {
      if (labelActiveRef.current && statusRef.current === "scanning") capture();
    }, 4000);

    return () => {
      labelActiveRef.current = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [mode]);

  // Safety: ensure the camera stream is alive before (re)starting detection.
  // If tracks ended or the stream was lost, re-init the camera from scratch so
  // the camera never stays broken after a mode switch.
  const ensureCamera = async () => {
    const cm = cameraRef.current;
    const s = cm.stream;
    const alive = s && s.getTracks().some((t) => t.readyState === "live" && !t.ended);
    if (alive && videoRef.current && videoRef.current.srcObject) return;
    try {
      await cm.start(videoRef.current, "environment");
      setStream(cm.stream);
    } catch (e) {
      setStatus("error");
    }
  };

  const switchMode = async (m) => {
    if (m === mode) return;
    barcodeLockRef.current = false;
    labelActiveRef.current = false;
    setStatus("scanning");
    await ensureCamera();
    setMode(m);
  };

  const isBarcode = mode === "barcode";
  const showGuide = status === "scanning" || status === "processing";

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      {/* Shutter flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 z-20 bg-gradient-to-b from-black/70 to-transparent">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ScanLine className="w-4 h-4" />
          {isBarcode ? "Scan Barcode" : "Scan Nutrition Label"}
        </h2>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 backdrop-blur active:bg-white/25"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Camera + overlay */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />

        {/* Scanning guide */}
        {showGuide && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="relative"
              style={{ width: "82%", height: isBarcode ? "32%" : "62%" }}
            >
              <div className={`absolute inset-0 rounded-xl border-2 transition-colors ${status === "processing" ? "border-green-400" : "border-white/90"}`} />
              {/* corner markers */}
              <div className="absolute -top-px -left-px w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute -top-px -right-px w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute -bottom-px -left-px w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute -bottom-px -right-px w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />
              {/* scanning line */}
              {status === "scanning" && (
                <motion.div
                  className="absolute left-1 right-1 h-0.5 bg-primary shadow-[0_0_8px_2px_rgba(2,132,255,0.7)]"
                  initial={{ top: "10%" }}
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
          </div>
        )}

        {/* Processing spinner */}
        {status === "processing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="w-9 h-9 text-primary animate-spin" />
          </div>
        )}

        {/* Not found (barcode) */}
        {isBarcode && status === "notfound" && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-bold">Product not found</p>
                  <p className="text-xs text-muted-foreground">This barcode isn't in the Open Food Facts database yet.</p>
                </div>
              </div>
              <Button
                onClick={() => switchMode("label")}
                className="w-full h-11 rounded-xl font-semibold text-sm gap-2"
              >
                <StickyNote className="w-4 h-4" />
                Try scanning the nutrition label instead
              </Button>
              <Button
                variant="outline"
                onClick={() => { barcodeLockRef.current = false; setStatus("scanning"); }}
                className="w-full h-10 rounded-xl font-semibold text-sm"
              >
                Scan another barcode
              </Button>
            </motion.div>
          </div>
        )}

        {/* Label error (brief) */}
        {!isBarcode && status === "labelerror" && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center px-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/80 backdrop-blur px-4 py-3 rounded-xl flex items-center gap-2.5 max-w-xs"
            >
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs text-white font-medium">Couldn't read the label — try again</p>
            </motion.div>
          </div>
        )}

        {/* Camera init / error */}
        {(status === "init" || status === "error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            {status === "error" ? (
              <>
                <AlertCircle className="w-9 h-9 text-destructive" />
                <p className="text-sm text-white/80 text-center">Camera access denied. Please allow camera permissions and retry.</p>
                <Button variant="outline" onClick={onClose} className="rounded-xl">Close</Button>
              </>
            ) : (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs text-white/60">Opening camera…</p>
              </>
            )}
          </div>
        )}

        {/* Hint */}
        {showGuide && (
          <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-white/60 px-6">
            {isBarcode
              ? "Point at a barcode — detection is automatic"
              : "Frame the nutrition panel — capture is automatic"}
          </p>
        )}
      </div>

      {/* Mode toggle */}
      <div className="px-4 py-4 pb-6 bg-black">
        <div className="flex bg-white/10 rounded-full p-1 max-w-xs mx-auto">
          {[
            { key: "barcode", label: "Scan Barcode" },
            { key: "label", label: "Scan Nutrition Label" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => switchMode(m.key)}
              className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${
                mode === m.key ? "bg-primary text-primary-foreground shadow" : "text-white/70"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function dataURLtoFile(dataUrl) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], "scan.jpg", { type: mime });
}