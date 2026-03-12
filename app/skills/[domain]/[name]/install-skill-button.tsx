"use client";

import { useState } from "react";
import { TOOL_IDS, TOOL_LABELS, type ToolId } from "@/lib/types";
import { installSkillAction, uninstallSkillAction } from "@/lib/actions/skills";
import { Download, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InstallSkillButtonProps {
  domain: string;
  skillName: string;
}

export default function InstallSkillButton({
  domain,
  skillName,
}: InstallSkillButtonProps) {
  const [selectedTools, setSelectedTools] = useState<ToolId[]>([]);
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);

  function toggleTool(toolId: ToolId) {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((t) => t !== toolId)
        : [...prev, toolId]
    );
  }

  async function handleInstall() {
    if (selectedTools.length === 0) {
      toast.error("Select at least one tool");
      return;
    }
    setInstalling(true);
    try {
      const result = await installSkillAction(domain, skillName, selectedTools);
      if (result.success) {
        toast.success(`Installed to ${result.installed.map((t) => TOOL_LABELS[t as ToolId]).join(", ")}`);
      }
      if (result.errors.length > 0) {
        toast.warning("Some targets had errors", {
          description: result.errors.join("\n"),
        });
      }
    } catch (err) {
      toast.error("Install failed", { description: String(err) });
    }
    setInstalling(false);
  }

  async function handleUninstall() {
    if (selectedTools.length === 0) {
      toast.error("Select at least one tool");
      return;
    }
    setUninstalling(true);
    try {
      const result = await uninstallSkillAction(skillName, selectedTools);
      if (result.success) {
        toast.success(`Removed from ${result.removed.length} target(s)`);
      }
      if (result.errors.length > 0) {
        toast.warning("Some removals had errors", {
          description: result.errors.join("\n"),
        });
      }
    } catch (err) {
      toast.error("Uninstall failed", { description: String(err) });
    }
    setUninstalling(false);
  }

  const installableTools = TOOL_IDS.filter((id) => id !== "agents-md");

  return (
    <div className="border rounded-xl p-5 space-y-4">
      <h3 className="font-semibold">Install to Tools</h3>
      <div className="flex flex-wrap gap-2">
        {installableTools.map((toolId) => (
          <button
            key={toolId}
            onClick={() => toggleTool(toolId)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              selectedTools.includes(toolId)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {selectedTools.includes(toolId) && (
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            )}
            {TOOL_LABELS[toolId]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          disabled={installing || selectedTools.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {installing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {installing ? "Installing..." : "Install"}
        </button>
        <button
          onClick={handleUninstall}
          disabled={uninstalling || selectedTools.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive disabled:opacity-50 transition-colors"
        >
          {uninstalling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {uninstalling ? "Removing..." : "Uninstall"}
        </button>
      </div>
    </div>
  );
}
