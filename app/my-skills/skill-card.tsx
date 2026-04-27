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
    dotClass: "bg-green-500",
    textClass: "text-green-600",
    bgClass: "bg-green-50 border-green-200",
  },
  outdated: {
    label: "Outdated",
    icon: CircleAlert,
    dotClass: "bg-amber-500",
    textClass: "text-amber-600",
    bgClass: "bg-amber-50 border-amber-200",
  },
  unknown: {
    label: "Untracked",
    icon: CircleHelp,
    dotClass: "bg-gray-400",
    textClass: "text-muted-foreground",
    bgClass: "bg-muted border-border",
  },
} as const;

export function SkillCard({ skill, toolId, gradientClass, onAction }: SkillCardProps) {
  const [updating, setUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);

  const config = STATUS_CONFIG[skill.status];
  const StatusIcon = config.icon;

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
    <div className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:border-border/80">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{skill.name}</h3>
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
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                {skill.domain.replace(/-/g, " ")}
              </p>
            )}
            {skill.source === "cross-agent" && skill.sharedFrom && (
              <div className="flex items-center gap-1 mt-1">
                <Share2 className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                  Shared from {skill.sharedFrom}
                </span>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgClass}`}
          >
            <span className="relative flex h-2 w-2">
              {skill.status === "outdated" && (
                <span
                  className={`absolute inline-flex h-full w-full rounded-full ${config.dotClass} opacity-75 animate-ping`}
                />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${config.dotClass}`}
              />
            </span>
            <span className={config.textClass}>{config.label}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          {skill.source === "cross-agent" ? (
            <span className="text-[11px] text-muted-foreground italic">
              Managed by {skill.sharedFrom ?? "another tool"}
            </span>
          ) : (
            <>
              {skill.status === "outdated" && skill.domain && (
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                    transition-colors"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  border text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/5
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                  active:bg-destructive/10 transition-colors ml-auto"
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
