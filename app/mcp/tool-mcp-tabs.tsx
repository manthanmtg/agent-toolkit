"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  MousePointerClick,
  Wind,
  Bot,
  FileJson,
  Server,
  AlertCircle,
} from "lucide-react";
import type { ToolId } from "@/lib/types";
import type { McpOverviewResult, McpToolEntry } from "@/lib/actions/mcp";
import { ServerCard } from "./server-card";
import { AddServerDialog } from "./add-server-dialog";
import { ImportServerDialog } from "./import-server-dialog";

const TOOL_ICONS: Partial<Record<ToolId, React.ReactNode>> = {
  "claude-code": <Sparkles className="w-4 h-4" />,
  cursor: <MousePointerClick className="w-4 h-4" />,
  windsurf: <Wind className="w-4 h-4" />,
  codex: <Bot className="w-4 h-4" />,
};

const TOOL_COLORS: Partial<Record<ToolId, string>> = {
  "claude-code": "from-orange-500/20 to-orange-600/5",
  cursor: "from-blue-500/20 to-blue-600/5",
  windsurf: "from-teal-500/20 to-teal-600/5",
  codex: "from-pink-500/20 to-pink-600/5",
};

const TOOL_ACCENT: Partial<Record<ToolId, string>> = {
  "claude-code": "bg-orange-500",
  cursor: "bg-blue-500",
  windsurf: "bg-teal-500",
  codex: "bg-pink-500",
};

interface ToolMcpTabsProps {
  data: McpOverviewResult;
}

export function ToolMcpTabs({ data }: ToolMcpTabsProps) {
  const router = useRouter();
  const detectedTools = data.tools.filter((t) => t.detected);
  const allDetectedToolIds = detectedTools.map((t) => t.toolId);
  const [activeTab, setActiveTab] = useState<ToolId>(
    detectedTools.find((t) => t.servers.length > 0)?.toolId
      ?? detectedTools[0]?.toolId
      ?? "claude-code"
  );

  const activeTool = data.tools.find((t) => t.toolId === activeTab);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  if (detectedTools.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Server className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No AI tools detected</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Install an AI coding tool to see its MCP server configurations here.
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
            return (
              <button
                key={tool.toolId}
                onClick={() => setActiveTab(tool.toolId)}
                className={`
                  relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200 flex-1 justify-center
                  ${
                    isActive
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                  }
                `}
              >
                {isActive && (
                  <div
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${TOOL_ACCENT[tool.toolId] ?? "bg-primary"}`}
                  />
                )}
                {TOOL_ICONS[tool.toolId]}
                <span className="hidden sm:inline">{tool.toolLabel}</span>
                {tool.servers.length > 0 && (
                  <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold inline-flex items-center justify-center bg-secondary text-secondary-foreground">
                    {tool.servers.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tool Content */}
      {activeTool && (
        <ToolMcpContent
          tool={activeTool}
          allToolIds={allDetectedToolIds}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}

function ToolMcpContent({
  tool,
  allToolIds,
  onRefresh,
}: {
  tool: McpToolEntry;
  allToolIds: ToolId[];
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Config file paths */}
      <div className="flex flex-wrap items-center gap-3">
        {tool.configPaths.map((cp) => (
          <div key={cp.path} className="flex items-center gap-2">
            <FileJson
              className={`w-3.5 h-3.5 ${cp.exists ? "text-green-500" : "text-muted-foreground/40"}`}
            />
            <span className="text-xs font-mono text-muted-foreground">
              {cp.pathDisplay}
            </span>
            {!cp.exists && (
              <span className="text-[10px] text-muted-foreground/60 italic">
                (not found)
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Server cards */}
      {tool.servers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tool.servers.map((server) => (
            <ServerCard
              key={server.name}
              server={server}
              toolId={tool.toolId}
              accentClass={
                TOOL_COLORS[tool.toolId] ?? "from-gray-500/20 to-gray-600/5"
              }
              allToolIds={allToolIds}
              onAction={onRefresh}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No MCP servers configured</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
            Add an MCP server below, or configure one in{" "}
            {tool.configPaths.length > 0 ? (
              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                {tool.configPaths[0].pathDisplay}
              </code>
            ) : (
              tool.toolLabel
            )}
            .
          </p>
          <McpConfigHint toolId={tool.toolId} />
        </div>
      )}

      {/* Add / Import Server */}
      <div className="flex flex-wrap gap-3">
        <AddServerDialog toolId={tool.toolId} onAdded={onRefresh} />
        <ImportServerDialog toolId={tool.toolId} onImported={onRefresh} />
      </div>
    </div>
  );
}

function McpConfigHint({ toolId }: { toolId: ToolId }) {
  const hints: Partial<Record<ToolId, string>> = {
    "claude-code": "claude mcp add <name> -- <command> [args...]",
    cursor: "Add to ~/.cursor/mcp.json → mcpServers",
  };

  const hint = hints[toolId];
  if (!hint) return null;

  return (
    <div className="mt-4 text-left max-w-lg mx-auto">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
        Or use CLI
      </p>
      <div className="bg-muted/70 rounded-lg px-3 py-2 font-mono text-xs text-muted-foreground">
        <span className="text-foreground/70 select-none">$ </span>
        {hint}
      </div>
    </div>
  );
}
