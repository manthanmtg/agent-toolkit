"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TOOL_LABELS, type ToolId } from "@/lib/types";
import type { DeployedSkillsResult, ToolDeployment } from "@/lib/actions/my-skills";
import { runInstall } from "@/lib/actions/install";
import {
  Sparkles,
  MousePointerClick,
  Wind,
  Terminal,
  Bot,
  Info,
  Package,
  CheckCircle2,
  AlertTriangle,
  Layers,
  RefreshCw,
  Loader2,
  FolderOpen,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { SkillCard } from "./skill-card";
import { AddSkillDialog } from "./add-skill-dialog";

const TOOL_ICONS: Partial<Record<ToolId, React.ReactNode>> = {
  "claude-code": <Sparkles className="w-4 h-4" />,
  cursor: <MousePointerClick className="w-4 h-4" />,
  windsurf: <Wind className="w-4 h-4" />,
  opencode: <Terminal className="w-4 h-4" />,
  codex: <Bot className="w-4 h-4" />,
};

const TOOL_COLORS: Partial<Record<ToolId, string>> = {
  "claude-code": "from-orange-500/20 to-orange-600/5",
  cursor: "from-blue-500/20 to-blue-600/5",
  windsurf: "from-teal-500/20 to-teal-600/5",
  opencode: "from-violet-500/20 to-violet-600/5",
  codex: "from-pink-500/20 to-pink-600/5",
};

const TOOL_ACCENT: Partial<Record<ToolId, string>> = {
  "claude-code": "bg-orange-500",
  cursor: "bg-blue-500",
  windsurf: "bg-teal-500",
  opencode: "bg-violet-500",
  codex: "bg-pink-500",
};

const MODEL_LABELS = {
  "per-skill": "Per-skill files",
  bundled: "Single bundled file",
  "project-only": "Project-level only",
} as const;

interface ToolTabsProps {
  data: DeployedSkillsResult;
}

export function ToolTabs({ data }: ToolTabsProps) {
  const router = useRouter();
  const detectedTools = useMemo(
    () => data.tools.filter((t) => t.detected),
    [data.tools]
  );
  const [activeTab, setActiveTab] = useState<ToolId>(
    detectedTools[0]?.toolId ?? "claude-code"
  );

  const toolStats = useMemo(() => {
    const stats = new Map<
      ToolId,
      { totalSkills: number; outdatedCount: number }
    >();

    for (const tool of detectedTools) {
      let outdatedCount = 0;
      for (const skill of tool.skills) {
        if (skill.status === "outdated") {
          outdatedCount++;
        }
      }

      stats.set(tool.toolId, {
        totalSkills: tool.skills.length,
        outdatedCount,
      });
    }
    return stats;
  }, [detectedTools]);

  const activeTool = useMemo(
    () => detectedTools.find((t) => t.toolId === activeTab) ?? null,
    [detectedTools, activeTab]
  );

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  if (detectedTools.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No AI tools detected</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Install an AI coding tool like Claude Code, Cursor, or Windsurf to see
          your deployed skills here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="relative">
        <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border">
          {detectedTools.map((tool) => {
            const isActive = activeTab === tool.toolId;
            const stats = toolStats.get(tool.toolId);
            const outdatedCount = stats?.outdatedCount ?? 0;
            const totalSkills = stats?.totalSkills ?? tool.skills.length;

            return (
              <button
                key={tool.toolId}
                onClick={() => setActiveTab(tool.toolId)}
                className={`
                  relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200 flex-1 justify-center
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                  focus-visible:ring-offset-2 focus-visible:z-10
                  ${
                    isActive
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <div
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${TOOL_ACCENT[tool.toolId] ?? "bg-primary"}`}
                  />
                )}
                {TOOL_ICONS[tool.toolId]}
                <span className="hidden sm:inline">
                  {TOOL_LABELS[tool.toolId]}
                </span>
                {totalSkills > 0 && (
                  <span
                    className={`
                      min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold
                      inline-flex items-center justify-center
                      ${
                        outdatedCount > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-secondary text-secondary-foreground"
                      }
                    `}
                  >
                    {tool.skills.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tool Content */}
      {activeTool && (
        <ToolContent
          tool={activeTool}
          registrySkills={data.registrySkills}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}

const ToolContent = memo(function ToolContent({
  tool,
  registrySkills,
  onRefresh,
}: {
  tool: ToolDeployment;
  registrySkills: DeployedSkillsResult["registrySkills"];
  onRefresh: () => void;
}) {
  const [syncing, setSyncing] = useState(false);

  const {
    nativeSkills,
    crossAgentSkills,
    outdatedCount,
    upToDateCount,
    unknownCount,
    deployedNames,
  } = useMemo(() => {
    const nativeSkills = [];
    const crossAgentSkills = [];
    let outdatedCount = 0;
    let upToDateCount = 0;
    let unknownCount = 0;
    const deployedNames = new Set<string>();

    for (const skill of tool.skills) {
      deployedNames.add(skill.name);

      if (skill.source === "native") {
        nativeSkills.push(skill);
      } else if (skill.source === "cross-agent") {
        crossAgentSkills.push(skill);
      }

      if (skill.status === "outdated") {
        outdatedCount++;
      } else if (skill.status === "up-to-date") {
        upToDateCount++;
      } else if (skill.status === "unknown") {
        unknownCount++;
      }
    }

    return {
      nativeSkills,
      crossAgentSkills,
      outdatedCount,
      upToDateCount,
      unknownCount,
      deployedNames,
    };
  }, [tool.skills]);

  const crossCount = crossAgentSkills.length;
  const undeployedSkills = useMemo(
    () => registrySkills.filter((s) => !deployedNames.has(s.name)),
    [registrySkills, deployedNames]
  );

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await runInstall("default");
      if (result.buildResult.errors.length > 0) {
        toast.error("Sync completed with errors", {
          description: result.buildResult.errors.join(", "),
        });
      } else {
        toast.success("Sync complete", {
          description: `Built ${result.buildResult.totalSkills} skills → ${result.buildResult.totalFiles} files.`,
        });
        onRefresh();
      }
    } catch (err) {
      toast.error("Sync failed", { description: String(err) });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Deployment model badge */}
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
          <Layers className="w-3 h-3" />
          {MODEL_LABELS[tool.deploymentModel]}
        </span>
        {tool.globalPathDisplay && (
          <span className="text-xs text-muted-foreground font-mono truncate">
            {tool.globalPathDisplay}
          </span>
        )}
      </div>

      {/* Tool note */}
      {tool.note && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700">{tool.note}</p>
        </div>
      )}

      {/* Mini stats for this tool */}
      {tool.skills.length > 0 && (
        <div className="rounded-lg border bg-card/60 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {upToDateCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-success/30 bg-success/10 text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {upToDateCount} current
              </span>
            )}
            {outdatedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-warning/35 bg-warning/10 text-warning">
                <AlertTriangle className="w-3.5 h-3.5" />
                {outdatedCount} outdated
              </span>
            )}
            {unknownCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted/40 text-muted-foreground">
                <Info className="w-3.5 h-3.5" />
                {unknownCount} untracked
              </span>
            )}
            {crossCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Share2 className="w-3.5 h-3.5" />
                {crossCount} shared
              </span>
            )}
          </div>
        </div>
      )}

      {/* Native Skill Cards */}
      {nativeSkills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {nativeSkills.map((skill) => (
            <SkillCard
              key={skill.name}
              skill={skill}
              toolId={tool.toolId}
              gradientClass={TOOL_COLORS[tool.toolId] ?? "from-gray-500/20 to-gray-600/5"}
              onAction={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Cross-Agent Skills */}
      {crossAgentSkills.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pt-2">
            <Share2 className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              Discovered via cross-agent compatibility
            </h4>
            <div className="flex-1 h-px bg-blue-200/50 dark:bg-blue-800/50" />
          </div>
          <p className="text-xs text-muted-foreground">
            These skills are installed in another tool&apos;s directory but are automatically discovered
            by {TOOL_LABELS[tool.toolId]} through its cross-agent skill reading capability.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {crossAgentSkills.map((skill) => (
              <SkillCard
                key={skill.name}
                skill={skill}
                toolId={tool.toolId}
                gradientClass="from-blue-500/10 to-blue-600/5"
                onAction={onRefresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions based on deployment model */}
      {tool.deploymentModel === "per-skill" && undeployedSkills.length > 0 && (
        <AddSkillDialog
          toolId={tool.toolId}
          availableSkills={undeployedSkills}
          onInstalled={onRefresh}
        />
      )}

      {tool.deploymentModel === "bundled" && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">
                Deploy all {registrySkills.length} registry skills to {TOOL_LABELS[tool.toolId]}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rebuilds the merged file with all skills from your registry and deploys it.
              </p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {syncing ? "Syncing..." : "Sync All Skills"}
          </button>
        </div>
      )}

      {tool.deploymentModel === "project-only" && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-start gap-3">
            <FolderOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">
                Deploy skills to a project
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cursor skills are installed per-project into <code className="bg-muted px-1 py-0.5 rounded text-xs">.cursor/rules/</code>.
                Use the Install wizard to deploy skills to a project directory.
              </p>
            </div>
          </div>
          <Link
            href="/install"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Go to Install
          </Link>
        </div>
      )}
    </div>
  );
});

function EmptyState({ toolId }: { toolId: ToolId }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center">
      <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
        {TOOL_ICONS[toolId] ?? <Package className="w-5 h-5" />}
      </div>
      <h3 className="font-semibold">
        No skills deployed to {TOOL_LABELS[toolId]}
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
        Add skills from your registry to start using them with{" "}
        {TOOL_LABELS[toolId]}.
      </p>
    </div>
  );
}
