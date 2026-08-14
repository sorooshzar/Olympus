import React from "react";
import { X } from "lucide-react";

// Shared shell for the Lifts "Customize" popups (icon + colour pickers).
// Provides the backdrop, a centered rounded card, a header title, and an X
// close button so users can dismiss without making a change.
export default function PickerPopupShell({ title = "Customize", onClose, children, maxWidth = "max-w-xs" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative bg-card border border-border rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary active:scale-90 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}