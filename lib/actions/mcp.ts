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
  if (data && typeof data === "object" && key in data) {
    const val = (data as Record<string, unknown>)[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return val as Record<string, unknown>;
    }
  }
  return null;
}

function maskEnvValue(value: string): string {
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••" + value.slice(-4);
}

function parseServerConfig(name: string, raw: unknown): McpServerConfig {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const command = typeof obj.command === "string" ? obj.command : undefined;
  const args = Array.isArray(obj.args) ? obj.args.map(String) : undefined;
  const url = typeof obj.url === "string" ? obj.url : undefined;

  let transport: McpServerConfig["transport"] = "unknown";
  if (typeof obj.transport === "string") {
    transport = obj.transport as McpServerConfig["transport"];
  } else if (command) {
    transport = "stdio";
  } else if (url) {
    transport = url.includes("/sse") ? "sse" : "streamable-http";
  }

  let env: Record<string, string> | undefined;
  if (obj.env && typeof obj.env === "object") {
    env = {};
    for (const [k, v] of Object.entries(obj.env as Record<string, unknown>)) {
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

  if (!input.name || !/^[a-zA-Z0-9_-]+$/.test(input.name)) {
    return { success: false, error: "Server name must be alphanumeric (with hyphens/underscores)" };
  }

  let json: Record<string, unknown>;
  try {
    json = (await readJsonFile(config.filePath)) ?? {};
  } catch (err) {
    return { success: false, error: String(err) };
  }
  const servers = (json[config.key] ?? {}) as Record<string, unknown>;

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
  const servers = (json[config.key] ?? {}) as Record<string, unknown>;
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
  const servers = (json[config.key] ?? {}) as Record<string, unknown>;

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
  const servers = (json[config.key] ?? {}) as Record<string, unknown>;

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
  const fromServers = (fromJson[fromConfig.key] ?? {}) as Record<string, unknown>;
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
  const toServers = (toJson[toConfig.key] ?? {}) as Record<string, unknown>;

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
  const servers = (json[config.key] ?? {}) as Record<string, unknown>;
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
  if (!payload.name || !/^[a-zA-Z0-9_-]+$/.test(payload.name)) {
    return { success: false, error: "Server name must be alphanumeric (with hyphens/underscores)" };
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
