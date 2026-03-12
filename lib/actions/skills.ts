"use server";

import fs from "fs/promises";
import path from "path";
import { loadAllSkills, loadSkill, loadProfile, getSkillsDir } from "../registry";
import { getAdapter } from "../adapters";
import { getGlobalPath } from "../detector";
import { atomicWrite } from "../safety";
import type { Skill, ToolId } from "../types";

export async function listSkillsAction(): Promise<Skill[]> {
  return loadAllSkills();
}

export async function getSkillAction(
  domain: string,
  name: string
): Promise<Skill | null> {
  const skillDir = path.join(getSkillsDir(), domain, name);
  try {
    return await loadSkill(skillDir);
  } catch {
    return null;
  }
}

export async function createSkillAction(
  domain: string,
  name: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const skillDir = path.join(getSkillsDir(), domain, name);

  try {
    await fs.access(skillDir);
    return { success: false, error: `Skill already exists at ${domain}/${name}` };
  } catch {
    // Good — doesn't exist yet
  }

  const frontmatter = [
    "---",
    `name: ${name}`,
    `description: >`,
    `  ${description}`,
    `domain: ${domain}`,
    `version: 1.0.0`,
    `tags: []`,
    `author: ""`,
    "",
    "activation:",
    "  claude-code: model",
    "  cursor: auto",
    "  windsurf: model_decision",
    "  opencode: model",
    "  codex: auto",
    "---",
    "",
    `# ${name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`,
    "",
    "TODO: Add skill content here.",
    "",
  ].join("\n");

  try {
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), frontmatter, "utf-8");
    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to create skill: ${err}` };
  }
}

export async function installSkillAction(
  domain: string,
  skillName: string,
  toolIds: ToolId[]
): Promise<{ success: boolean; installed: string[]; errors: string[] }> {
  const installed: string[] = [];
  const errors: string[] = [];

  const skillDir = path.join(getSkillsDir(), domain, skillName);
  let skill: Skill;
  try {
    skill = await loadSkill(skillDir);
  } catch (err) {
    return { success: false, installed, errors: [`Skill not found: ${err}`] };
  }

  let profile;
  try {
    profile = await loadProfile("default");
  } catch {
    profile = { name: "default", description: "", include: ["*"], exclude: [], tools: {} };
  }

  for (const toolId of toolIds) {
    try {
      const adapter = getAdapter(toolId);
      const outputs = adapter.translateSkill(skill, profile);

      if (outputs.length === 0) {
        errors.push(`${toolId}: adapter produced no output for this skill`);
        continue;
      }

      const globalPath = getGlobalPath(toolId);

      for (const output of outputs) {
        let destPath: string;

        if (globalPath) {
          destPath = path.join(globalPath, output.relativePath);
        } else {
          errors.push(`${toolId}: no global path configured`);
          continue;
        }

        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await atomicWrite(destPath, output.content);
      }

      installed.push(toolId);
    } catch (err) {
      errors.push(`${toolId}: ${err}`);
    }
  }

  return { success: installed.length > 0, installed, errors };
}

export async function uninstallSkillAction(
  skillName: string,
  toolIds: ToolId[]
): Promise<{ success: boolean; removed: string[]; errors: string[] }> {
  const removed: string[] = [];
  const errors: string[] = [];

  const removalPaths: Record<ToolId, string[]> = {
    "claude-code": [`skills/${skillName}`],
    cursor: [`rules/${skillName}.mdc`],
    windsurf: [`rules/${skillName}.md`, `skills/${skillName}`],
    opencode: [`skills/${skillName}`],
    codex: [],
    "agents-md": [],
  };

  for (const toolId of toolIds) {
    const globalPath = getGlobalPath(toolId);
    if (!globalPath) continue;

    const paths = removalPaths[toolId] ?? [];
    for (const rel of paths) {
      const fullPath = path.join(globalPath, rel);
      try {
        await fs.rm(fullPath, { recursive: true, force: true });
        removed.push(`${toolId}:${rel}`);
      } catch (err) {
        errors.push(`${toolId}: failed to remove ${rel}: ${err}`);
      }
    }
  }

  return { success: removed.length > 0, removed, errors };
}
