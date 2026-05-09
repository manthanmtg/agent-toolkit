"use server";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { detectTools, getGlobalPath } from "../detector";
import { loadAllSkills, loadProfile } from "../registry";
import { getAdapter } from "../adapters";
import { atomicWrite } from "../safety";
import type { Skill, ToolId, Profile } from "../types";
import { TOOL_IDS } from "../types";

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

  const home = process.env.HOME || process.env.USERPROFILE || "~";
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
      const globalPathDisplay = globalPath ? globalPath.replace(home, "~") : null;

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
      const crossAgentPaths = getCrossAgentPaths(home);
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

export async function updateDeployedSkillAction(
  domain: string,
  skillName: string,
  toolId: ToolId
): Promise<{ success: boolean; error?: string }> {
  const globalPath = getGlobalPath(toolId);
  if (!globalPath) {
    return { success: false, error: `No global path for ${toolId}` };
  }

  if (BUNDLED_TOOLS[toolId]) {
    return { success: false, error: `${toolId} uses a bundled file. Use Sync to update all skills.` };
  }

  try {
    const allSkills = await loadAllSkills();
    const skill = allSkills.find((s) => s.skillName === skillName && s.domain === domain);
    if (!skill) {
      return { success: false, error: `Skill ${domain}/${skillName} not found in registry` };
    }

    let profile: Profile;
    try {
      profile = await loadProfile("default");
    } catch {
      profile = { name: "default", description: "", include: ["*"], exclude: [], tools: {} };
    }

    const adapter = getAdapter(toolId);
    const outputs = adapter.translateSkill(skill, profile);

    for (const output of outputs) {
      const destPath = path.join(globalPath, output.relativePath);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await atomicWrite(destPath, output.content);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function addSkillToToolAction(
  domain: string,
  skillName: string,
  toolId: ToolId
): Promise<{ success: boolean; error?: string }> {
  return updateDeployedSkillAction(domain, skillName, toolId);
}

export async function removeSkillFromToolAction(
  skillName: string,
  toolId: ToolId
): Promise<{ success: boolean; error?: string }> {
  const globalPath = getGlobalPath(toolId);
  if (!globalPath) {
    return { success: false, error: `No global path for ${toolId}` };
  }

  if (BUNDLED_TOOLS[toolId]) {
    return { success: false, error: `${toolId} uses a bundled file. Use Sync to rebuild.` };
  }

  const removalPaths: Partial<Record<ToolId, string[]>> = {
    "claude-code": [`skills/${skillName}`],
    cursor: [`skills/${skillName}`],
    windsurf: [`skills/${skillName}`],
    opencode: [`skills/${skillName}`],
  };

  const paths = removalPaths[toolId] ?? [];
  if (paths.length === 0) {
    return { success: false, error: `Cannot remove individual skills from ${toolId}` };
  }

  try {
    for (const rel of paths) {
      await fs.rm(path.join(globalPath, rel), { recursive: true, force: true });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
