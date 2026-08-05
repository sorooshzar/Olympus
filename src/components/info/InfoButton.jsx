import React, { useState } from "react";
import { Info } from "lucide-react";
import InfoModal from "./InfoModal";

/**
 * Persistent "(i)" info button that opens a Learn More popup.
 * Pass `label` to render as a text link ("ⓘ What are Variations?"),
 * otherwise renders a small circular icon button.
 */
export default function InfoButton({ title, body, label, className = "" }) {
  const [open, setOpen] = useState(false);

  if (label) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${className}`}
        >
          <Info className="w-3.5 h-3.5" />
          {label}
        </button>
        <InfoModal open={open} onClose={() => setOpen(false)} title={title} body={body} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ${className}`}
        aria-label={`Learn more: ${title}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <InfoModal open={open} onClose={() => setOpen(false)} title={title} body={body} />
    </>
  );
}