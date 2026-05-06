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

export function getAllAdapters(): BaseAdapter[] {
  return [
    new ClaudeCodeAdapter(),
    new CursorAdapter(),
    new WindsurfAdapter(),
    new OpenCodeAdapter(),
    new CodexAdapter(),
    new AgentsMdAdapter(),
  ];
}

export function getAdapter(toolId: ToolId): BaseAdapter {
  const adapters = getAllAdapters();
  const adapter = adapters.find((a) => a.toolId === toolId);
  if (!adapter) throw new Error(`No adapter found for tool: ${toolId}`);
  return adapter;
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
