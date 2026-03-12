import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { DetectedTool, ToolId } from "./types";

const execAsync = promisify(exec);

const HOME = process.env.HOME || process.env.USERPROFILE || "~";

interface ToolCheck {
  id: ToolId;
  checks: Array<{
    type: "dir" | "file" | "binary";
    path: string;
  }>;
}

const TOOL_CHECKS: ToolCheck[] = [
  {
    id: "claude-code",
    checks: [
      { type: "dir", path: path.join(HOME, ".claude") },
      { type: "binary", path: "claude" },
    ],
  },
  {
    id: "cursor",
    checks: [
      { type: "binary", path: "cursor" },
      { type: "dir", path: path.join(HOME, ".cursor") },
    ],
  },
  {
    id: "windsurf",
    checks: [
      { type: "dir", path: path.join(HOME, ".codeium") },
      { type: "binary", path: "windsurf" },
    ],
  },
  {
    id: "opencode",
    checks: [
      { type: "dir", path: path.join(HOME, ".config", "opencode") },
      { type: "binary", path: "opencode" },
    ],
  },
  {
    id: "codex",
    checks: [
      { type: "dir", path: path.join(HOME, ".codex") },
      { type: "binary", path: "codex" },
    ],
  },
];

async function checkExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function checkBinary(name: string): Promise<boolean> {
  try {
    await execAsync(`which ${name}`);
    return true;
  } catch {
    return false;
  }
}

export async function detectTools(): Promise<DetectedTool[]> {
  const results: DetectedTool[] = [];

  for (const tool of TOOL_CHECKS) {
    let detected = false;
    let reason = "not found";

    for (const check of tool.checks) {
      if (check.type === "binary") {
        if (await checkBinary(check.path)) {
          detected = true;
          reason = `${check.path} binary on PATH`;
          break;
        }
      } else {
        if (await checkExists(check.path)) {
          detected = true;
          reason = `${check.path} found`;
          break;
        }
      }
    }

    if (!detected) {
      reason = `not found (checked: ${tool.checks.map((c) => c.path).join(", ")})`;
    }

    results.push({
      id: tool.id,
      detected,
      reason,
      globalPath: getGlobalPath(tool.id),
    });
  }

  // AGENTS.md is always "detected" — it's a universal format
  results.push({
    id: "agents-md",
    detected: true,
    reason: "universal cross-tool format (always available)",
  });

  return results;
}

export function getGlobalPath(toolId: ToolId): string | undefined {
  switch (toolId) {
    case "claude-code":
      return path.join(HOME, ".claude");
    case "cursor":
      return undefined; // Cursor global rules are UI-only
    case "windsurf":
      return path.join(HOME, ".codeium", "windsurf");
    case "opencode":
      return path.join(HOME, ".config", "opencode");
    case "codex":
      return path.join(HOME, ".codex");
    case "agents-md":
      return undefined;
  }
}
