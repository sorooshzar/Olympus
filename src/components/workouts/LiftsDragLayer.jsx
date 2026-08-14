import React from "react";
import { createPortal } from "react-dom";
import { FolderOpen } from "lucide-react";
import { WorkoutIcon } from "./IconPickerModal";

// Fixed-position drop indicator + floating ghost, rendered via portal.
export default function LiftsDragLayer({ ghost, indicator }) {
  return createPortal(
    <>
      {indicator && (
        <div
          style={{
            position: "fixed",
            top: indicator.y - 2,
            left: indicator.left,
            width: indicator.width,
            height: 3,
            background: "hsl(var(--primary))",
            borderRadius: 3,
            zIndex: 60,
            boxShadow: "0 0 10px hsl(var(--primary) / 0.7)",
            pointerEvents: "none",
          }}
        />
      )}
      {ghost && (
        <div
          style={{
            position: "fixed",
            top: ghost.y,
            left: ghost.left,
            width: ghost.width,
            zIndex: 60,
            pointerEvents: "none",
          }}
        >
          <div
            className="bg-card border border-border rounded-xl"
            style={{
              opacity: 0.92,
              transform: "scale(1.01)",
              boxShadow: "0 16px 34px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}
          >
            {ghost.descriptor.kind === "folder" ? (
              <div className="flex items-center gap-3 p-3">
                <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="flex-1 text-sm font-semibold truncate">{ghost.descriptor.name}</span>
                <span className="text-xs text-muted-foreground">{ghost.descriptor.sub}</span>
              </div>
            ) : (
              <div
                className="flex items-center py-2.5 px-3 gap-2 bg-secondary/50"
                style={ghost.descriptor.accent ? { borderLeft: `3px solid ${ghost.descriptor.accent}` } : {}}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: ghost.descriptor.accent ? ghost.descriptor.accent + "22" : "hsl(var(--primary)/0.1)" }}
                >
                  <WorkoutIcon
                    name={ghost.descriptor.iconName}
                    className="w-4 h-4"
                    style={{ color: ghost.descriptor.accent ? ghost.descriptor.accent + "cc" : "hsl(var(--muted-foreground) / 0.45)" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ghost.descriptor.name}</p>
                  <p className="text-xs text-muted-foreground">{ghost.descriptor.sub}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}