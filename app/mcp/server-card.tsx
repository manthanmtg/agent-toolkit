"use client";

import { useState, useId, useMemo, memo } from "react";
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
import { TOOL_LABELS, type ToolId, type McpServerConfig } from "@/lib/types";
import {
  removeMcpServerAction,
  copyMcpServerAction,
  getRawMcpServerAction,
  editMcpServerAction,
  exportMcpServerAction,
  healthCheckMcpServerAction,
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

export const ServerCard = memo(function ServerCard({
  server,
  toolId,
  accentClass,
  allToolIds,
  onAction,
}: ServerCardProps) {
  const formId = useId();
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

  const detailsId = useId();

  const transport = useMemo(
    () => TRANSPORT_CONFIG[server.transport ?? "unknown"] ?? TRANSPORT_CONFIG.unknown,
    [server.transport]
  );
  const envCount = useMemo(
    () => (server.env ? Object.keys(server.env).length : 0),
    [server.env]
  );
  const hasDetails = useMemo(
    () => envCount > 0 || (server.args && server.args.length > 0),
    [envCount, server.args]
  );
  const commandStr = useMemo(
    () => [server.command, ...(server.args ?? [])].filter(Boolean).join(" "),
    [server.command, server.args]
  );

  const copyTargets = useMemo(
    () => COPYABLE_TOOLS.filter((id) => id !== toolId && allToolIds.includes(id)),
    [toolId, allToolIds]
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
    <div className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-border/80">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${accentClass} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <span className="text-sm font-bold text-primary">
                  {server.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate tracking-tight">
                  {server.name}
                </h3>
                {server.url && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-mono opacity-80">
                    {server.url}
                  </p>
                )}
              </div>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${transport.color}`}
          >
            {transport.icon}
            {transport.label}
          </span>
        </div>

        {/* Command line */}
        {server.command && (
          <div className="mt-4 flex items-center gap-2 group/cmd">
            <div className="flex-1 min-w-0 bg-muted/40 dark:bg-muted/20 rounded-lg px-3 py-2.5 font-mono text-[11px] text-muted-foreground truncate border border-transparent group-hover/cmd:border-border/50 group-hover/cmd:bg-muted/60 dark:group-hover/cmd:bg-muted/30 transition-all duration-200">
              <span className="text-primary/50 select-none font-bold">$ </span>
              {commandStr}
            </div>
            <button
              onClick={handleCopyCmd}
              className="shrink-0 p-2 rounded-lg hover:bg-secondary transition-all text-muted-foreground hover:text-foreground border border-transparent hover:border-border shadow-sm active:scale-95 group-hover/cmd:border-border/50"
              title="Copy command"
              aria-label={`Copy command for ${server.name}`}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}

        {/* Quick info chips */}
        <div className="flex items-center gap-4 mt-4">
          {envCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors cursor-default">
              <Key className="w-3.5 h-3.5 opacity-70" />
              {envCount} variable{envCount !== 1 ? "s" : ""}
            </span>
          )}
          {server.args && server.args.length > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors cursor-default">
              {server.args.length} arg{server.args.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Health check result */}
        {healthResult && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-4 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium animate-in fade-in zoom-in-95 duration-300 ${
              healthResult.status === "healthy"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50"
                : healthResult.status === "unhealthy"
                ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/50"
                : "bg-muted/50 text-muted-foreground border border-border/50"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${
                healthResult.status === "healthy"
                  ? "bg-emerald-500 animate-pulse"
                  : healthResult.status === "unhealthy"
                  ? "bg-red-500"
                  : "bg-gray-400"
              }`}
            />
            <span className="truncate">{healthResult.message}</span>
            {healthResult.latencyMs != null && (
              <span className="ml-auto shrink-0 text-[10px] font-bold opacity-60">
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
              aria-expanded={expanded}
              aria-controls={detailsId}
              className="flex items-center gap-1.5 mt-4 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              {expanded ? "Hide" : "Show"} details
            </button>

            {expanded && (
              <div
                id={detailsId}
                className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
              >
                {server.args && server.args.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold mb-2">
                      Arguments
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {server.args.map((arg, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md bg-muted/50 border border-border/40 text-[11px] font-mono text-foreground/80 shadow-sm"
                        >
                          {arg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {server.env && Object.keys(server.env).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold mb-2">
                      Environment Variables
                    </p>
                    <div className="space-y-1.5 bg-muted/30 rounded-lg p-2.5 border border-border/30">
                      {Object.entries(server.env).map(([key, val]) => (
                        <div
                          key={key}
                          className="flex items-center gap-2 text-[11px] font-mono"
                        >
                          <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">
                            {key}
                          </span>
                          <span className="text-muted-foreground/40">=</span>
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
          <form onSubmit={handleSaveEdit} className="mt-5 pt-4 border-t border-border/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Edit Server Configuration
              </h4>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                aria-label="Close edit form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label htmlFor={`${formId}-name`} className="text-[9px] uppercase font-bold text-muted-foreground ml-1">
                Server Name
              </label>
              <input
                id={`${formId}-name`}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Server name"
                required
                pattern="^[a-zA-Z0-9_-]+$"
                className="w-full px-3 py-2 rounded-lg border bg-background text-xs font-mono
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Transport</span>
              <div className="flex gap-2" role="radiogroup" aria-label="Transport type">
                {(["stdio", "sse", "streamable-http"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={editTransport === t}
                    onClick={() => setEditTransport(t)}
                    className={`flex-1 px-2 py-2 rounded-lg border text-[11px] font-bold transition-all
                      ${editTransport === t
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                  >
                    {t === "stdio" ? "stdio" : t === "sse" ? "SSE" : "HTTP"}
                  </button>
                ))}
              </div>
            </div>

            {editTransport === "stdio" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor={`${formId}-command`} className="text-[9px] uppercase font-bold text-muted-foreground ml-1">
                    Command
                  </label>
                  <input
                    id={`${formId}-command`}
                    type="text"
                    value={editCommand}
                    onChange={(e) => setEditCommand(e.target.value)}
                    placeholder="command"
                    required
                    className="w-full px-3 py-2 rounded-lg border bg-background text-xs font-mono
                      focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`${formId}-args`} className="text-[9px] uppercase font-bold text-muted-foreground ml-1">
                    Args
                  </label>
                  <input
                    id={`${formId}-args`}
                    type="text"
                    value={editArgs}
                    onChange={(e) => setEditArgs(e.target.value)}
                    placeholder="args"
                    className="w-full px-3 py-2 rounded-lg border bg-background text-xs font-mono
                      focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label htmlFor={`${formId}-url`} className="text-[9px] uppercase font-bold text-muted-foreground ml-1">
                  URL
                </label>
                <input
                  id={`${formId}-url`}
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://..."
                  required
                  className="w-full px-3 py-2 rounded-lg border bg-background text-xs font-mono
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            )}

            {/* Env vars */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                  Env Variables
                </span>
                <button
                  type="button"
                  onClick={() => setEditEnv([...editEnv, { key: "", value: "" }])}
                  className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wide"
                >
                  + Add Pair
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {editEnv.map((pair, i) => (
                  <div key={i} className="flex items-center gap-2 group/env">
                    <input
                      type="text"
                      value={pair.key}
                      onChange={(e) => {
                        const u = [...editEnv];
                        u[i] = { ...u[i], key: e.target.value };
                        setEditEnv(u);
                      }}
                      placeholder="KEY"
                      className="flex-1 px-2.5 py-1.5 rounded-md border bg-background text-[11px] font-mono
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <span className="text-muted-foreground/40 text-[11px]">=</span>
                    <input
                      type="text"
                      value={pair.value}
                      onChange={(e) => {
                        const u = [...editEnv];
                        u[i] = { ...u[i], value: e.target.value };
                        setEditEnv(u);
                      }}
                      placeholder="value"
                      className="flex-[2] px-2.5 py-1.5 rounded-md border bg-background text-[11px] font-mono
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setEditEnv(editEnv.filter((_, j) => j !== i))}
                      aria-label={`Remove env variable ${i + 1}`}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={editSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide
                  bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm active:scale-95"
              >
                {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Action bar */}
        {!editing && (
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/50">
            {/* Edit */}
            <button
              onClick={handleStartEdit}
              disabled={editLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide
                border bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border
                disabled:opacity-50 transition-all active:scale-95"
            >
              {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
              Edit
            </button>

            {/* Share / Export */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide
                border bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border
                disabled:opacity-50 transition-all active:scale-95"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              Share
            </button>

            {/* Health Check / Ping */}
            <button
              onClick={handleHealthCheck}
              disabled={checking}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide
                border bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border
                disabled:opacity-50 transition-all active:scale-95"
            >
              {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HeartPulse className="w-3.5 h-3.5" />}
              Ping
            </button>

            {/* Copy to another tool */}
            {copyTargets.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowCopyMenu(!showCopyMenu)}
                  aria-expanded={showCopyMenu}
                  aria-haspopup="true"
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide
                    border bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border
                    transition-all active:scale-95 ${showCopyMenu ? "bg-secondary border-border text-foreground" : ""}`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Copy to
                </button>

                {showCopyMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border bg-card shadow-xl z-20 py-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <p className="px-3 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 mb-1">
                      Target Tool
                    </p>
                    {copyTargets.map((target) => (
                      <button
                        key={target}
                        onClick={() => handleCopyTo(target)}
                        disabled={copying !== null}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                      >
                        {copying === target ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-primary" />
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide
                border bg-background shadow-sm text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/5
                disabled:opacity-50 transition-all active:scale-95 ml-auto"
            >
              {removing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              {removing ? "Wait..." : "Remove"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
