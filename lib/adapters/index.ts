import type { ToolId } from "../types";
import { BaseAdapter } from "./base";
import { ClaudeCodeAdapter } from "./claude-code";
import { CursorAdapter } from "./cursor";
import { WindsurfAdapter } from "./windsurf";
import { OpenCodeAdapter } from "./opencode";
import { CodexAdapter } from "./codex";
import { AgentsMdAdapter } from "./agents-md";

export { BaseAdapter } from "./base";
export { ClaudeCodeAdapter } from "./claude-code";
export { CursorAdapter } from "./cursor";
export { WindsurfAdapter } from "./windsurf";
export { OpenCodeAdapter } from "./opencode";
export { CodexAdapter } from "./codex";
export { AgentsMdAdapter } from "./agents-md";

const instances: Partial<Record<ToolId, BaseAdapter>> = {};

function getInstanceOf<T extends BaseAdapter>(
  toolId: ToolId,
  Ctor: new () => T
): T {
  if (!instances[toolId]) {
    instances[toolId] = new Ctor();
  }
  return instances[toolId] as T;
}

export function getAllAdapters(): BaseAdapter[] {
  return [
    getInstanceOf("claude-code", ClaudeCodeAdapter),
    getInstanceOf("cursor", CursorAdapter),
    getInstanceOf("windsurf", WindsurfAdapter),
    getInstanceOf("opencode", OpenCodeAdapter),
    getInstanceOf("codex", CodexAdapter),
    getInstanceOf("agents-md", AgentsMdAdapter),
  ];
}

export function getAdapter(toolId: ToolId): BaseAdapter {
  switch (toolId) {
    case "claude-code":
      return getInstanceOf("claude-code", ClaudeCodeAdapter);
    case "cursor":
      return getInstanceOf("cursor", CursorAdapter);
    case "windsurf":
      return getInstanceOf("windsurf", WindsurfAdapter);
    case "opencode":
      return getInstanceOf("opencode", OpenCodeAdapter);
    case "codex":
      return getInstanceOf("codex", CodexAdapter);
    case "agents-md":
      return getInstanceOf("agents-md", AgentsMdAdapter);
    default:
      throw new Error(`No adapter found for tool: ${toolId}`);
  }
}

export interface LimitCheckResult {
  withinLimit: boolean;
  currentSize: number;
  maxSize: number;
  tool: ToolId;
}

export function checkCharacterLimit(
  content: string,
  toolId: ToolId,
  scope: "global" | "workspace"
): LimitCheckResult {
  const adapter = getAdapter(toolId);
  const maxSize = adapter.getCharacterLimit(scope);
  const currentSize = content.length;

  return {
    withinLimit: maxSize === null || currentSize <= maxSize,
    currentSize,
    maxSize: maxSize ?? Infinity,
    tool: toolId,
  };
}
