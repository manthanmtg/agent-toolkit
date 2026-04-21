"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  FileJson,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Sparkles,
  MousePointerClick,
  Wind,
  Bot,
  Server,
  ArrowRight,
  ClipboardPaste,
  RefreshCw,
  SkipForward,
  ChevronDown,
  FileUp,
  EyeOff,
} from "lucide-react";
import type { ToolId } from "@/lib/types";
import { TOOL_LABELS } from "@/lib/types";
import {
  importAllMcpServersAction,
  type McpOverviewResult,
  type ImportAllSelection,
  type ImportAllResult,
  type ImportAllResultDetail,
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

type Transport = "stdio" | "sse" | "streamable-http";

interface ParsedServer {
  name: string;
  source_tool_id?: ToolId;
  source_tool_label?: string;
  transport: Transport;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  envMaskedDetected: boolean;
}

interface ParsedPayload {
  servers: ParsedServer[];
  format: "bulk" | "single";
  envMasked: boolean;
  exportedAt?: string;
}

type ConflictStrategy = "skip" | "overwrite";
type TargetMode = "preserve" | "override";

interface ImportAllDialogProps {
  overview: McpOverviewResult;
}

function parsePayload(
  obj: unknown
):
  | { success: true; data: ParsedPayload }
  | { success: false; error: string } {
  if (!obj || typeof obj !== "object") {
    return { success: false, error: "Invalid payload (not an object)" };
  }
  const o = obj as Record<string, unknown>;

  function parseServer(srv: Record<string, unknown>): ParsedServer | null {
    if (typeof srv.name !== "string" || !srv.name) return null;
    const env =
      srv.env && typeof srv.env === "object"
        ? Object.fromEntries(
            Object.entries(srv.env as Record<string, unknown>).map(([k, v]) => [
              k,
              String(v),
            ])
          )
        : undefined;
    const envMaskedDetected = env
      ? Object.values(env).some((v) => v.includes("••••"))
      : false;

    const rawTransport = typeof srv.transport === "string" ? srv.transport : "";
    const transport: Transport = (
      ["stdio", "sse", "streamable-http"] as const
    ).includes(rawTransport as Transport)
      ? (rawTransport as Transport)
      : typeof srv.url === "string"
      ? (srv.url as string).includes("/sse")
        ? "sse"
        : "streamable-http"
      : "stdio";

    const sourceId =
      typeof srv.source_tool_id === "string"
        ? (srv.source_tool_id as ToolId)
        : undefined;

    return {
      name: srv.name,
      source_tool_id: sourceId,
      source_tool_label:
        typeof srv.source_tool_label === "string"
          ? srv.source_tool_label
          : typeof srv.source_tool === "string"
          ? srv.source_tool
          : undefined,
      transport,
      command: typeof srv.command === "string" ? srv.command : undefined,
      args: Array.isArray(srv.args)
        ? (srv.args as unknown[]).map(String)
        : undefined,
      url: typeof srv.url === "string" ? srv.url : undefined,
      env,
      envMaskedDetected,
    };
  }

  // Bulk payload
  if (o["agent-toolkit"] === "mcp-bulk-export") {
    if (o.version !== 1) {
      return {
        success: false,
        error: `Unsupported bulk export version: ${o.version}`,
      };
    }
    if (!Array.isArray(o.servers)) {
      return { success: false, error: "Missing servers array" };
    }
    const servers: ParsedServer[] = [];
    for (const s of o.servers) {
      if (!s || typeof s !== "object") continue;
      const parsed = parseServer(s as Record<string, unknown>);
      if (parsed) servers.push(parsed);
    }
    if (servers.length === 0) {
      return { success: false, error: "No valid servers found in payload" };
    }
    return {
      success: true,
      data: {
        servers,
        format: "bulk",
        envMasked: typeof o.env_masked === "boolean" ? o.env_masked : false,
        exportedAt: typeof o.exported_at === "string" ? o.exported_at : undefined,
      },
    };
  }

  // Single payload (backward compat)
  if (o["agent-toolkit"] === "mcp-server") {
    if (o.version !== 1) {
      return {
        success: false,
        error: `Unsupported export version: ${o.version}`,
      };
    }
    const parsed = parseServer(o);
    if (!parsed) {
      return { success: false, error: "Missing required fields" };
    }
    return {
      success: true,
      data: {
        servers: [parsed],
        format: "single",
        envMasked: parsed.envMaskedDetected,
        exportedAt: typeof o.exported_at === "string" ? o.exported_at : undefined,
      },
    };
  }

  return {
    success: false,
    error: 'Unrecognized format — expected "agent-toolkit": "mcp-server" or "mcp-bulk-export"',
  };
}

export function ImportAllDialog({ overview }: ImportAllDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedPayload | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [targetMode, setTargetMode] = useState<TargetMode>("preserve");
  const [targetOverride, setTargetOverride] = useState<ToolId>("claude-code");
  const [conflictStrategy, setConflictStrategy] =
    useState<ConflictStrategy>("skip");

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportAllResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const detectedTools = useMemo(
    () => overview.tools.filter((t) => t.detected),
    [overview]
  );

  // Ensure targetOverride refers to a detected tool
  const firstDetected = detectedTools[0]?.toolId ?? "claude-code";
  const effectiveTargetOverride = detectedTools.some(
    (t) => t.toolId === targetOverride
  )
    ? targetOverride
    : firstDetected;

  function keyFor(s: ParsedServer): string {
    return `${s.source_tool_id ?? "none"}::${s.name}`;
  }

  function getTargetFor(s: ParsedServer): ToolId {
    if (targetMode === "override") return effectiveTargetOverride;
    return s.source_tool_id ?? effectiveTargetOverride;
  }

  const conflicts = useMemo(() => {
    const m: Record<string, boolean> = {};
    if (!parsed) return m;
    for (const s of parsed.servers) {
      const target = getTargetFor(s);
      const tool = overview.tools.find((t) => t.toolId === target);
      m[keyFor(s)] = !!tool?.servers.find((srv) => srv.name === s.name);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, targetMode, effectiveTargetOverride, overview]);

  const conflictCount = useMemo(
    () =>
      parsed
        ? parsed.servers
            .filter((s) => selected.has(keyFor(s)))
            .filter((s) => conflicts[keyFor(s)]).length
        : 0,
    [parsed, selected, conflicts]
  );

  const selectedStats = useMemo(() => {
    if (!parsed) {
      return { total: 0, fresh: 0, existing: 0, maskedEnvs: 0 };
    }
    const selectedServers = parsed.servers.filter((s) =>
      selected.has(keyFor(s))
    );
    const existing = selectedServers.filter((s) => conflicts[keyFor(s)]).length;
    const maskedEnvs = selectedServers.filter((s) => s.envMaskedDetected).length;
    return {
      total: selectedServers.length,
      fresh: selectedServers.length - existing,
      existing,
      maskedEnvs,
    };
  }, [parsed, selected, conflicts]);

  const handleJsonChange = useCallback((value: string) => {
    setJsonText(value);
    setParseError(null);
    setParsed(null);
    setSelected(new Set());
    setResult(null);

    if (!value.trim()) return;

    let obj: unknown;
    try {
      obj = JSON.parse(value);
    } catch {
      setParseError("Invalid JSON");
      return;
    }

    const res = parsePayload(obj);
    if (!res.success) {
      setParseError(res.error);
      return;
    }

    setParsed(res.data);
    // Default: select all
    setSelected(new Set(res.data.servers.map((s) => keyFor(s))));
  }, []);

  function handleFile(file: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? "");
      handleJsonChange(text);
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handlePasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      handleJsonChange(text);
    } catch {
      toast.error("Couldn't read clipboard");
    }
  }

  function toggleOne(s: ParsedServer) {
    const k = keyFor(s);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleAll() {
    if (!parsed) return;
    if (selected.size === parsed.servers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(parsed.servers.map((s) => keyFor(s))));
    }
  }

  function reset() {
    setJsonText("");
    setParseError(null);
    setParsed(null);
    setSelected(new Set());
    setResult(null);
    setIsDragging(false);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  async function handleImport() {
    if (!parsed) return;
    if (selected.size === 0) {
      toast.error("Select at least one server");
      return;
    }

    setImporting(true);
    const selections: ImportAllSelection[] = parsed.servers
      .filter((s) => selected.has(keyFor(s)))
      .map((s) => {
        const target = getTargetFor(s);
        const exists = conflicts[keyFor(s)];
        const action: ImportAllSelection["action"] = exists
          ? conflictStrategy === "skip"
            ? "skip"
            : "overwrite"
          : "import";
        return {
          name: s.name,
          target_tool_id: target,
          action,
          transport: s.transport,
          command: s.command,
          args: s.args,
          url: s.url,
          env: s.env,
        };
      });

    const res = await importAllMcpServersAction(selections);
    if (res.success) {
      setResult(res.data);
      if (res.data.imported + res.data.overwritten > 0) {
        toast.success(
          `Imported ${res.data.imported + res.data.overwritten} server${
            res.data.imported + res.data.overwritten !== 1 ? "s" : ""
          }`,
          {
            description: `${res.data.skipped} skipped, ${res.data.failed} failed`,
          }
        );
        router.refresh();
      } else if (res.data.skipped > 0) {
        toast.info(`Skipped ${res.data.skipped}, none imported`);
      } else {
        toast.error("Nothing imported", {
          description: `${res.data.failed} failed`,
        });
      }
    } else {
      toast.error("Import failed", { description: res.error });
    }
    setImporting(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg
          border bg-card text-sm font-medium text-foreground
          hover:bg-muted/50 hover:border-border/80
          transition-all duration-200"
        title="Import MCP servers"
      >
        <Upload className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span>Import All</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-all-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={close}
          />

          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border
              bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
          >
            {/* Header */}
            <div className="relative overflow-hidden border-b px-6 py-5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent pointer-events-none" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/20 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="import-all-title"
                      className="text-lg font-semibold tracking-tight"
                    >
                      Import MCP Servers
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bring servers in from an exported JSON file
                    </p>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {result ? (
                <ImportResultsView
                  result={result}
                  onReset={() => {
                    setResult(null);
                    setParsed(null);
                    setSelected(new Set());
                    setJsonText("");
                  }}
                  onClose={close}
                />
              ) : !parsed ? (
                <InputStep
                  jsonText={jsonText}
                  onJsonChange={handleJsonChange}
                  parseError={parseError}
                  onDrop={handleDrop}
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  fileInputRef={fileInputRef}
                  onFile={handleFile}
                  onPaste={handlePasteClipboard}
                />
              ) : (
                <SelectionStep
                  parsed={parsed}
                  selected={selected}
                  onToggleOne={toggleOne}
                  onToggleAll={toggleAll}
                  keyFor={keyFor}
                  conflicts={conflicts}
                  targetMode={targetMode}
                  setTargetMode={setTargetMode}
                  targetOverride={effectiveTargetOverride}
                  setTargetOverride={setTargetOverride}
                  detectedTools={detectedTools}
                  conflictStrategy={conflictStrategy}
                  setConflictStrategy={setConflictStrategy}
                  selectedStats={selectedStats}
                  conflictCount={conflictCount}
                  getTargetFor={getTargetFor}
                />
              )}
            </div>

            {/* Footer */}
            {!result && (
              <div className="border-t px-6 py-4 flex items-center justify-between gap-2 bg-muted/20">
                {parsed ? (
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Change file
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  {parsed && (
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={importing || selected.size === 0}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                        bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {importing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {importing
                        ? "Importing..."
                        : `Import ${selected.size}`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {result && (
              <div className="border-t px-6 py-4 flex items-center justify-end gap-2 bg-muted/20">
                <button
                  type="button"
                  onClick={close}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Subcomponents ────────────────────────────────────────────────

function InputStep({
  jsonText,
  onJsonChange,
  parseError,
  onDrop,
  isDragging,
  setIsDragging,
  fileInputRef,
  onFile,
  onPaste,
}: {
  jsonText: string;
  onJsonChange: (v: string) => void;
  parseError: string | null;
  onDrop: (e: React.DragEvent) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
  onPaste: () => void;
}) {
  return (
    <div className="p-6 space-y-5">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
          px-6 py-8 flex flex-col items-center justify-center text-center
          ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-3">
          <FileUp className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-medium">
          Drop a JSON file here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Accepts single or bulk export files
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPaste();
          }}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            border text-muted-foreground hover:text-foreground hover:bg-card hover:border-border/80
            transition-colors"
        >
          <ClipboardPaste className="w-3 h-3" />
          Paste from clipboard
        </button>
      </div>

      {/* Manual paste */}
      <details className="group">
        <summary className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none">
          <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-0 -rotate-90" />
          Or paste JSON manually
        </summary>
        <textarea
          value={jsonText}
          onChange={(e) => onJsonChange(e.target.value)}
          placeholder={`{\n  "agent-toolkit": "mcp-bulk-export",\n  "version": 1,\n  ...\n}`}
          rows={8}
          className="mt-2 w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
            placeholder:text-muted-foreground/40 resize-y"
        />
      </details>

      {/* Error */}
      {parseError && (
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-destructive/5 border border-destructive/20 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-destructive">
              Couldn&apos;t parse this file
            </p>
            <p className="text-muted-foreground mt-0.5">{parseError}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectionStep({
  parsed,
  selected,
  onToggleOne,
  onToggleAll,
  keyFor,
  conflicts,
  targetMode,
  setTargetMode,
  targetOverride,
  setTargetOverride,
  detectedTools,
  conflictStrategy,
  setConflictStrategy,
  selectedStats,
  conflictCount,
  getTargetFor,
}: {
  parsed: ParsedPayload;
  selected: Set<string>;
  onToggleOne: (s: ParsedServer) => void;
  onToggleAll: () => void;
  keyFor: (s: ParsedServer) => string;
  conflicts: Record<string, boolean>;
  targetMode: TargetMode;
  setTargetMode: (m: TargetMode) => void;
  targetOverride: ToolId;
  setTargetOverride: (t: ToolId) => void;
  detectedTools: McpOverviewResult["tools"];
  conflictStrategy: ConflictStrategy;
  setConflictStrategy: (s: ConflictStrategy) => void;
  selectedStats: {
    total: number;
    fresh: number;
    existing: number;
    maskedEnvs: number;
  };
  conflictCount: number;
  getTargetFor: (s: ParsedServer) => ToolId;
}) {
  const hasMultipleSources = useMemo(
    () =>
      new Set(parsed.servers.map((s) => s.source_tool_id).filter(Boolean))
        .size > 1,
    [parsed]
  );

  return (
    <div className="p-6 space-y-5">
      {/* Payload summary */}
      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-muted/40 border text-xs">
        <FileJson className="w-4 h-4 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {parsed.format === "bulk" ? "Bulk export" : "Single server"} · {parsed.servers.length} server
            {parsed.servers.length !== 1 ? "s" : ""}
          </p>
          {parsed.exportedAt && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Exported{" "}
              {new Date(parsed.exportedAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
        {parsed.envMasked && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <EyeOff className="w-3 h-3" />
            Env masked
          </span>
        )}
      </div>

      {/* Target selection */}
      <section>
        <h3 className="text-sm font-semibold mb-2.5">Target Tool</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTargetMode("preserve")}
            disabled={!hasMultipleSources && parsed.servers.every((s) => !s.source_tool_id)}
            className={`group relative flex items-start gap-3 px-4 py-3 rounded-xl border text-left
              transition-all duration-150
              ${
                targetMode === "preserve"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-border/80 hover:bg-muted/30 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
          >
            <div
              className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                ${
                  targetMode === "preserve"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
            >
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Preserve source</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Each server goes back to its original tool
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTargetMode("override")}
            className={`group relative flex items-start gap-3 px-4 py-3 rounded-xl border text-left
              transition-all duration-150
              ${
                targetMode === "override"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-border/80 hover:bg-muted/30"
              }`}
          >
            <div
              className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                ${
                  targetMode === "override"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
            >
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Send all to…</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Import every selected server into one tool
              </p>
            </div>
          </button>
        </div>

        {targetMode === "override" && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {detectedTools.map((tool) => {
              const isActive = targetOverride === tool.toolId;
              return (
                <button
                  key={tool.toolId}
                  type="button"
                  onClick={() => setTargetOverride(tool.toolId)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border
                    transition-all duration-150
                    ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                >
                  <span className={isActive ? "" : TOOL_ACCENTS[tool.toolId]}>
                    {TOOL_ICONS[tool.toolId]}
                  </span>
                  {tool.toolLabel}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Conflict strategy */}
      {conflictCount > 0 && (
        <section className="animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {conflictCount} server{conflictCount !== 1 ? "s" : ""} already exist
                {conflictCount === 1 ? "s" : ""}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                Choose what to do when a server name is already taken.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setConflictStrategy("skip")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border
                    transition-all duration-150
                    ${
                      conflictStrategy === "skip"
                        ? "border-amber-600 bg-amber-500/20 text-amber-900 dark:text-amber-200"
                        : "border-amber-500/30 bg-card/50 text-amber-800 dark:text-amber-300/80 hover:bg-card"
                    }`}
                >
                  <SkipForward className="w-3 h-3" />
                  Skip existing
                </button>
                <button
                  type="button"
                  onClick={() => setConflictStrategy("overwrite")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border
                    transition-all duration-150
                    ${
                      conflictStrategy === "overwrite"
                        ? "border-amber-600 bg-amber-500/20 text-amber-900 dark:text-amber-200"
                        : "border-amber-500/30 bg-card/50 text-amber-800 dark:text-amber-300/80 hover:bg-card"
                    }`}
                >
                  <RefreshCw className="w-3 h-3" />
                  Overwrite existing
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Masked env warning */}
      {selectedStats.maskedEnvs > 0 && (
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-blue-900 dark:text-blue-200">
              {selectedStats.maskedEnvs} selected server
              {selectedStats.maskedEnvs !== 1 ? "s" : ""} have masked env values
            </p>
            <p className="text-blue-700 dark:text-blue-300/80 mt-0.5">
              Values like <code className="font-mono">••••••••</code> will be
              imported as-is. Edit each server afterward to set real secrets.
            </p>
          </div>
        </div>
      )}

      {/* Server list */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h3 className="text-sm font-semibold">Servers</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedStats.total} of {parsed.servers.length} selected
              {selectedStats.existing > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {" "}· {selectedStats.existing} will conflict
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleAll}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {selected.size === parsed.servers.length
              ? "Deselect all"
              : "Select all"}
          </button>
        </div>

        <div className="rounded-xl border bg-muted/20 divide-y max-h-80 overflow-y-auto">
          {parsed.servers.map((s) => {
            const k = keyFor(s);
            const isSelected = selected.has(k);
            const exists = conflicts[k];
            const target = getTargetFor(s);
            const targetLabel = TOOL_LABELS[target];

            return (
              <label
                key={k}
                className={`group flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors
                  ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleOne(s)}
                  className="sr-only"
                />
                <div
                  className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all
                    ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background group-hover:border-border"
                    }`}
                >
                  {isSelected && <CheckCircle2 className="w-3 h-3" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-medium truncate">
                      {s.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {s.transport}
                    </span>
                    {s.envMaskedDetected && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-400">
                        <EyeOff className="w-2.5 h-2.5" />
                        masked
                      </span>
                    )}
                    {exists && isSelected && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        exists ·{" "}
                        {conflictStrategy === "skip"
                          ? "will skip"
                          : "will overwrite"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate font-mono">
                    {s.command
                      ? [s.command, ...(s.args ?? [])].join(" ")
                      : s.url ?? "—"}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {s.source_tool_id && (
                    <>
                      <span className={TOOL_ACCENTS[s.source_tool_id]}>
                        {TOOL_ICONS[s.source_tool_id]}
                      </span>
                      <span>{s.source_tool_label ?? s.source_tool_id}</span>
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 ${TOOL_ACCENTS[target]}`}
                  >
                    {TOOL_ICONS[target]}
                    <span className="font-medium">{targetLabel}</span>
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ImportResultsView({
  result,
  onReset,
  onClose: _onClose,
}: {
  result: ImportAllResult;
  onReset: () => void;
  onClose: () => void;
}) {
  const hasFailures = result.failed > 0;
  const hasSuccess = result.imported + result.overwritten > 0;

  return (
    <div className="p-6 space-y-5">
      {/* Summary hero */}
      <div
        className={`rounded-xl border p-5 text-center
          ${
            hasFailures && !hasSuccess
              ? "bg-destructive/5 border-destructive/30"
              : hasSuccess
              ? "bg-emerald-500/5 border-emerald-500/30"
              : "bg-muted/30"
          }`}
      >
        <div
          className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3
            ${
              hasFailures && !hasSuccess
                ? "bg-destructive/10"
                : hasSuccess
                ? "bg-emerald-500/15"
                : "bg-muted"
            }`}
        >
          {hasFailures && !hasSuccess ? (
            <XCircle className="w-6 h-6 text-destructive" />
          ) : hasSuccess ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Info className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <h3 className="text-lg font-semibold">
          {hasFailures && !hasSuccess
            ? "Import failed"
            : hasSuccess
            ? "Import complete"
            : "Nothing imported"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Processed {result.total} server{result.total !== 1 ? "s" : ""}
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <StatBadge label="Added" count={result.imported} tone="emerald" />
          <StatBadge
            label="Replaced"
            count={result.overwritten}
            tone="blue"
          />
          <StatBadge label="Skipped" count={result.skipped} tone="amber" />
          <StatBadge label="Failed" count={result.failed} tone="red" />
        </div>
      </div>

      {/* Per-server details */}
      <section>
        <h4 className="text-sm font-semibold mb-2">Details</h4>
        <div className="rounded-xl border bg-muted/20 divide-y max-h-72 overflow-y-auto">
          {result.details.map((d, i) => (
            <div
              key={`${d.target_tool_id}:${d.name}:${i}`}
              className="flex items-center gap-3 px-3.5 py-2.5 text-xs"
            >
              <StatusIcon status={d.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium truncate">
                    {d.name}
                  </span>
                  <span
                    className={`text-[10px] ${TOOL_ACCENTS[d.target_tool_id] ?? "text-muted-foreground"}`}
                  >
                    {TOOL_ICONS[d.target_tool_id]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {d.target_tool_label}
                  </span>
                </div>
                {d.error && (
                  <p className="text-[11px] text-destructive mt-0.5 truncate">
                    {d.error}
                  </p>
                )}
              </div>
              <StatusLabel status={d.status} />
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Upload className="w-3 h-3" />
          Import another file
        </button>
      </div>
    </div>
  );
}

function StatBadge({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "emerald" | "blue" | "amber" | "red";
}) {
  const styles: Record<string, string> = {
    emerald:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
    red: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  };
  const isEmpty = count === 0;
  return (
    <div
      className={`rounded-lg border p-2 ${
        isEmpty ? "bg-muted/30 border-border/40 opacity-60" : styles[tone]
      }`}
    >
      <p className="text-xl font-bold leading-none">{count}</p>
      <p className="text-[10px] uppercase tracking-wider font-semibold mt-1">
        {label}
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: ImportAllResultDetail["status"] }) {
  if (status === "imported")
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
  if (status === "overwritten")
    return <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />;
  if (status === "skipped")
    return <SkipForward className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
  return <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />;
}

function StatusLabel({ status }: { status: ImportAllResultDetail["status"] }) {
  const labels: Record<string, string> = {
    imported: "added",
    overwritten: "replaced",
    skipped: "skipped",
    failed: "failed",
  };
  const tones: Record<string, string> = {
    imported: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
    overwritten: "text-blue-700 dark:text-blue-400 bg-blue-500/10",
    skipped: "text-amber-700 dark:text-amber-400 bg-amber-500/10",
    failed: "text-red-700 dark:text-red-400 bg-red-500/10",
  };
  return (
    <span
      className={`shrink-0 inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${tones[status]}`}
    >
      {labels[status]}
    </span>
  );
}
