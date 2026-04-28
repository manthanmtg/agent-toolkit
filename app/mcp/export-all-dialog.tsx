"use client";

import { useState, useMemo } from "react";
import {
  Download,
  X,
  AlertTriangle,
  Shield,
  ShieldOff,
  FileJson,
  Sparkles,
  MousePointerClick,
  Wind,
  Bot,
  Loader2,
  Lock,
  Unlock,
  Server,
  Check,
  Copy,
} from "lucide-react";
import type { ToolId } from "@/lib/types";
import {
  exportAllMcpServersAction,
  type McpOverviewResult,
  type McpBulkExportPayload,
} from "@/lib/actions/mcp";
import { toast } from "sonner";

const TOOL_ICONS: Partial<Record<ToolId, React.ReactNode>> = {
  "claude-code": <Sparkles className="w-3.5 h-3.5" />,
  cursor: <MousePointerClick className="w-3.5 h-3.5" />,
  windsurf: <Wind className="w-3.5 h-3.5" />,
  codex: <Bot className="w-3.5 h-3.5" />,
};

const TOOL_ACCENTS: Partial<Record<ToolId, string>> = {
  "claude-code": "text-orange-600 dark:text-orange-400",
  cursor: "text-blue-600 dark:text-blue-400",
  windsurf: "text-teal-600 dark:text-teal-400",
  codex: "text-pink-600 dark:text-pink-400",
};

interface ExportAllDialogProps {
  overview: McpOverviewResult;
}

export function ExportAllDialog({ overview }: ExportAllDialogProps) {
  const [open, setOpen] = useState(false);
  const [maskEnv, setMaskEnv] = useState(true);
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(
    () =>
      new Set(
        overview.tools
          .filter((t) => t.servers.length > 0)
          .map((t) => t.toolId)
      )
  );
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState<McpBulkExportPayload | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  const toolsWithServers = overview.tools.filter((t) => t.servers.length > 0);
  const hasAnyServers = overview.totalServers > 0;

  const selectedStats = useMemo(() => {
    const entries = overview.tools.filter((t) =>
      selectedTools.has(t.toolId)
    );
    const total = entries.reduce((sum, t) => sum + t.servers.length, 0);
    const envTotal = entries.reduce(
      (sum, t) =>
        sum +
        t.servers.reduce(
          (s, srv) => s + (srv.env ? Object.keys(srv.env).length : 0),
          0
        ),
      0
    );
    return { total, envTotal, tools: entries.length };
  }, [overview, selectedTools]);

  function toggleTool(toolId: ToolId) {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  }

  function toggleAll() {
    if (selectedTools.size === toolsWithServers.length) {
      setSelectedTools(new Set());
    } else {
      setSelectedTools(new Set(toolsWithServers.map((t) => t.toolId)));
    }
  }

  function close() {
    setOpen(false);
    setPreview(null);
    setCopiedPreview(false);
  }

  async function generatePreview() {
    if (selectedStats.total === 0) {
      toast.error("Select at least one tool with servers");
      return;
    }
    setExporting(true);
    const result = await exportAllMcpServersAction({
      toolIds: Array.from(selectedTools),
      maskEnv,
    });
    if (!result.success) {
      toast.error("Export failed", { description: result.error });
      setExporting(false);
      return;
    }
    setPreview(result.data);
    setExporting(false);
  }

  function handleDownload() {
    if (!preview) return;
    const json = JSON.stringify(preview, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `mcp-servers-${timestamp}${preview.env_masked ? "-masked" : "-with-secrets"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(
      `Downloaded ${preview.total_servers} server${preview.total_servers !== 1 ? "s" : ""}`,
      {
        description: preview.env_masked
          ? "Env values are masked (safe to share)"
          : "Env values are included — keep this file private",
      }
    );
    close();
  }

  async function handleCopyPreview() {
    if (!preview) return;
    const json = JSON.stringify(preview, null, 2);
    await navigator.clipboard.writeText(json);
    setCopiedPreview(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedPreview(false), 1800);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!hasAnyServers}
        className="group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg
          border bg-card text-sm font-medium text-foreground
          hover:bg-muted/50 hover:border-border/80
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200"
        title={
          hasAnyServers
            ? "Export all MCP servers"
            : "No servers to export"
        }
      >
        <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span>Export All</span>
        {hasAnyServers && (
          <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold inline-flex items-center justify-center bg-primary/10 text-primary">
            {overview.totalServers}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-all-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={close}
          />

          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border
              bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
          >
            {/* Header */}
            <div className="relative overflow-hidden border-b px-6 py-5">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center">
                    <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="export-all-title"
                      className="text-lg font-semibold tracking-tight"
                    >
                      Export MCP Servers
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bundle your configurations into a portable JSON file
                    </p>
                  </div>
                </div>
                <button
                  onClick={close}
                  aria-label="Close export all MCP servers dialog"
                  className="shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Scope selection */}
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <h3 className="text-sm font-semibold">Scope</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose which tools to include
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {selectedTools.size === toolsWithServers.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {toolsWithServers.map((tool) => {
                    const isSelected = selectedTools.has(tool.toolId);
                    const accent =
                      TOOL_ACCENTS[tool.toolId] ?? "text-foreground";
                    return (
                      <button
                        key={tool.toolId}
                        type="button"
                        onClick={() => toggleTool(tool.toolId)}
                        className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left
                          transition-all duration-150
                          ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-border/80 hover:bg-muted/30"
                          }`}
                      >
                        <div
                          className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all
                            ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/60 bg-background group-hover:border-border"
                            }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={accent}>
                              {TOOL_ICONS[tool.toolId]}
                            </span>
                            <span className="text-sm font-medium truncate">
                              {tool.toolLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {tool.servers.length} server
                            {tool.servers.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Env handling */}
              <section>
                <h3 className="text-sm font-semibold mb-2.5">
                  Environment Variables
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMaskEnv(true)}
                    className={`group relative flex items-start gap-3 px-4 py-3 rounded-xl border text-left
                      transition-all duration-150
                      ${
                        maskEnv
                          ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                          : "border-border hover:border-border/80 hover:bg-muted/30"
                      }`}
                  >
                    <div
                      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                        ${
                          maskEnv
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                    >
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          Mask secrets
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold">
                          RECOMMENDED
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Replace values with <code className="font-mono">••••••••</code>. Safe for sharing.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaskEnv(false)}
                    className={`group relative flex items-start gap-3 px-4 py-3 rounded-xl border text-left
                      transition-all duration-150
                      ${
                        !maskEnv
                          ? "border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/20"
                          : "border-border hover:border-border/80 hover:bg-muted/30"
                      }`}
                  >
                    <div
                      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                        ${
                          !maskEnv
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                    >
                      <ShieldOff className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          Include values
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Export real values. Keep the file <strong>private</strong>.
                      </p>
                    </div>
                  </button>
                </div>

                {!maskEnv && selectedStats.envTotal > 0 && (
                  <div className="mt-3 flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">
                        Contains {selectedStats.envTotal} secret
                        {selectedStats.envTotal !== 1 ? "s" : ""} in plaintext
                      </p>
                      <p className="text-amber-700 dark:text-amber-300/80 mt-0.5">
                        Do not commit to version control or share publicly.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Summary */}
              <section className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileJson className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Summary
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-2xl font-bold leading-none">
                      {selectedStats.total}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      server{selectedStats.total !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">
                      {selectedStats.tools}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      tool{selectedStats.tools !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none flex items-center gap-1.5">
                      {selectedStats.envTotal}
                      {maskEnv ? (
                        <Lock className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      env var{selectedStats.envTotal !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </section>

              {/* Preview */}
              {preview && (
                <section className="animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Server className="w-4 h-4 text-primary" />
                      Preview
                      <span className="text-xs font-normal text-muted-foreground">
                        ({preview.total_servers} included)
                      </span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleCopyPreview}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedPreview ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy JSON
                        </>
                      )}
                    </button>
                  </div>
                  <div className="rounded-lg border bg-muted/30 max-h-52 overflow-y-auto divide-y">
                    {preview.servers.map((s, i) => (
                      <div
                        key={`${s.source_tool_id}:${s.name}:${i}`}
                        className="flex items-center gap-3 px-3.5 py-2.5 text-xs"
                      >
                        <span
                          className={`shrink-0 ${TOOL_ACCENTS[s.source_tool_id] ?? ""}`}
                        >
                          {TOOL_ICONS[s.source_tool_id] ?? (
                            <Server className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="font-mono font-medium truncate">
                          {s.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {s.transport}
                        </span>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {s.source_tool_label}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 flex items-center justify-end gap-2 bg-muted/20">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              {!preview ? (
                <button
                  type="button"
                  onClick={generatePreview}
                  disabled={exporting || selectedStats.total === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileJson className="w-4 h-4" />
                  )}
                  {exporting ? "Building..." : "Build Export"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download JSON
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
