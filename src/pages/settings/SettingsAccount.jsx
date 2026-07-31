import React from "react";
import { base44 } from "@/api/base44Client";
import { LogOut, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSettingsState } from "@/components/settings/useSettingsState";
import { SettingsPageShell, SettingsCard, Divider } from "@/components/settings/settingsUi";

export default function SettingsAccount() {
  const { user, showDeleteConfirm, setShowDeleteConfirm } = useSettingsState();

  return (
    <SettingsPageShell title="Account">
      <SettingsCard divided={false}>
        {user && (
          <div className="px-4 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{user.full_name?.[0]?.toUpperCase() || "?"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <div className="divide-y divide-border/40">
          <button onClick={() => base44.auth.logout()}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-secondary/50 transition-colors text-left">
            <LogOut className="w-4 h-4 text-muted-foreground" />
            <span>Sign Out</span>
          </button>
          <button onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-destructive hover:bg-destructive/5 transition-colors">
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </SettingsCard>

      <p className="text-[11px] text-muted-foreground text-center mt-4 px-4">Deleting your account is permanent and cannot be undone.</p>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowDeleteConfirm(false)}>
            <motion.div className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
              initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
              onClick={e => e.stopPropagation()}>
              <div>
                <h3 className="font-bold text-base">Delete Account?</h3>
                <p className="text-sm text-muted-foreground mt-1">This will permanently delete your account and all data. This cannot be undone.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-secondary text-sm font-semibold">Cancel</button>
                <button onClick={() => { setShowDeleteConfirm(false); base44.auth.deleteAccount?.().catch(() => {}); }}
                  className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SettingsPageShell>
  );
}