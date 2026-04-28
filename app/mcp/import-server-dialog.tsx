"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  X,
  Loader2,
  FileJson,
  AlertCircle,
} from "lucide-react";
import type { ToolId } from "@/lib/types";
import { TOOL_LABELS } from "@/lib/types";
import {
  importMcpServerAction,
  type McpExportPayload,
} from "@/lib/actions/mcp";
import { toast } from "sonner";

interface ImportServerDialogProps {
  toolId: ToolId;
  onImported: () => void;
}

const MCP_TRANSPORTS = ["stdio", "sse", "streamable-http"] as const;
type McpTransport = (typeof MCP_TRANSPORTS)[number];

function isMcpTransport(value: unknown): value is McpTransport {
  return typeof value === "string" && MCP_TRANSPORTS.includes(value as McpTransport);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;

  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== "string") {
      return undefined;
    }
    result[key] = raw;
  }

  return result;
}

function isValidMcpExportPayload(
  value: unknown
): { success: true; data: McpExportPayload } | { success: false; error: string } {
  if (!isRecord(value)) {
    return { success: false, error: "Invalid JSON payload" };
  }

  const raw = value;
  if (raw["agent-toolkit"] !== "mcp-server") {
    return { success: false, error: "Not a valid agent-toolkit MCP export" };
  }
  if (raw.version !== 1) {
    return { success: false, error: `Unsupported version: ${String(raw.version)}` };
  }
  if (typeof raw.name !== "string" || !raw.name.trim()) {
    return { success: false, error: "Missing server name" };
  }

  if (!isMcpTransport(raw.transport)) {
    return { success: false, error: "Unsupported transport" };
  }
  const transport = raw.transport;

  const args =
    raw.args === undefined
      ? undefined
      : Array.isArray(raw.args)
        ? raw.args.map(String)
        : undefined;
  if (args !== undefined && raw.args !== undefined && !Array.isArray(raw.args)) {
    return { success: false, error: "Invalid args list" };
  }

  const env = asStringRecord(raw.env);
  if (raw.env !== undefined && env === undefined) {
    return { success: false, error: "Invalid env object" };
  }

  const payload: McpExportPayload = {
    "agent-toolkit": "mcp-server",
    version: 1,
    name: raw.name,
    transport,
    command: typeof raw.command === "string" ? raw.command : undefined,
    args,
    url: typeof raw.url === "string" ? raw.url : undefined,
    env,
    source_tool: typeof raw.source_tool === "string" ? raw.source_tool : undefined,
    exported_at: typeof raw.exported_at === "string" ? raw.exported_at : new Date().toISOString(),
  };

  return { success: true, data: payload };
}

export function ImportServerDialog({ toolId, onImported }: ImportServerDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<McpExportPayload | null>(null);

  const reset = useCallback(() => {
    setJsonText("");
    setParseError(null);
    setPreview(null);
  }, []);

  function handleJsonChange(value: string) {
    setJsonText(value);
    setParseError(null);
    setPreview(null);

    if (!value.trim()) return;

    let obj: unknown;
    try {
      obj = JSON.parse(value);
    } catch {
      setParseError("Invalid JSON");
      return;
    }

    const parsed = isValidMcpExportPayload(obj);
    if (!parsed.success) {
      setParseError(parsed.error);
      return;
    }

    setPreview(parsed.data);
  }

  async function handleImport() {
    if (!preview) return;
    setSaving(true);

    const result = await importMcpServerAction(toolId, preview);
    if (result.success) {
      toast.success(`Imported "${preview.name}" to ${TOOL_LABELS[toolId]}`);
      reset();
      setOpen(false);
      onImported();
    } else {
      toast.error("Failed to import", { description: result.error });
    }

    setSaving(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed
          text-sm font-medium text-muted-foreground
          hover:border-primary/50 hover:text-foreground hover:bg-primary/5
          transition-all duration-200"
      >
        <Upload className="w-4 h-4" />
        Import MCP Server
      </button>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">
          Import MCP Server to {TOOL_LABELS[toolId]}
        </h3>
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
          aria-label={`Close import MCP server dialog for ${TOOL_LABELS[toolId]}`}
          className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* JSON input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Paste export JSON
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder={`{\n  "agent-toolkit": "mcp-server",\n  "version": 1,\n  "name": "my-server",\n  ...\n}`}
            rows={8}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
              placeholder:text-muted-foreground/40 resize-y"
          />
        </div>

        {/* Parse error */}
        {parseError && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {parseError}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2 mb-2">
              <FileJson className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Preview
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <span className="text-muted-foreground">Name</span>
              <span className="font-mono font-medium">{preview.name}</span>

              <span className="text-muted-foreground">Transport</span>
              <span className="font-mono">{preview.transport}</span>

              {preview.command && (
                <>
                  <span className="text-muted-foreground">Command</span>
                  <span className="font-mono truncate">
                    {[preview.command, ...(preview.args ?? [])].join(" ")}
                  </span>
                </>
              )}

              {preview.url && (
                <>
                  <span className="text-muted-foreground">URL</span>
                  <span className="font-mono truncate">{preview.url}</span>
                </>
              )}

              {preview.env && Object.keys(preview.env).length > 0 && (
                <>
                  <span className="text-muted-foreground">Env vars</span>
                  <span className="font-mono">
                    {Object.keys(preview.env).length} variable{Object.keys(preview.env).length !== 1 ? "s" : ""}
                  </span>
                </>
              )}

              {preview.source_tool && (
                <>
                  <span className="text-muted-foreground">Source</span>
                  <span>{preview.source_tool}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleImport}
            disabled={saving || !preview}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground
              text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {saving ? "Importing..." : "Import Server"}
          </button>
          <button
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground
              hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
