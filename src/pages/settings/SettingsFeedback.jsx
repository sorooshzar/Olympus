import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsPageShell } from "@/components/settings/settingsUi";
import InfoButton from "@/components/info/InfoButton";
import { Bug, Lightbulb, Sparkles, MoreHorizontal, Send, CheckCircle2 } from "lucide-react";

const FEEDBACK_TYPES = [
  { id: "Bug Report", icon: Bug, color: "#ef4444" },
  { id: "Feature Request", icon: Lightbulb, color: "#3b82f6" },
  { id: "Improvement Idea", icon: Sparkles, color: "#10b981" },
  { id: "Other", icon: MoreHorizontal, color: "#64748b" },
];

export default function SettingsFeedback() {
  const navigate = useNavigate();
  const [type, setType] = useState("Bug Report");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const textareaRef = useRef(null);

  // Auto-expand textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(150, ta.scrollHeight)}px`;
  }, [message]);

  const canSubmit = subject.trim() && message.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const user = await base44.auth.me().catch(() => null);
      await base44.entities.Feedback.create({
        type,
        subject: subject.trim(),
        message: message.trim(),
        status: "New",
        app_version: null,
        device_info: navigator.userAgent || "Unknown",
        user_email: user?.email || null,
      });
      setSuccess(true);
      // Clear form
      setSubject("");
      setMessage("");
      // Navigate back after showing confirmation
      setTimeout(() => navigate(-1), 1400);
    } catch (e) {
      setError(e?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <SettingsPageShell
      title="Send Feedback"
      headerRight={
        <InfoButton
          title="About Feedback"
          body="Use this form to report any bugs you find, request new features you'd like to see, or share ideas for improving Olympus. All feedback is reviewed. Include as much detail as possible — what happened, what you expected, and steps to reproduce if it's a bug."
        />
      }
    >
      {success ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold">Thank you!</p>
          <p className="text-xs text-muted-foreground mt-1">Your feedback has been sent.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Type Selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {FEEDBACK_TYPES.map(({ id, icon: Icon, color }) => {
                const selected = type === id;
                return (
                  <button
                    key={id}
                    onClick={() => setType(id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      selected ? "bg-card border-2 shadow-sm" : "bg-secondary/60 border-2 border-transparent text-muted-foreground"
                    }`}
                    style={selected ? { borderColor: color, color } : {}}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary"
              className="bg-secondary border-0"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message</label>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the bug, your idea, or your suggestion in detail..."
              className="w-full bg-secondary border-0 rounded-lg px-3 py-2.5 text-sm font-medium resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ minHeight: 150 }}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-11 rounded-xl font-semibold gap-2"
          >
            {submitting ? "Sending..." : (<><Send className="w-4 h-4" /> Send Feedback</>)}
          </Button>
        </div>
      )}
    </SettingsPageShell>
  );
}