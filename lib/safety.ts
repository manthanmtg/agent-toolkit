import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { Manifest, ManifestEntry, ToolId, SymlinkScope } from "./types";

const HOME = process.env.HOME || process.env.USERPROFILE || "~";
const BACKUP_DIR = path.join(HOME, ".agent-toolkit-backup");

// ── Atomic write ──────────────────────────────────────────────────
export async function atomicWrite(
  filePath: string,
  content: string
): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await fs.writeFile(tmpPath, content, "utf-8");
  await fs.rename(tmpPath, filePath);
}

// ── Backup ────────────────────────────────────────────────────────
export async function backupFile(filePath: string): Promise<string | null> {
  try {
    await fs.access(filePath);
  } catch {
    return null; // nothing to back up
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const relativeName = filePath.replace(HOME, "HOME").replace(/\//g, "__");
  const backupPath = path.join(BACKUP_DIR, `${relativeName}.${timestamp}`);

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  await fs.cp(filePath, backupPath, { recursive: true });
  return backupPath;
}

// ── JSON merge ────────────────────────────────────────────────────
export async function mergeJsonFile(
  filePath: string,
  toolkitKey: string,
  toolkitData: Record<string, unknown>
): Promise<{ merged: Record<string, unknown>; backedUp: boolean }> {
  let existing: Record<string, unknown> = {};
  let backedUp = false;

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    existing = JSON.parse(raw);
    await backupFile(filePath);
    backedUp = true;
  } catch {
    // File doesn't exist or isn't valid JSON — start fresh
  }

  const merged = {
    ...existing,
    [toolkitKey]: {
      ...((existing[toolkitKey] as Record<string, unknown>) || {}),
      ...toolkitData,
    },
  };

  await atomicWrite(filePath, JSON.stringify(merged, null, 2) + "\n");
  return { merged, backedUp };
}

// ── Duplicate detection ───────────────────────────────────────────
const TOOLKIT_MARKER = ".agent-toolkit";

export async function checkDuplicate(
  targetPath: string
): Promise<{ exists: boolean; isToolkitManaged: boolean }> {
  try {
    await fs.access(targetPath);
  } catch {
    return { exists: false, isToolkitManaged: false };
  }

  // Check if there's a marker file indicating toolkit ownership
  const markerPath = path.join(
    path.dirname(targetPath),
    TOOLKIT_MARKER
  );
  try {
    await fs.access(markerPath);
    return { exists: true, isToolkitManaged: true };
  } catch {
    return { exists: true, isToolkitManaged: false };
  }
}

export async function writeToolkitMarker(dirPath: string): Promise<void> {
  const markerPath = path.join(dirPath, TOOLKIT_MARKER);
  await atomicWrite(
    markerPath,
    JSON.stringify({ managedBy: "agent-toolkit", createdAt: new Date().toISOString() })
  );
}

// ── AGENTS.md merge ───────────────────────────────────────────────
const MARKER_START = "<!-- agent-toolkit:start -->";
const MARKER_END = "<!-- agent-toolkit:end -->";

export function mergeAgentsMd(
  existingContent: string,
  toolkitContent: string
): string {
  const newSection = `${MARKER_START}\n${toolkitContent}\n${MARKER_END}`;

  const startIdx = existingContent.indexOf(MARKER_START);
  const endIdx = existingContent.indexOf(MARKER_END);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing toolkit section
    return (
      existingContent.slice(0, startIdx) +
      newSection +
      existingContent.slice(endIdx + MARKER_END.length)
    );
  }

  // Append new section
  const separator = existingContent.trim() ? "\n\n" : "";
  return existingContent.trimEnd() + separator + newSection + "\n";
}

// ── Checksum ──────────────────────────────────────────────────────
export function computeChecksum(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// ── Manifest ──────────────────────────────────────────────────────
export async function loadManifest(distDir: string): Promise<Manifest> {
  const manifestPath = path.join(distDir, ".manifest.json");
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { version: "1.0", updatedAt: new Date().toISOString(), entries: [] };
  }
}

export async function saveManifest(
  distDir: string,
  manifest: Manifest
): Promise<void> {
  manifest.updatedAt = new Date().toISOString();
  const manifestPath = path.join(distDir, ".manifest.json");
  await atomicWrite(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

export function addManifestEntry(
  manifest: Manifest,
  entry: Omit<ManifestEntry, "createdAt">
): void {
  // Remove existing entry for same destPath
  manifest.entries = manifest.entries.filter(
    (e) => e.destPath !== entry.destPath
  );
  manifest.entries.push({
    ...entry,
    createdAt: new Date().toISOString(),
  });
}

// ── Character limit check ─────────────────────────────────────────
export interface LimitCheckResult {
  withinLimit: boolean;
  currentSize: number;
  maxSize: number;
  tool: string;
}

export function checkCharacterLimit(
  content: string,
  tool: ToolId,
  scope: "global" | "workspace"
): LimitCheckResult {
  const limits: Record<string, Record<string, number>> = {
    windsurf: { global: 6000, workspace: 12000 },
    opencode: { global: Infinity, workspace: 1024 }, // description limit
    codex: { global: 32768, workspace: 32768 },
  };

  const toolLimits = limits[tool];
  if (!toolLimits) {
    return { withinLimit: true, currentSize: content.length, maxSize: Infinity, tool };
  }

  const maxSize = toolLimits[scope] ?? Infinity;
  return {
    withinLimit: content.length <= maxSize,
    currentSize: content.length,
    maxSize,
    tool,
  };
}
