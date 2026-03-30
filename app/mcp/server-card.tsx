"use client";

import { useState } from "react";
import {
  Terminal,
  Globe,
  ChevronDown,
  ChevronUp,
  Key,
  Copy,
  Check,
  Trash2,
  Send,
  Loader2,
  Pencil,
  X,
  Save,
  Share2,
  HeartPulse,
} from "lucide-react";
import { TOOL_LABELS, type ToolId } from "@/lib/types";
import {
  removeMcpServerAction,
  copyMcpServerAction,
  getRawMcpServerAction,
  editMcpServerAction,
  exportMcpServerAction,
  healthCheckMcpServerAction,
  type McpServerConfig,
  type AddMcpServerInput,
  type HealthCheckResult,
} from "@/lib/actions/mcp";
import { toast } from "sonner";

const TRANSPORT_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  stdio: {
    label: "stdio",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    icon: <Terminal className="w-3 h-3" />,
  },
  sse: {
    label: "SSE",
    color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    icon: <Globe className="w-3 h-3" />,
  },
  "streamable-http": {
    label: "HTTP",
    color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800",
    icon: <Globe className="w-3 h-3" />,
  },
  unknown: {
    label: "unknown",
    color: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    icon: <Terminal className="w-3 h-3" />,
  },
};

const COPYABLE_TOOLS: ToolId[] = ["claude-code", "cursor", "windsurf", "codex"];

interface ServerCardProps {
  server: McpServerConfig;
  toolId: ToolId;
  accentClass: string;
  allToolIds: ToolId[];
  onAction: () => void;
}

export function ServerCard({
  server,
  toolId,
  accentClass,
  allToolIds,
  onAction,
}: ServerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [copying, setCopying] = useState<ToolId | null>(null);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editName, setEditName] = useState(server.name);
  const [editTransport, setEditTransport] = useState<"stdio" | "sse" | "streamable-http">(
    (server.transport === "stdio" || server.transport === "sse" || server.transport === "streamable-http")
      ? server.transport : "stdio"
  );
  const [editCommand, setEditCommand] = useState(server.command ?? "");
  const [editArgs, setEditArgs] = useState((server.args ?? []).join(" "));
  const [editUrl, setEditUrl] = useState(server.url ?? "");
  const [editEnv, setEditEnv] = useState<Array<{ key: string; value: string }>>([]);

  const transport =
    TRANSPORT_CONFIG[server.transport ?? "unknown"] ?? TRANSPORT_CONFIG.unknown;
  const envCount = server.env ? Object.keys(server.env).length : 0;
  const hasDetails = envCount > 0 || (server.args && server.args.length > 0);
  const commandStr = [server.command, ...(server.args ?? [])]
    .filter(Boolean)
    .join(" ");

  const copyTargets = COPYABLE_TOOLS.filter(
    (id) => id !== toolId && allToolIds.includes(id)
  );

  function handleCopyCmd() {
    navigator.clipboard.writeText(commandStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleStartEdit() {
    setEditLoading(true);
    const result = await getRawMcpServerAction(toolId, server.name);
    if (result.success) {
      setEditName(server.name);
      setEditCommand(result.data.command ?? "");
      setEditArgs((result.data.args ?? []).join(" "));
      setEditUrl(result.data.url ?? "");
      setEditTransport(
        server.transport === "sse" ? "sse"
          : server.transport === "streamable-http" ? "streamable-http"
          : "stdio"
      );
      setEditEnv(
        result.data.env
          ? Object.entries(result.data.env).map(([key, value]) => ({ key, value }))
          : []
      );
      setEditing(true);
    } else {
      toast.error("Failed to load server config", { description: result.error });
    }
    setEditLoading(false);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);

    const env: Record<string, string> = {};
    for (const pair of editEnv) {
      if (pair.key.trim()) env[pair.key.trim()] = pair.value;
    }

    const input: AddMcpServerInput = {
      name: editName.trim(),
      transport: editTransport,
      command: editTransport === "stdio" ? editCommand.trim() : undefined,
      args: editTransport === "stdio" && editArgs.trim()
        ? editArgs.split(/\s+/).filter(Boolean)
        : undefined,
      url: editTransport !== "stdio" ? editUrl.trim() : undefined,
      env: Object.keys(env).length > 0 ? env : undefined,
    };

    const result = await editMcpServerAction(toolId, server.name, input);
    if (result.success) {
      toast.success(`Updated "${server.name}"`);
      setEditing(false);
      onAction();
    } else {
      toast.error("Failed to update", { description: result.error });
    }
    setEditSaving(false);
  }

  async function handleHealthCheck() {
    setChecking(true);
    setHealthResult(null);
    const result = await healthCheckMcpServerAction(toolId, server.name);
    if (result.success) {
      setHealthResult(result.data);
      if (result.data.status === "healthy") {
        toast.success(`"${server.name}" is healthy`, {
          description: result.data.message + (result.data.latencyMs != null ? ` (${result.data.latencyMs}ms)` : ""),
        });
      } else if (result.data.status === "unhealthy") {
        toast.error(`"${server.name}" is unhealthy`, { description: result.data.message });
      } else {
        toast.info(`"${server.name}": ${result.data.message}`);
      }
    } else {
      toast.error("Health check failed", { description: result.error });
    }
    setChecking(false);
  }

  async function handleExport() {
    setExporting(true);
    const result = await exportMcpServerAction(toolId, server.name);
    if (result.success) {
      const json = JSON.stringify(result.data, null, 2);
      await navigator.clipboard.writeText(json);
      toast.success(`Copied export JSON for "${server.name}" to clipboard`);
    } else {
      toast.error("Failed to export", { description: result.error });
    }
    setExporting(false);
  }

  async function handleRemove() {
    if (!confirm(`Remove "${server.name}" from ${TOOL_LABELS[toolId]}?`)) return;
    setRemoving(true);
    const result = await removeMcpServerAction(toolId, server.name);
    if (result.success) {
      toast.success(`Removed "${server.name}" from ${TOOL_LABELS[toolId]}`);
      onAction();
    } else {
      toast.error("Failed to remove", { description: result.error });
    }
    setRemoving(false);
  }

  async function handleCopyTo(targetToolId: ToolId) {
    setCopying(targetToolId);
    const result = await copyMcpServerAction(toolId, targetToolId, server.name);
    if (result.success) {
      toast.success(
        `Copied "${server.name}" to ${TOOL_LABELS[targetToolId]}`
      );
      onAction();
    } else {
      toast.error("Failed to copy", { description: result.error });
    }
    setCopying(null);
    setShowCopyMenu(false);
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:border-border/80">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${accentClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">
                  {server.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {server.name}
                </h3>
                {server.url && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                    {server.url}
                  </p>
                )}
              </div>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${transport.color}`}
          >
            {transport.icon}
            {transport.label}
          </span>
        </div>

        {/* Command line */}
        {server.command && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 min-w-0 bg-muted/70 rounded-lg px-3 py-2 font-mono text-xs text-muted-foreground truncate">
              <span className="text-foreground/70 select-none">$ </span>
              {commandStr}
            </div>
            <button
              onClick={handleCopyCmd}
              className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Copy command"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}

        {/* Quick info chips */}
        <div className="flex items-center gap-2 mt-3">
          {envCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Key className="w-3 h-3" />
              {envCount} env var{envCount !== 1 ? "s" : ""}
            </span>
          )}
          {server.args && server.args.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {server.args.length} arg{server.args.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Health check result */}
        {healthResult && (
          <div
            className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-200 ${
              healthResult.status === "healthy"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                : healthResult.status === "unhealthy"
                ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                : "bg-muted text-muted-foreground border"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                healthResult.status === "healthy"
                  ? "bg-emerald-500"
                  : healthResult.status === "unhealthy"
                  ? "bg-red-500"
                  : "bg-gray-400"
              }`}
            />
            <span className="truncate">{healthResult.message}</span>
            {healthResult.latencyMs != null && (
              <span className="ml-auto shrink-0 text-[10px] opacity-70">
                {healthResult.latencyMs}ms
              </span>
            )}
          </div>
        )}

        {/* Expand/collapse details */}
        {hasDetails && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              {expanded ? "Hide" : "Show"} details
            </button>

            {expanded && (
              <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                {server.args && server.args.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                      Arguments
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {server.args.map((arg, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-muted text-xs font-mono"
                        >
                          {arg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {server.env && Object.keys(server.env).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                      Environment Variables
                    </p>
                    <div className="space-y-1">
                      {Object.entries(server.env).map(([key, val]) => (
                        <div
                          key={key}
                          className="flex items-center gap-2 text-xs font-mono"
                        >
                          <span className="text-amber-600 dark:text-amber-400 shrink-0">
                            {key}
                          </span>
                          <span className="text-muted-foreground">=</span>
                          <span className="text-muted-foreground truncate">
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Edit form */}
        {editing && (
          <form onSubmit={handleSaveEdit} className="mt-4 pt-3 border-t border-border/50 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Edit Server
              </p>
              <button type="button" onClick={() => setEditing(false)} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Server name"
              required
              pattern="^[a-zA-Z0-9_-]+$"
              className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs font-mono
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />

            <div className="flex gap-1.5">
              {(["stdio", "sse", "streamable-http"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEditTransport(t)}
                  className={`flex-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all
                    ${editTransport === t
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {t === "stdio" ? "stdio" : t === "sse" ? "SSE" : "HTTP"}
                </button>
              ))}
            </div>

            {editTransport === "stdio" ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={editCommand}
                  onChange={(e) => setEditCommand(e.target.value)}
                  placeholder="command"
                  required
                  className="px-3 py-1.5 rounded-lg border bg-background text-xs font-mono
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <input
                  type="text"
                  value={editArgs}
                  onChange={(e) => setEditArgs(e.target.value)}
                  placeholder="args (space-separated)"
                  className="px-3 py-1.5 rounded-lg border bg-background text-xs font-mono
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            ) : (
              <input
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://..."
                required
                className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs font-mono
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            )}

            {/* Env vars */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Env Variables
                </span>
                <button
                  type="button"
                  onClick={() => setEditEnv([...editEnv, { key: "", value: "" }])}
                  className="text-[11px] text-primary hover:text-primary/80 font-medium"
                >
                  + Add
                </button>
              </div>
              {editEnv.map((pair, i) => (
                <div key={i} className="flex items-center gap-1.5 mb-1.5">
                  <input
                    type="text"
                    value={pair.key}
                    onChange={(e) => {
                      const u = [...editEnv];
                      u[i] = { ...u[i], key: e.target.value };
                      setEditEnv(u);
                    }}
                    placeholder="KEY"
                    className="flex-1 px-2 py-1 rounded-md border bg-background text-[11px] font-mono
                      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <span className="text-muted-foreground text-[11px]">=</span>
                  <input
                    type="text"
                    value={pair.value}
                    onChange={(e) => {
                      const u = [...editEnv];
                      u[i] = { ...u[i], value: e.target.value };
                      setEditEnv(u);
                    }}
                    placeholder="value"
                    className="flex-[2] px-2 py-1 rounded-md border bg-background text-[11px] font-mono
                      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setEditEnv(editEnv.filter((_, j) => j !== i))}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={editSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                {editSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Action bar */}
        {!editing && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
            {/* Edit */}
            <button
              onClick={handleStartEdit}
              disabled={editLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                border text-muted-foreground hover:text-foreground hover:bg-muted/50
                disabled:opacity-50 transition-colors"
            >
              {editLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pencil className="w-3 h-3" />}
              Edit
            </button>

            {/* Share / Export */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                border text-muted-foreground hover:text-foreground hover:bg-muted/50
                disabled:opacity-50 transition-colors"
            >
              {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
              Share
            </button>

            {/* Health Check / Ping */}
            <button
              onClick={handleHealthCheck}
              disabled={checking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                border text-muted-foreground hover:text-foreground hover:bg-muted/50
                disabled:opacity-50 transition-colors"
            >
              {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <HeartPulse className="w-3 h-3" />}
              Ping
            </button>

            {/* Copy to another tool */}
            {copyTargets.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowCopyMenu(!showCopyMenu)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    border text-muted-foreground hover:text-foreground hover:bg-muted/50
                    transition-colors"
                >
                  <Send className="w-3 h-3" />
                  Copy to...
                </button>

                {showCopyMenu && (
                  <div className="absolute bottom-full left-0 mb-1 w-44 rounded-lg border bg-card shadow-lg z-10 py-1 animate-in fade-in slide-in-from-bottom-1 duration-150">
                    {copyTargets.map((target) => (
                      <button
                        key={target}
                        onClick={() => handleCopyTo(target)}
                        disabled={copying !== null}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {copying === target ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        {TOOL_LABELS[target]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Remove */}
            <button
              onClick={handleRemove}
              disabled={removing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                border text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/5
                disabled:opacity-50 transition-colors ml-auto"
            >
              {removing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              {removing ? "Removing..." : "Remove"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
