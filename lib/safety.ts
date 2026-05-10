import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import os from "os";
import type { Manifest, ManifestEntry, ToolId, SymlinkScope } from "./types";

export const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir() || "~";
const BACKUP_DIR = path.join(HOME, ".agent-toolkit-backup");

/**
 * Ensures a path is within a specific base directory.
 * Used to prevent path traversal vulnerabilities.
 */
export function isWithinPath(base: string, target: string): boolean {
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(target);
  
  // Ensure the base has a trailing separator to prevent matching /foo against /foobar
  const baseWithSep = resolvedBase.endsWith(path.sep) ? resolvedBase : `${resolvedBase}${path.sep}`;
  
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(baseWithSep);
}

// ── Atomic write ──────────────────────────────────────────────────
export async function atomicWrite(
  filePath: string,
  content: string
): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp.${crypto.randomUUID()}`;
  try {
    await fs.writeFile(tmpPath, content, "utf-8");
    await fs.rename(tmpPath, filePath);
  } catch (err) {
    try {
      await fs.unlink(tmpPath);
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}

// ── Backup ────────────────────────────────────────────────────────
export async function backupFile(filePath: string): Promise<string | null> {
  try {
    await fs.access(filePath);
  } catch {
    return null; // nothing to back up
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  // Robust replacement of path separators for the backup filename
  const relativeName = filePath
    .replace(HOME, "HOME")
    .split(/[/\\]/)
    .filter(Boolean)
    .join("__");
    
  const backupPath = path.join(BACKUP_DIR, `${relativeName}.${timestamp}`);

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  await fs.cp(filePath, backupPath, { recursive: true });
  return backupPath;
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

// ── Character limit check moved to lib/adapters/index.ts ──

