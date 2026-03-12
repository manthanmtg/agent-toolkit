"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { syncAction } from "@/lib/actions/sync";
import { toast } from "sonner";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await syncAction("default");
      if (result.buildResult.errors.length > 0) {
        toast.error("Sync completed with errors", {
          description: result.buildResult.errors.join(", "),
        });
      } else {
        toast.success("Sync complete", {
          description: `Built ${result.buildResult.totalSkills} skills → ${result.buildResult.totalFiles} files. Linked ${result.linkResult.created} targets.`,
        });
      }
    } catch (err) {
      toast.error("Sync failed", {
        description: String(err),
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
    >
      <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Syncing..." : "Sync"}
    </button>
  );
}
