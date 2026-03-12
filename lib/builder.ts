import fs from "fs/promises";
import path from "path";
import { loadAllSkills, loadProfile, filterSkillsByProfile, getRepoRoot } from "./registry";
import { getAllAdapters } from "./adapters";
import { atomicWrite, computeChecksum, loadManifest, saveManifest, addManifestEntry } from "./safety";
import type { OutputFile, Manifest } from "./types";

const DIST_DIR = path.join(getRepoRoot(), "dist");

export interface BuildResult {
  profile: string;
  totalSkills: number;
  totalFiles: number;
  filesByTool: Record<string, number>;
  errors: string[];
}

export async function build(profileName: string = "default"): Promise<BuildResult> {
  const result: BuildResult = {
    profile: profileName,
    totalSkills: 0,
    totalFiles: 0,
    filesByTool: {},
    errors: [],
  };

  let profile;
  try {
    profile = await loadProfile(profileName);
  } catch (err) {
    result.errors.push(`Failed to load profile "${profileName}": ${err}`);
    return result;
  }

  const allSkills = await loadAllSkills();
  const skills = filterSkillsByProfile(allSkills, profile);
  result.totalSkills = skills.length;

  const adapters = getAllAdapters();
  const allOutputs: OutputFile[] = [];

  for (const adapter of adapters) {
    const toolConfig = profile.tools?.[adapter.toolId];
    if (toolConfig && toolConfig.enabled === false) continue;

    try {
      // Per-skill outputs
      for (const skill of skills) {
        const outputs = adapter.translateSkill(skill, profile);
        allOutputs.push(...outputs);
      }

      // Global outputs
      const globalOutputs = adapter.translateGlobal(skills, profile);
      allOutputs.push(...globalOutputs);
    } catch (err) {
      result.errors.push(`Adapter ${adapter.toolId} failed: ${err}`);
    }
  }

  // Write all output files
  const manifest = await loadManifest(DIST_DIR);

  for (const output of allOutputs) {
    const fullPath = path.join(DIST_DIR, output.tool, output.relativePath);
    try {
      await atomicWrite(fullPath, output.content);
      addManifestEntry(manifest, {
        sourcePath: output.relativePath,
        destPath: fullPath,
        checksum: computeChecksum(output.content),
        tool: output.tool,
        scope: "global",
      });

      result.filesByTool[output.tool] = (result.filesByTool[output.tool] || 0) + 1;
      result.totalFiles++;
    } catch (err) {
      result.errors.push(`Failed to write ${fullPath}: ${err}`);
    }
  }

  await saveManifest(DIST_DIR, manifest);

  return result;
}

export async function getDistDir(): Promise<string> {
  return DIST_DIR;
}

export async function cleanDist(): Promise<void> {
  try {
    await fs.rm(DIST_DIR, { recursive: true, force: true });
  } catch {
    // Already clean
  }
}
