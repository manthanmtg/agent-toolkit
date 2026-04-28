"use server";

import fs from "fs/promises";
import path from "path";
import { detectTools, getGlobalPath } from "@/lib/detector";
import { TOOL_LABELS, type ToolId } from "@/lib/types";
import { atomicWrite, backupFile } from "@/lib/safety";

// ── Types ────────────────────────────────────────────────────────

export interface McpServerConfig {
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  transport?: "stdio" | "sse" | "streamable-http" | "unknown";
}

export interface McpToolEntry {
  toolId: ToolId;
  toolLabel: string;
  detected: boolean;
  configPaths: Array<{ label: string; path: string; pathDisplay: string; exists: boolean }>;
  servers: McpServerConfig[];
}

export interface McpOverviewResult {
  tools: McpToolEntry[];
  totalServers: number;
  uniqueServerNames: string[];
}

// ── Config file locations per tool ───────────────────────────────

interface ConfigSource {
  label: string;
  getPath: (home: string, globalPath?: string) => string;
  extract: (data: unknown) => Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const TOOL_CONFIG_SOURCES: Partial<Record<ToolId, ConfigSource[]>> = {
  "claude-code": [
    {
      label: "User config",
      getPath: (home) => path.join(home, ".claude.json"),
      extract: (data) => getNestedObject(data, "mcpServers"),
    },
  ],
  cursor: [
    {
      label: "Global MCP",
      getPath: (_home, gp) => path.join(gp ?? "", "mcp.json"),
      extract: (data) => getNestedObject(data, "mcpServers"),
    },
  ],
  windsurf: [
    {
      label: "MCP config",
      getPath: (_home, gp) => path.join(gp ?? "", "mcp_config.json"),
      extract: (data) => getNestedObject(data, "mcpServers"),
    },
  ],
  codex: [
    {
      label: "MCP config",
      getPath: (_home, gp) => path.join(gp ?? "", "mcp.json"),
      extract: (data) => getNestedObject(data, "mcpServers"),
    },
  ],
};

function getNestedObject(data: unknown, key: string): Record<string, unknown> | null {
  if (isRecord(data) && key in data) {
    const val = data[key];
    if (isRecord(val)) {
      return val;
    }
  }
  return null;
}

function maskEnvValue(value: string): string {
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••" + value.slice(-4);
}

const MCP_SERVER_NAME_RE = /^[a-zA-Z0-9_-]+$/;
const FORBIDDEN_SERVER_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isSafeServerName(name: string): boolean {
  return MCP_SERVER_NAME_RE.test(name) && !FORBIDDEN_SERVER_KEYS.has(name);
}

function getServerNameError(name: string): string | null {
  if (!name) return "Server name is required.";
  if (!isSafeServerName(name)) {
    return "Server name must be alphanumeric (with hyphens/underscores), and not a reserved key.";
  }
  return null;
}

function getServersMap(config: Record<string, unknown>, key: string): Record<string, unknown> {
  const raw = config[key];
  if (!isRecord(raw)) return Object.create(null);

  const servers = Object.create(null) as Record<string, unknown>;
  for (const [name, serverConfig] of Object.entries(raw)) {
    if (!isSafeServerName(name)) continue;
    servers[name] = serverConfig;
  }
  return servers;
}

function parseServerConfig(name: string, raw: unknown): McpServerConfig {
  const obj = isRecord(raw) ? raw : {};

  const command = typeof obj.command === "string" ? obj.command : undefined;
  const args = Array.isArray(obj.args) ? obj.args.map(String) : undefined;
  const url = typeof obj.url === "string" ? obj.url : undefined;

  let transport: McpServerConfig["transport"] = "unknown";
  if (typeof obj.transport === "string") {
    if (obj.transport === "stdio" || obj.transport === "sse" || obj.transport === "streamable-http" || obj.transport === "unknown") {
      transport = obj.transport;
    }
  } else if (command) {
    transport = "stdio";
  } else if (url) {
    transport = url.includes("/sse") ? "sse" : "streamable-http";
  }

  let env: Record<string, string> | undefined;
  if (isRecord(obj.env)) {
    env = {};
    for (const [k, v] of Object.entries(obj.env)) {
      env[k] = maskEnvValue(String(v));
    }
  }

  return { name, command, args, url, env, transport };
}

export interface AddMcpServerInput {
  name: string;
  transport: "stdio" | "sse" | "streamable-http";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

type ActionResult = { success: true } | { success: false; error: string };

function getWritableConfigPath(toolId: ToolId): { filePath: string; key: string } | null {
  const home = process.env.HOME || process.env.USERPROFILE || "~";
  const globalPath = getGlobalPath(toolId);
  const sources = TOOL_CONFIG_SOURCES[toolId];
  if (!sources || sources.length === 0) return null;
  return {
    filePath: sources[0].getPath(home, globalPath),
    key: "mcpServers",
  };
}

/**
 * Read and parse a JSON file. Returns the parsed object, or null if the file
 * doesn't exist yet (safe to create). Throws on read/parse errors for existing
 * files so callers abort rather than overwrite with empty data.
 */
async function readJsonFile(filePath: string): Promise<Record<string, unknown> | null> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error(`Cannot read ${filePath}: ${err}`);
  }

  if (!raw.trim()) return null;

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${filePath} contains invalid JSON — refusing to modify`);
  }
}

async function writeJsonFileSafely(
  filePath: string,
  data: Record<string, unknown>
): Promise<void> {
  await backupFile(filePath);

  const content = JSON.stringify(data, null, 2) + "\n";

  // Sanity check: verify the output is valid JSON before writing
  JSON.parse(content);

  await atomicWrite(filePath, content);
}

// ── Mutation actions ─────────────────────────────────────────────

export async function addMcpServerAction(
  toolId: ToolId,
  input: AddMcpServerInput
): Promise<ActionResult> {
  const config = getWritableConfigPath(toolId);
  if (!config) return { success: false, error: `No MCP config path for ${TOOL_LABELS[toolId]}` };

  const nameError = getServerNameError(input.name);
  if (nameError) {
    return { success: false, error: nameError };
  }

  let json: Record<string, unknown>;
  try {
    json = (await readJsonFile(config.filePath)) ?? {};
  } catch (err) {
    return { success: false, error: String(err) };
  }
  const servers = getServersMap(json, config.key);

  if (servers[input.name]) {
    return { success: false, error: `Server "${input.name}" already exists in ${TOOL_LABELS[toolId]}` };
  }

  const serverDef: Record<string, unknown> = {};
  if (input.transport === "stdio") {
    if (!input.command) return { success: false, error: "Command is required for stdio transport" };
    serverDef.command = input.command;
    if (input.args && input.args.length > 0) serverDef.args = input.args;
  } else {
    if (!input.url) return { success: false, error: "URL is required for remote transport" };
    serverDef.url = input.url;
  }
  if (input.env && Object.keys(input.env).length > 0) {
    serverDef.env = input.env;
  }

  servers[input.name] = serverDef;
  json[config.key] = servers;

  try {
    await writeJsonFileSafely(config.filePath, json);
    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to write config: ${err}` };
  }
}

export async function getRawMcpServerAction(
  toolId: ToolId,
  serverName: string
): Promise<{ success: true; data: { command?: string; args?: string[]; url?: string; env?: Record<string, string> } } | { success: false; error: string }> {
  const config = getWritableConfigPath(toolId);
  if (!config) return { success: false, error: `No config path for ${TOOL_LABELS[toolId]}` };

  let json: Record<string, unknown>;
  try {
    json = (await readJsonFile(config.filePath)) ?? {};
  } catch (err) {
    return { success: false, error: String(err) };
  }
  const nameError = getServerNameError(serverName);
  if (nameError) return { success: false, error: nameError };

  const servers = getServersMap(json, config.key);
  const raw = servers[serverName];
  if (!raw || typeof raw !== "object") {
    return { success: false, error: `Server "${serverName}" not found` };
  }

  const obj = raw as Record<string, unknown>;
  const data: { command?: string; args?: string[]; url?: string; env?: Record<string, string> } = {};
  if (typeof obj.command === "string") data.command = obj.command;
  if (Array.isArray(obj.args)) data.args = obj.args.map(String);
  if (typeof obj.url === "string") data.url = obj.url;
  if (obj.env && typeof obj.env === "object") {
    data.env = {};
    for (const [k, v] of Object.entries(obj.env as Record<string, unknown>)) {
      data.env[k] = String(v);
    }
  }

  return { success: true, data };
}

export async function editMcpServerAction(
  toolId: ToolId,
  serverName: string,
  input: AddMcpServerInput
): Promise<ActionResult> {
  const config = getWritableConfigPath(toolId);
  if (!config) return { success: false, error: `No MCP config path for ${TOOL_LABELS[toolId]}` };

  let json: Record<string, unknown>;
  try {
    json = (await readJsonFile(config.filePath)) ?? {};
  } catch (err) {
    return { success: false, error: String(err) };
  }
  const inputNameError = getServerNameError(input.name);
  if (inputNameError) return { success: false, error: `Invalid server name: ${inputNameError}` };

  const serverNameError = getServerNameError(serverName);
  if (serverNameError) return { success: false, error: `Invalid server name: ${serverNameError}` };

  const servers = getServersMap(json, config.key);

  if (!servers[serverName]) {
    return { success: false, error: `Server "${serverName}" not found` };
  }

  const serverDef: Record<string, unknown> = {};
  if (input.transport === "stdio") {
    if (!input.command) return { success: false, error: "Command is required for stdio transport" };
    serverDef.command = input.command;
    if (input.args && input.args.length > 0) serverDef.args = input.args;
  } else {
    if (!input.url) return { success: false, error: "URL is required for remote transport" };
    serverDef.url = input.url;
  }
  if (input.env && Object.keys(input.env).length > 0) {
    serverDef.env = input.env;
  }

  // If renamed, remove old key
  if (input.name !== serverName) {
    if (servers[input.name]) {
      return { success: false, error: `Server "${input.name}" already exists` };
    }
    delete servers[serverName];
  }

  servers[input.name] = serverDef;
  json[config.key] = servers;

  try {
    await writeJsonFileSafely(config.filePath, json);
    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to write config: ${err}` };
  }
}

export async function removeMcpServerAction(
  toolId: ToolId,
  serverName: string
): Promise<ActionResult> {
  const config = getWritableConfigPath(toolId);
  if (!config) return { success: false, error: `No MCP config path for ${TOOL_LABELS[toolId]}` };

  let json: Record<string, unknown>;
  try {
    json = (await readJsonFile(config.filePath)) ?? {};
  } catch (err) {
    return { success: false, error: String(err) };
  }
  const serverNameError = getServerNameError(serverName);
  if (serverNameError) return { success: false, error: `Invalid server name: ${serverNameError}` };

  const servers = getServersMap(json, config.key);

  if (!servers[serverName]) {
    return { success: false, error: `Server "${serverName}" not found` };
  }

  delete servers[serverName];
  json[config.key] = servers;

  try {
    await writeJsonFileSafely(config.filePath, json);
    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to write config: ${err}` };
  }
}

export async function copyMcpServerAction(
  fromToolId: ToolId,
  toToolId: ToolId,
  serverName: string
): Promise<ActionResult> {
  const fromConfig = getWritableConfigPath(fromToolId);
  if (!fromConfig) return { success: false, error: `No config path for ${TOOL_LABELS[fromToolId]}` };

  let fromJson: Record<string, unknown>;
  try {
    fromJson = (await readJsonFile(fromConfig.filePath)) ?? {};
  } catch (err) {
    return { success: false, error: String(err) };
  }
  const serverNameError = getServerNameError(serverName);
  if (serverNameError) return { success: false, error: `Invalid server name: ${serverNameError}` };

  const fromServers = getServersMap(fromJson, fromConfig.key);
  const serverDef = fromServers[serverName];
  if (!serverDef) {
    return { success: false, error: `Server "${serverName}" not found in ${TOOL_LABELS[fromToolId]}` };
  }

  const toConfig = getWritableConfigPath(toToolId);
  if (!toConfig) return { success: false, error: `No config path for ${TOOL_LABELS[toToolId]}` };

  let toJson: Record<string, unknown>;
  try {
    toJson = (await readJsonFile(toConfig.filePath)) ?? {};
  } catch (err) {
    return { success: false, error: String(err) };
  }
  const toServers = getServersMap(toJson, toConfig.key);

  if (toServers[serverName]) {
    return { success: false, error: `Server "${serverName}" already exists in ${TOOL_LABELS[toToolId]}` };
  }

  toServers[serverName] = serverDef;
  toJson[toConfig.key] = toServers;

  try {
    await writeJsonFileSafely(toConfig.filePath, toJson);
    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to write config: ${err}` };
  }
}

// ── Health Check ─────────────────────────────────────────────────

export type HealthStatus = "healthy" | "unhealthy" | "unknown";

export interface HealthCheckResult {
  status: HealthStatus;
  latencyMs: number | null;
  message: string;
  checkedAt: string;
}

export async function healthCheckMcpServerAction(
  toolId: ToolId,
  serverName: string
): Promise<{ success: true; data: HealthCheckResult } | { success: false; error: string }> {
  const config = getWritableConfigPath(toolId);
  if (!config) return { success: false, error: `No config path for ${TOOL_LABELS[toolId]}` };

  let json: Record<string, unknown>;
  try {
    json = (await readJsonFile(config.filePath)) ?? {};
  } catch (err) {
    return { success: false, error: String(err) };
  }
  const serverNameError = getServerNameError(serverName);
  if (serverNameError) return { success: false, error: `Invalid server name: ${serverNameError}` };

  const servers = getServersMap(json, config.key);
  const raw = servers[serverName];
  if (!raw || typeof raw !== "object") {
    return { success: false, error: `Server "${serverName}" not found` };
  }

  const obj = raw as Record<string, unknown>;
  const checkedAt = new Date().toISOString();

  // HTTP / SSE endpoint check
  if (typeof obj.url === "string") {
    const url = obj.url as string;
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      }).catch(() =>
        fetch(url, { method: "GET", signal: controller.signal, redirect: "follow" })
      );
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (res.ok || res.status === 405) {
        return {
          success: true,
          data: { status: "healthy", latencyMs, message: `Reachable (HTTP ${res.status})`, checkedAt },
        };
      }
      return {
        success: true,
        data: { status: "unhealthy", latencyMs, message: `HTTP ${res.status} ${res.statusText}`, checkedAt },
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout = msg.includes("abort");
      return {
        success: true,
        data: {
          status: "unhealthy",
          latencyMs: isTimeout ? null : latencyMs,
          message: isTimeout ? "Connection timed out (5s)" : `Connection failed: ${msg}`,
          checkedAt,
        },
      };
    }
  }

  // stdio command check — verify binary exists on PATH
  if (typeof obj.command === "string") {
    const cmd = obj.command as string;
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);

    const start = Date.now();
    try {
      // Use `which` (macOS/Linux) to check if command is resolvable
      await execFileAsync("which", [cmd], { timeout: 3000 });
      const latencyMs = Date.now() - start;
      return {
        success: true,
        data: { status: "healthy", latencyMs, message: `Command "${cmd}" found on PATH`, checkedAt },
      };
    } catch {
      const latencyMs = Date.now() - start;
      // Try `where` on Windows
      try {
        await execFileAsync("where", [cmd], { timeout: 3000 });
        const latencyMs2 = Date.now() - start;
        return {
          success: true,
          data: { status: "healthy", latencyMs: latencyMs2, message: `Command "${cmd}" found on PATH`, checkedAt },
        };
      } catch {
        return {
          success: true,
          data: { status: "unhealthy", latencyMs, message: `Command "${cmd}" not found on PATH`, checkedAt },
        };
      }
    }
  }

  return {
    success: true,
    data: { status: "unknown", latencyMs: null, message: "No command or URL to check", checkedAt },
  };
}

// ── Export / Import ──────────────────────────────────────────────

export interface McpExportPayload {
  "agent-toolkit": "mcp-server";
  version: 1;
  name: string;
  transport: "stdio" | "sse" | "streamable-http";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  source_tool?: string;
  exported_at: string;
}

export async function exportMcpServerAction(
  toolId: ToolId,
  serverName: string
): Promise<{ success: true; data: McpExportPayload } | { success: false; error: string }> {
  const config = getWritableConfigPath(toolId);
  if (!config) return { success: false, error: `No config path for ${TOOL_LABELS[toolId]}` };

  let json: Record<string, unknown>;
  try {
    json = (await readJsonFile(config.filePath)) ?? {};
  } catch (err) {
    return { success: false, error: String(err) };
  }
  const servers = getServersMap(json, config.key);
  const raw = servers[serverName];
  if (!raw || typeof raw !== "object") {
    return { success: false, error: `Server "${serverName}" not found` };
  }

  const obj = raw as Record<string, unknown>;

  let transport: "stdio" | "sse" | "streamable-http" = "stdio";
  if (typeof obj.transport === "string") {
    transport = obj.transport as typeof transport;
  } else if (typeof obj.url === "string") {
    transport = (obj.url as string).includes("/sse") ? "sse" : "streamable-http";
  }

  const payload: McpExportPayload = {
    "agent-toolkit": "mcp-server",
    version: 1,
    name: serverName,
    transport,
    exported_at: new Date().toISOString(),
    source_tool: TOOL_LABELS[toolId],
  };

  if (typeof obj.command === "string") payload.command = obj.command;
  if (Array.isArray(obj.args)) payload.args = obj.args.map(String);
  if (typeof obj.url === "string") payload.url = obj.url;
  if (obj.env && typeof obj.env === "object") {
    payload.env = {};
    for (const [k, v] of Object.entries(obj.env as Record<string, unknown>)) {
      payload.env[k] = String(v);
    }
  }

  return { success: true, data: payload };
}

export async function importMcpServerAction(
  toolId: ToolId,
  payload: McpExportPayload
): Promise<ActionResult> {
  if (payload["agent-toolkit"] !== "mcp-server") {
    return { success: false, error: "Invalid payload: not an agent-toolkit MCP export" };
  }
  if (payload.version !== 1) {
    return { success: false, error: `Unsupported export version: ${payload.version}` };
  }
  const payloadNameError = getServerNameError(payload.name);
  if (payloadNameError) {
    return { success: false, error: payloadNameError };
  }

  const input: AddMcpServerInput = {
    name: payload.name,
    transport: payload.transport,
    command: payload.command,
    args: payload.args,
    url: payload.url,
    env: payload.env,
  };

  return addMcpServerAction(toolId, input);
}

// ── Bulk Export / Import ─────────────────────────────────────────

export interface McpBulkServerEntry {
  name: string;
  source_tool_id: ToolId;
  source_tool_label: string;
  transport: "stdio" | "sse" | "streamable-http";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export interface McpBulkExportPayload {
  "agent-toolkit": "mcp-bulk-export";
  version: 1;
  exported_at: string;
  env_masked: boolean;
  total_servers: number;
  source_tools: string[];
  servers: McpBulkServerEntry[];
}

export interface ExportAllOptions {
  toolIds?: ToolId[];
  maskEnv: boolean;
}

export async function exportAllMcpServersAction(
  options: ExportAllOptions
): Promise<
  | { success: true; data: McpBulkExportPayload }
  | { success: false; error: string }
> {
  const allTools: ToolId[] = ["claude-code", "cursor", "windsurf", "codex"];
  const tools =
    options.toolIds && options.toolIds.length > 0 ? options.toolIds : allTools;

  const servers: McpBulkServerEntry[] = [];
  const sourceTools = new Set<string>();

  for (const toolId of tools) {
    const config = getWritableConfigPath(toolId);
    if (!config) continue;

    let json: Record<string, unknown>;
    try {
      json = (await readJsonFile(config.filePath)) ?? {};
    } catch {
      continue;
    }

    const rawServers = getServersMap(json, config.key);
    for (const [name, rawConfig] of Object.entries(rawServers)) {
      if (!rawConfig || typeof rawConfig !== "object") continue;
      const obj = rawConfig as Record<string, unknown>;

      let transport: "stdio" | "sse" | "streamable-http" = "stdio";
      if (
        typeof obj.transport === "string" &&
        ["stdio", "sse", "streamable-http"].includes(obj.transport)
      ) {
        transport = obj.transport as typeof transport;
      } else if (typeof obj.url === "string") {
        transport = (obj.url as string).includes("/sse")
          ? "sse"
          : "streamable-http";
      }

      const entry: McpBulkServerEntry = {
        name,
        source_tool_id: toolId,
        source_tool_label: TOOL_LABELS[toolId],
        transport,
      };
      if (typeof obj.command === "string") entry.command = obj.command;
      if (Array.isArray(obj.args)) entry.args = obj.args.map(String);
      if (typeof obj.url === "string") entry.url = obj.url;
      if (obj.env && typeof obj.env === "object") {
        entry.env = {};
        for (const [k, v] of Object.entries(obj.env as Record<string, unknown>)) {
          entry.env[k] = options.maskEnv
            ? maskEnvValue(String(v))
            : String(v);
        }
      }
      servers.push(entry);
      sourceTools.add(TOOL_LABELS[toolId]);
    }
  }

  return {
    success: true,
    data: {
      "agent-toolkit": "mcp-bulk-export",
      version: 1,
      exported_at: new Date().toISOString(),
      env_masked: options.maskEnv,
      total_servers: servers.length,
      source_tools: Array.from(sourceTools).sort(),
      servers,
    },
  };
}

export interface ImportAllSelection {
  name: string;
  target_tool_id: ToolId;
  action: "import" | "overwrite" | "skip";
  transport: "stdio" | "sse" | "streamable-http";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export type ImportResultStatus =
  | "imported"
  | "overwritten"
  | "skipped"
  | "failed";

export interface ImportAllResultDetail {
  name: string;
  target_tool_id: ToolId;
  target_tool_label: string;
  status: ImportResultStatus;
  error?: string;
}

export interface ImportAllResult {
  total: number;
  imported: number;
  overwritten: number;
  skipped: number;
  failed: number;
  details: ImportAllResultDetail[];
}

export async function importAllMcpServersAction(
  selections: ImportAllSelection[]
): Promise<
  | { success: true; data: ImportAllResult }
  | { success: false; error: string }
> {
  if (!selections || selections.length === 0) {
    return { success: false, error: "No servers selected for import" };
  }

  const details: ImportAllResultDetail[] = [];
  let imported = 0;
  let overwritten = 0;
  let skipped = 0;
  let failed = 0;

  // Group by target tool to batch reads/writes per file.
  const byTool = new Map<ToolId, ImportAllSelection[]>();
  for (const sel of selections) {
    const bucket = byTool.get(sel.target_tool_id);
    if (bucket) bucket.push(sel);
    else byTool.set(sel.target_tool_id, [sel]);
  }

  for (const [toolId, sels] of byTool.entries()) {
    const toolLabel = TOOL_LABELS[toolId];
    const config = getWritableConfigPath(toolId);

    if (!config) {
      for (const sel of sels) {
        details.push({
          name: sel.name,
          target_tool_id: toolId,
          target_tool_label: toolLabel,
          status: "failed",
          error: `No MCP config path for ${toolLabel}`,
        });
        failed++;
      }
      continue;
    }

    let json: Record<string, unknown>;
    try {
      json = (await readJsonFile(config.filePath)) ?? {};
    } catch (err) {
      for (const sel of sels) {
        details.push({
          name: sel.name,
          target_tool_id: toolId,
          target_tool_label: toolLabel,
          status: "failed",
          error: String(err),
        });
        failed++;
      }
      continue;
    }

    const servers = getServersMap(json, config.key);
    const applied: ImportAllResultDetail[] = [];

    for (const sel of sels) {
      if (sel.action === "skip") {
        applied.push({
          name: sel.name,
          target_tool_id: toolId,
          target_tool_label: toolLabel,
          status: "skipped",
        });
        continue;
      }

      const selectionNameError = getServerNameError(sel.name);
      if (selectionNameError) {
        applied.push({
          name: sel.name,
          target_tool_id: toolId,
          target_tool_label: toolLabel,
          status: "failed",
          error: selectionNameError,
        });
        continue;
      }

      const exists = !!servers[sel.name];

      if (exists && sel.action === "import") {
        applied.push({
          name: sel.name,
          target_tool_id: toolId,
          target_tool_label: toolLabel,
          status: "failed",
          error: `"${sel.name}" already exists in ${toolLabel} — use overwrite`,
        });
        continue;
      }

      const serverDef: Record<string, unknown> = {};
      if (sel.transport === "stdio") {
        if (!sel.command) {
          applied.push({
            name: sel.name,
            target_tool_id: toolId,
            target_tool_label: toolLabel,
            status: "failed",
            error: "Command is required for stdio transport",
          });
          continue;
        }
        serverDef.command = sel.command;
        if (sel.args && sel.args.length > 0) serverDef.args = sel.args;
      } else {
        if (!sel.url) {
          applied.push({
            name: sel.name,
            target_tool_id: toolId,
            target_tool_label: toolLabel,
            status: "failed",
            error: "URL is required for remote transport",
          });
          continue;
        }
        serverDef.url = sel.url;
      }
      if (sel.env && Object.keys(sel.env).length > 0) {
        serverDef.env = sel.env;
      }

      servers[sel.name] = serverDef;
      applied.push({
        name: sel.name,
        target_tool_id: toolId,
        target_tool_label: toolLabel,
        status: exists ? "overwritten" : "imported",
      });
    }

    json[config.key] = servers;

    const hasMutation = applied.some(
      (d) => d.status === "imported" || d.status === "overwritten"
    );

    if (hasMutation) {
      try {
        await writeJsonFileSafely(config.filePath, json);
      } catch (err) {
        for (const d of applied) {
          if (d.status === "imported" || d.status === "overwritten") {
            d.status = "failed";
            d.error = `Write failed: ${err}`;
          }
        }
      }
    }

    for (const d of applied) {
      details.push(d);
      if (d.status === "imported") imported++;
      else if (d.status === "overwritten") overwritten++;
      else if (d.status === "skipped") skipped++;
      else if (d.status === "failed") failed++;
    }
  }

  return {
    success: true,
    data: {
      total: selections.length,
      imported,
      overwritten,
      skipped,
      failed,
      details,
    },
  };
}

// ── Read action ──────────────────────────────────────────────────

export async function getMcpOverview(): Promise<McpOverviewResult> {
  const detectedTools = await detectTools();
  const home = process.env.HOME || process.env.USERPROFILE || "~";
  const toolsToScan: ToolId[] = ["claude-code", "cursor", "windsurf", "codex"];

  const tools: McpToolEntry[] = [];
  const allServerNames = new Set<string>();
  let totalServers = 0;

  for (const toolId of toolsToScan) {
    const detected = detectedTools.find((t) => t.id === toolId);
    const isDetected = detected?.detected ?? false;
    const globalPath = getGlobalPath(toolId);
    const sources = TOOL_CONFIG_SOURCES[toolId] ?? [];

    const configPaths: McpToolEntry["configPaths"] = [];
    const servers: McpServerConfig[] = [];
    const seenNames = new Set<string>();

    for (const source of sources) {
      const filePath = source.getPath(home, globalPath);
      const pathDisplay = filePath.replace(home, "~");
      let exists = false;

      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        exists = true;

        const mcpServers = source.extract(parsed);
        if (mcpServers) {
          for (const [name, config] of Object.entries(mcpServers)) {
            if (seenNames.has(name)) continue;
            seenNames.add(name);
            servers.push(parseServerConfig(name, config));
            allServerNames.add(name);
          }
        }
      } catch {
        // File doesn't exist or isn't valid JSON
        try {
          await fs.access(filePath);
          exists = true;
        } catch {
          // truly doesn't exist
        }
      }

      configPaths.push({ label: source.label, path: filePath, pathDisplay, exists });
    }

    totalServers += servers.length;

    tools.push({
      toolId,
      toolLabel: TOOL_LABELS[toolId],
      detected: isDetected,
      configPaths,
      servers,
    });
  }

  return {
    tools,
    totalServers,
    uniqueServerNames: Array.from(allServerNames).sort(),
  };
}
