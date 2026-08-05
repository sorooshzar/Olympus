import React from "react";
import { X, Inbox, Check, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function InboxSheet({ currentUser, requests, onClose, onRefresh }) {
  const pending = requests.filter(
    r => r.recipient_email === currentUser.email && r.status === "pending"
  );

  const handleAccept = async (req) => {
    await base44.functions.invoke("friendsApi", { action: "accept", recordId: req.id });
    onRefresh();
  };

  const handleDecline = async (req) => {
    await base44.functions.invoke("friendsApi", { action: "reject", recordId: req.id });
    onRefresh();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card rounded-t-3xl border-t border-border/40 p-6 space-y-4"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-9 h-1 bg-muted-foreground/25 rounded-full mx-auto -mt-1 mb-1" />
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">Friend Requests</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/80">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {pending.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2 text-center">
            <Inbox className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pending.map(req => (
              <div key={req.id} className="flex items-center gap-3 bg-secondary rounded-2xl px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {(req.requester_username || "?")[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{req.requester_username ? `@${req.requester_username}` : "Unknown user"}</p>
                  <p className="text-xs text-muted-foreground">Wants to be friends</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleDecline(req)}
                    className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center"
                  >
                    <XIcon className="w-3.5 h-3.5 text-destructive" />
                  </button>
                  <button
                    onClick={() => handleAccept(req)}
                    className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
                  >
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}