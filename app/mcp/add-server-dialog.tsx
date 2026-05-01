"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  X,
  Terminal,
  Globe,
  Loader2,
  Trash2,
} from "lucide-react";
import type { ToolId } from "@/lib/types";
import { TOOL_LABELS } from "@/lib/types";
import { addMcpServerAction, type AddMcpServerInput } from "@/lib/actions/mcp";
import { toast } from "sonner";

interface AddServerDialogProps {
  toolId: ToolId;
  onAdded: () => void;
}

type Transport = "stdio" | "sse" | "streamable-http";

interface EnvPair {
  key: string;
  value: string;
}

export function AddServerDialog({ toolId, onAdded }: AddServerDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [transport, setTransport] = useState<Transport>("stdio");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");
  const [envPairs, setEnvPairs] = useState<EnvPair[]>([]);

  const reset = useCallback(() => {
    setName("");
    setTransport("stdio");
    setCommand("");
    setArgs("");
    setUrl("");
    setEnvPairs([]);
  }, []);

  function addEnvPair() {
    setEnvPairs([...envPairs, { key: "", value: "" }]);
  }

  function updateEnvPair(index: number, field: "key" | "value", val: string) {
    const updated = [...envPairs];
    updated[index] = { ...updated[index], [field]: val };
    setEnvPairs(updated);
  }

  function removeEnvPair(index: number) {
    setEnvPairs(envPairs.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const env: Record<string, string> = {};
    for (const pair of envPairs) {
      if (pair.key.trim()) env[pair.key.trim()] = pair.value;
    }

    const input: AddMcpServerInput = {
      name: name.trim(),
      transport,
      command: transport === "stdio" ? command.trim() : undefined,
      args:
        transport === "stdio" && args.trim()
          ? args.split(/\s+/).filter(Boolean)
          : undefined,
      url: transport !== "stdio" ? url.trim() : undefined,
      env: Object.keys(env).length > 0 ? env : undefined,
    };

    const result = await addMcpServerAction(toolId, input);

    if (result.success) {
      toast.success(`Added "${input.name}" to ${TOOL_LABELS[toolId]}`);
      reset();
      setOpen(false);
      onAdded();
    } else {
      toast.error("Failed to add server", { description: result.error });
    }

    setSaving(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-expanded="false"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed
          text-sm font-medium text-muted-foreground
          hover:border-primary/50 hover:text-foreground hover:bg-primary/5
          transition-all duration-200"
      >
        <Plus className="w-4 h-4" />
        Add MCP Server to {TOOL_LABELS[toolId]}
      </button>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">
          Add MCP Server to {TOOL_LABELS[toolId]}
        </h3>
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
          aria-label="Close"
          className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Server Name */}
        <div>
          <label htmlFor="server-name" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Server Name
          </label>
          <input
            id="server-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-server"
            required
            pattern="^[a-zA-Z0-9_-]+$"
            aria-describedby="name-hint"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
              placeholder:text-muted-foreground/40"
          />
          <p id="name-hint" className="text-[11px] text-muted-foreground mt-1">
            Alphanumeric with hyphens and underscores
          </p>
        </div>

        {/* Transport */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Transport
          </label>
          <div className="flex gap-2">
            {(
              [
                { value: "stdio", label: "stdio (local)", icon: <Terminal className="w-3.5 h-3.5" /> },
                { value: "sse", label: "SSE (remote)", icon: <Globe className="w-3.5 h-3.5" /> },
                { value: "streamable-http", label: "HTTP (remote)", icon: <Globe className="w-3.5 h-3.5" /> },
              ] as const
            ).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTransport(t.value)}
                aria-pressed={transport === t.value}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all
                  ${
                    transport === t.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                  }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Command + Args (stdio) */}
        {transport === "stdio" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="command" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Command
              </label>
              <input
                id="command"
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="npx"
                required
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  placeholder:text-muted-foreground/40"
              />
            </div>
            <div>
              <label htmlFor="args" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Arguments
              </label>
              <input
                id="args"
                type="text"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="-y my-mcp-server"
                aria-describedby="args-hint"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  placeholder:text-muted-foreground/40"
              />
              <p id="args-hint" className="text-[11px] text-muted-foreground mt-1">
                Space-separated
              </p>
            </div>
          </div>
        )}

        {/* URL (SSE / HTTP) */}
        {transport !== "stdio" && (
          <div>
            <label htmlFor="url" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Server URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://my-server.example.com/mcp"
              required
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                placeholder:text-muted-foreground/40"
            />
          </div>
        )}

        {/* Environment Variables */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Environment Variables
            </label>
            <button
              type="button"
              onClick={addEnvPair}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              + Add variable
            </button>
          </div>

          {envPairs.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 italic">
              No environment variables. Click &quot;+ Add variable&quot; to add one.
            </p>
          ) : (
            <div className="space-y-2">
              {envPairs.map((pair, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pair.key}
                    onChange={(e) => updateEnvPair(i, "key", e.target.value)}
                    placeholder="KEY"
                    aria-label={`Variable key ${i + 1}`}
                    className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-xs font-mono
                      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                      placeholder:text-muted-foreground/40"
                  />
                  <span className="text-muted-foreground text-xs" aria-hidden="true">=</span>
                  <input
                    type="text"
                    value={pair.value}
                    onChange={(e) => updateEnvPair(i, "value", e.target.value)}
                    placeholder="value"
                    aria-label={`Variable value ${i + 1}`}
                    className="flex-[2] px-3 py-1.5 rounded-lg border bg-background text-xs font-mono
                      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                      placeholder:text-muted-foreground/40"
                  />
                  <button
                    type="button"
                    onClick={() => removeEnvPair(i)}
                    aria-label={`Remove variable ${i + 1}`}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground
              text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {saving ? "Adding..." : "Add Server"}
          </button>
          <button
            type="button"
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
      </form>
    </div>
  );
}
