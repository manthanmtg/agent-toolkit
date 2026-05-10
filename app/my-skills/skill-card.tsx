"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Trash2,
  ExternalLink,
  Loader2,
  CircleCheck,
  CircleAlert,
  CircleHelp,
  Share2,
  Box,
} from "lucide-react";
import { toast } from "sonner";
import { TOOL_LABELS, type ToolId } from "@/lib/types";
import type { DeployedSkill } from "@/lib/actions/my-skills";
import {
  updateDeployedSkillAction,
  removeSkillFromToolAction,
} from "@/lib/actions/my-skills";

interface SkillCardProps {
  skill: DeployedSkill;
  toolId: ToolId;
  gradientClass: string;
  onAction: () => void;
}

const STATUS_CONFIG = {
  "up-to-date": {
    label: "Current",
    icon: CircleCheck,
    dotClass: "bg-success",
    textClass: "text-success",
    bgClass: "bg-success/10 border-success/25",
  },
  outdated: {
    label: "Outdated",
    icon: CircleAlert,
    dotClass: "bg-warning",
    textClass: "text-warning",
    bgClass: "bg-warning/10 border-warning/30",
  },
  unknown: {
    label: "Untracked",
    icon: CircleHelp,
    dotClass: "bg-muted-foreground/70",
    textClass: "text-muted-foreground",
    bgClass: "bg-muted border-border",
  },
} as const;

export function SkillCard({ skill, toolId, gradientClass, onAction }: SkillCardProps) {
  const [updating, setUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);

  const config = STATUS_CONFIG[skill.status];
  const Icon = config.icon;

  async function handleUpdate() {
    if (!skill.domain) return;
    setUpdating(true);
    try {
      const result = await updateDeployedSkillAction(skill.domain, skill.name, toolId);
      if (result.success) {
        toast.success(`Updated ${skill.name} on ${TOOL_LABELS[toolId]}`);
        onAction();
      } else {
        toast.error("Update failed", { description: result.error });
      }
    } catch (err) {
      toast.error("Update failed", { description: String(err) });
    } finally {
      setUpdating(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const result = await removeSkillFromToolAction(skill.name, toolId);
      if (result.success) {
        toast.success(`Removed ${skill.name} from ${TOOL_LABELS[toolId]}`);
        onAction();
      } else {
        toast.error("Removal failed", { description: result.error });
      }
    } catch (err) {
      toast.error("Removal failed", { description: String(err) });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-border/80 hover:scale-[1.01] focus-within:shadow-lg focus-within:border-primary/40 focus-within:scale-[1.01]">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-0 group-hover:opacity-100 group-focus-within:opacity-50 transition-opacity duration-500`} />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Box className="w-4 h-4 text-primary/70" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate tracking-tight">{skill.name}</h3>
                  {skill.domain && (
                    <Link
                      href={`/skills/${skill.domain}/${skill.name}`}
                      className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors shrink-0 rounded-sm"
                      aria-label={`View ${skill.name} in registry`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
                {skill.domain && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 capitalize truncate opacity-80">
                    {skill.domain.replace(/-/g, " ")}
                  </p>
                )}
              </div>
            </div>
            {skill.source === "cross-agent" && skill.sharedFrom && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-2 py-0.5 rounded-md bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100/50 dark:border-blue-800/50">
                <Share2 className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tight">
                  From {skill.sharedFrom}
                </span>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${config.bgClass}`}
          >
            <Icon className="w-3 h-3" />
            <span className={config.textClass}>{config.label}</span>
            {skill.status === "outdated" && (
              <span className="relative flex h-1.5 w-1.5 ml-0.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-warning opacity-75 animate-pulse" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-5 pt-3 border-t border-border/40">
          {skill.source === "cross-agent" ? (
            <span className="text-[11px] text-muted-foreground italic opacity-70">
              Managed by {skill.sharedFrom ?? "another tool"}
            </span>
          ) : (
            <>
              {skill.status === "outdated" && skill.domain && (
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide
                    bg-warning text-warning-foreground hover:opacity-90 active:scale-95
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                    transition-all"
                >
                  {updating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  {updating ? "Updating..." : "Update"}
                </button>
              )}

              <button
                onClick={handleRemove}
                disabled={removing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide
                  border text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/5
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                  active:scale-95 transition-all ml-auto"
              >
                {removing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                {removing ? "Removing..." : "Remove"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
