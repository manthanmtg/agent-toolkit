"use server";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { ZodError, z } from "zod";
import { detectTools, getGlobalPath } from "../detector";
import { loadAllSkills, loadProfile } from "../registry";
import { getAdapter } from "../adapters";
import { atomicWrite, HOME, isWithinPath, checkDuplicate, backupFile, writeToolkitMarker } from "../safety";
import { TOOL_IDS, IdentifierSchema, ToolIdSchema, type Skill, type ToolId, type Profile } from "../types";

function formatError(err: unknown): string {
  if (err instanceof ZodError) {
    return err.errors.map((e) => e.message).join(", ");
  }
  if (err instanceof Error) {
    return err.message || "Unknown error";
  }
  if (typeof err === "string") {
    return err;
  }
  return "Unknown error";
}

export type DeployedSkillStatus = "up-to-date" | "outdated" | "unknown";
export type DeploymentModel = "per-skill" | "bundled" | "project-only";

export type SkillSource = "native" | "cross-agent";

export interface DeployedSkill {
  name: string;
  domain: string | null;
  status: DeployedSkillStatus;
  deployedPath: string;
  source: SkillSource;
  sharedFrom: string | null;
}

export interface ToolDeployment {
  toolId: ToolId;
  detected: boolean;
  globalPath: string | null;
  globalPathDisplay: string | null;
  deploymentModel: DeploymentModel;
  note: string | null;
  skills: DeployedSkill[];
}

export interface DeployedSkillsResult {
  tools: ToolDeployment[];
  registrySkills: Array<{ name: string; domain: string }>;
}

// Tools that support per-skill global files and can be scanned individually.
// Other tools either bundle into a single file or are project-only.
interface ScanPattern {
  dir: string;
  nameExtractor: (entry: string) => string;
}

const PER_SKILL_TOOLS: Partial<Record<ToolId, ScanPattern[]>> = {
  "claude-code": [
    { dir: "skills", nameExtractor: (entry) => entry },
  ],
  cursor: [
    { dir: "skills", nameExtractor: (entry) => entry },
  ],
  windsurf: [
    { dir: "skills", nameExtractor: (entry) => entry },
  ],
  opencode: [
    { dir: "skills", nameExtractor: (entry) => entry },
  ],
};

// Cross-agent compatibility paths — tools that read skills from other tools' directories.
// Key is the reading tool, value is an array of { sourceToolLabel, absolutePath }.
function getCrossAgentPaths(home: string): Partial<Record<ToolId, Array<{ label: string; path: string }>>> {
  return {
    cursor: [
      { label: "Claude Code", path: path.join(home, ".claude", "skills") },
    ],
    windsurf: [
      { label: "Claude Code", path: path.join(home, ".claude", "skills") },
    ],
  };
}

// Tools that merge all skills into a single output file (no per-skill global files).
const BUNDLED_TOOLS: Partial<Record<ToolId, { file: string; description: string }>> = {
  codex: {
    file: "AGENTS.md",
    description: "Codex reads a single AGENTS.md file. All skills are merged into this one file via the Sync flow. Individual skill management requires a full rebuild.",
  },
};

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex").slice(0, 16);
}

async function scanToolDirectory(
  globalPath: string,
  patterns: ScanPattern[]
): Promise<Map<string, string>> {
  const found = new Map<string, string>();

  await Promise.all(
    patterns.map(async (pattern) => {
      const scanDir = path.join(globalPath, pattern.dir);
      try {
        const entries = await fs.readdir(scanDir);
        await Promise.all(
          entries.map(async (entry) => {
            if (entry.startsWith(".")) return;
            const fullPath = path.join(scanDir, entry);
            const stat = await fs.stat(fullPath).catch(() => null);
            if (!stat) return;

            const skillName = pattern.nameExtractor(entry);
            if (!skillName) return;

            let content: string | null = null;

            if (stat.isDirectory()) {
              const skillFile = path.join(fullPath, "SKILL.md");
              content = await fs.readFile(skillFile, "utf-8").catch(() => null);
            } else if (stat.isFile()) {
              content = await fs.readFile(fullPath, "utf-8").catch(() => null);
            }

            if (content !== null) {
              found.set(skillName, hashContent(content));
            }
          })
        );
      } catch {
        // Directory doesn't exist
      }
    })
  );

  return found;
}

async function scanSkillsDir(skillsDir: string): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  try {
    const entries = await fs.readdir(skillsDir);
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.startsWith(".")) return;
        const skillFile = path.join(skillsDir, entry, "SKILL.md");
        const content = await fs.readFile(skillFile, "utf-8").catch(() => null);
        if (content !== null) {
          found.set(entry, hashContent(content));
        }
      })
    );
  } catch {
    // Directory doesn't exist
  }
  return found;
}

function buildExpectedHashes(
  skills: Skill[],
  toolId: ToolId,
  profile: Profile,
  scanDir: string
): Map<string, { hash: string; domain: string }> {
  const result = new Map<string, { hash: string; domain: string }>();

  try {
    const adapter = getAdapter(toolId);
    for (const skill of skills) {
      const outputs = adapter.translateSkill(skill, profile);
      // Match the output whose path starts with the scanned directory
      const match = outputs.find((o) => o.relativePath.startsWith(scanDir + "/")) ?? outputs[0];
      if (match) {
        const hash = hashContent(match.content);
        result.set(skill.skillName, { hash, domain: skill.domain });
      }
    }
  } catch {
    // Adapter not available
  }

  return result;
}

export async function getDeployedSkillsPerTool(): Promise<DeployedSkillsResult> {
  const [detectedTools, allSkills] = await Promise.all([
    detectTools(),
    loadAllSkills(),
  ]);

  let profile: Profile;
  try {
    profile = await loadProfile("default");
  } catch {
    profile = { name: "default", description: "", include: ["*"], exclude: [], tools: {} };
  }

  const toolsToScan = TOOL_IDS.filter((id) => id !== "agents-md");

  // Pre-calculate expected hashes for native and cross-agent skills
  const expectedByTool = new Map<ToolId, Map<string, { hash: string; domain: string }>>();
  for (const toolId of TOOL_IDS) {
    expectedByTool.set(toolId, buildExpectedHashes(allSkills, toolId, profile, "skills"));
  }

  const tools: ToolDeployment[] = await Promise.all(
    toolsToScan.map(async (toolId) => {
      const detected = detectedTools.find((t) => t.id === toolId);
      const isDetected = detected?.detected ?? false;
      const globalPath = getGlobalPath(toolId) ?? null;
      const globalPathDisplay = globalPath ? globalPath.replace(HOME, "~") : null;

      // Bundled tools (all skills merged into one file)
      const bundledInfo = BUNDLED_TOOLS[toolId];
      if (bundledInfo) {
        return {
          toolId,
          detected: isDetected,
          globalPath,
          globalPathDisplay,
          deploymentModel: "bundled",
          note: bundledInfo.description,
          skills: [],
        };
      }

      // Undetected tools
      if (!globalPath || !isDetected) {
        return {
          toolId,
          detected: isDetected,
          globalPath,
          globalPathDisplay,
          deploymentModel: "per-skill",
          note: null,
          skills: [],
        };
      }

      // Per-skill tools — scan and diff
      const patterns = PER_SKILL_TOOLS[toolId];
      if (!patterns) {
        return {
          toolId,
          detected: true,
          globalPath,
          globalPathDisplay,
          deploymentModel: "per-skill",
          note: null,
          skills: [],
        };
      }

      const deployedMap = await scanToolDirectory(globalPath, patterns);
      const expectedMap = expectedByTool.get(toolId)!;

      const skills: DeployedSkill[] = [];

      for (const [skillName, deployedHash] of deployedMap) {
        const expected = expectedMap.get(skillName);
        let status: DeployedSkillStatus;

        if (!expected) {
          status = "unknown";
        } else if (deployedHash === expected.hash) {
          status = "up-to-date";
        } else {
          status = "outdated";
        }

        skills.push({
          name: skillName,
          domain: expected?.domain ?? null,
          status,
          deployedPath: path.join(globalPath, "skills", skillName),
          source: "native",
          sharedFrom: null,
        });
      }

      // Cross-agent: scan other tools' directories that this tool reads
      const crossAgentPaths = getCrossAgentPaths(HOME);
      const crossPaths = crossAgentPaths[toolId] ?? [];
      const nativeNames = new Set(skills.map((s) => s.name));

      // Use pre-calculated Claude Code hashes for cross-agent skills
      const crossExpected = expectedByTool.get("claude-code")!;

      const crossResults = await Promise.all(
        crossPaths.map(async (cross) => {
          const crossMap = await scanSkillsDir(cross.path);
          const results: DeployedSkill[] = [];
          for (const [skillName, deployedHash] of crossMap) {
            if (nativeNames.has(skillName)) continue;

            const expected = crossExpected.get(skillName);
            let status: DeployedSkillStatus;

            if (!expected) {
              status = "unknown";
            } else if (deployedHash === expected.hash) {
              status = "up-to-date";
            } else {
              status = "outdated";
            }

            results.push({
              name: skillName,
              domain: expected?.domain ?? null,
              status,
              deployedPath: path.join(cross.path, skillName),
              source: "cross-agent",
              sharedFrom: cross.label,
            });
          }
          return results;
        })
      );

      for (const res of crossResults) {
        skills.push(...res);
      }

      skills.sort((a, b) => {
        const order: Record<DeployedSkillStatus, number> = {
          outdated: 0,
          unknown: 1,
          "up-to-date": 2,
        };
        return order[a.status] - order[b.status] || a.name.localeCompare(b.name);
      });

      return {
        toolId,
        detected: true,
        globalPath,
        globalPathDisplay,
        deploymentModel: "per-skill",
        note: null,
        skills,
      } as ToolDeployment;
    })
  );

  const registrySkills = allSkills.map((s) => ({
    name: s.skillName,
    domain: s.domain,
  }));

  return { tools, registrySkills };
}

const UpdateDeployedSkillSchema = z.object({
  domain: IdentifierSchema,
  skillName: IdentifierSchema,
  toolId: ToolIdSchema,
});

export async function updateDeployedSkillAction(
  domain: string,
  skillName: string,
  toolId: ToolId
): Promise<{ success: boolean; error?: string }> {
  const parseResult = UpdateDeployedSkillSchema.safeParse({ domain, skillName, toolId });
  if (!parseResult.success) {
    return { success: false, error: formatError(parseResult.error) };
  }
  const validated = parseResult.data;

  const globalPath = getGlobalPath(validated.toolId);
  if (!globalPath) {
    return { success: false, error: `No global path for ${validated.toolId}` };
  }

  if (BUNDLED_TOOLS[validated.toolId]) {
    return { success: false, error: `${validated.toolId} uses a bundled file. Use Sync to update all skills.` };
  }

  try {
    const allSkills = await loadAllSkills();
    const skill = allSkills.find((s) => s.skillName === validated.skillName && s.domain === validated.domain);
    if (!skill) {
      return { success: false, error: `Skill ${validated.domain}/${validated.skillName} not found in registry` };
    }

    let profile: Profile;
    try {
      profile = await loadProfile("default");
    } catch {
      profile = { name: "default", description: "", include: ["*"], exclude: [], tools: {} };
    }

    const adapter = getAdapter(validated.toolId);
    const outputs = adapter.translateSkill(skill, profile);

    for (const output of outputs) {
      const destPath = path.join(globalPath, output.relativePath);
      if (!isWithinPath(globalPath, destPath)) {
        return { success: false, error: `Security violation: refusing to write outside global path: ${output.relativePath}` };
      }

      const dup = await checkDuplicate(destPath);
      if (dup.exists && !dup.isToolkitManaged) {
        try {
          await backupFile(destPath);
        } catch (err) {
          console.warn(`Backup failed for ${destPath}: ${err}`);
        }
      }
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await atomicWrite(destPath, output.content);
      try {
        await writeToolkitMarker(path.dirname(destPath));
      } catch {}
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: formatError(err) };
  }
}

export async function addSkillToToolAction(
  domain: string,
  skillName: string,
  toolId: ToolId
): Promise<{ success: boolean; error?: string }> {
  return updateDeployedSkillAction(domain, skillName, toolId);
}

const RemoveSkillFromToolSchema = z.object({
  skillName: IdentifierSchema,
  toolId: ToolIdSchema,
});

function isNodeErrnoException(value: unknown): value is NodeJS.ErrnoException {
  if (!(value instanceof Error)) return false;
  return "code" in value;
}

export async function removeSkillFromToolAction(
  skillName: string,
  toolId: ToolId
): Promise<{ success: boolean; error?: string }> {
  const parseResult = RemoveSkillFromToolSchema.safeParse({ skillName, toolId });
  if (!parseResult.success) {
    return { success: false, error: formatError(parseResult.error) };
  }
  const validated = parseResult.data;

  const globalPath = getGlobalPath(validated.toolId);
  if (!globalPath) {
    return { success: false, error: `No global path for ${validated.toolId}` };
  }

  if (BUNDLED_TOOLS[validated.toolId]) {
    return { success: false, error: `${validated.toolId} uses a bundled file. Use Sync to rebuild.` };
  }

  const removalPaths: Partial<Record<ToolId, string[]>> = {
    "claude-code": [`skills/${validated.skillName}`],
    cursor: [`skills/${validated.skillName}`],
    windsurf: [`skills/${validated.skillName}`],
    opencode: [`skills/${validated.skillName}`],
  };

  const paths = removalPaths[validated.toolId] ?? [];
  if (paths.length === 0) {
    return { success: false, error: `Cannot remove individual skills from ${validated.toolId}` };
  }

  try {
    for (const rel of paths) {
      const fullPath = path.join(globalPath, rel);
      try {
        await fs.access(fullPath);
        await fs.rm(fullPath, { recursive: true, force: true });
      } catch (err) {
        if (isNodeErrnoException(err) && err.code === "ENOENT") {
          continue; // Already removed
        }
        throw err;
      }
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: formatError(err) };
  }
}
