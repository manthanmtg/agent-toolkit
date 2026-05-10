"use server";

import fs from "fs/promises";
import path from "path";
import { loadAllSkills, loadSkill, loadProfile, getSkillsDir, getLocalSkillsDir } from "../registry";
import { getAdapter, checkCharacterLimit } from "../adapters";
import { getGlobalPath } from "../detector";
import { atomicWrite, isWithinPath, HOME } from "../safety";
import type { Skill, ToolId } from "../types";

const IDENTIFIER_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

import { CreateSkillInputSchema } from "../types";
import { ZodError } from "zod";

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

function validateIdentifier(type: string, value: string): string | null {
  if (!IDENTIFIER_RE.test(value)) {
    return `${type} must be lowercase letters, numbers, and hyphens (e.g. my-skill-name).`;
  }
  return null;
}

export async function listSkillsAction(): Promise<Skill[]> {
  return loadAllSkills();
}

export async function getSkillAction(
  domain: string,
  name: string
): Promise<Skill | null> {
  const domainError = validateIdentifier("domain", domain);
  if (domainError) return null;

  const nameError = validateIdentifier("name", name);
  if (nameError) return null;

  // Try toolkit skills first, then local skills
  const toolkitDir = path.join(getSkillsDir(), domain, name);
  try {
    return await loadSkill(toolkitDir, "toolkit");
  } catch {
    // Not found in toolkit, try local
  }

  const localDir = path.join(getLocalSkillsDir(), domain, name);
  try {
    return await loadSkill(localDir, "local");
  } catch {
    return null;
  }
}

export async function createSkillAction(
  domain: string,
  name: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const parseResult = CreateSkillInputSchema.safeParse({ domain, name, description });
  if (!parseResult.success) {
    return { success: false, error: formatError(parseResult.error) };
  }

  const validated = parseResult.data;
  const skillDir = path.join(getSkillsDir(), validated.domain, validated.name);

  try {
    await fs.access(skillDir);
    return { success: false, error: `Skill already exists at ${validated.domain}/${validated.name}` };
  } catch {
    // Good — doesn't exist yet
  }

  const indentedDesc = validated.description
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");

  const frontmatter = [
    "---",
    `name: ${validated.name}`,
    `description: |`,
    indentedDesc,
    `domain: ${validated.domain}`,
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
    `# ${validated.name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`,
    "",
    "TODO: Add skill content here.",
    "",
  ].join("\n");

  try {
    await fs.mkdir(skillDir, { recursive: true });
    try {
      await atomicWrite(path.join(skillDir, "SKILL.md"), frontmatter);
      return { success: true };
    } catch (err) {
      // Clean up the directory if file creation fails
      await fs.rm(skillDir, { recursive: true, force: true }).catch(() => {});
      throw err;
    }
  } catch (err) {
    return { success: false, error: `Failed to create skill: ${formatError(err)}` };
  }
}

export async function installSkillAction(
  domain: string,
  skillName: string,
  toolIds: ToolId[]
): Promise<{ success: boolean; installed: ToolId[]; errors: string[] }> {
  const domainError = validateIdentifier("domain", domain);
  if (domainError) {
    return {
      success: false,
      installed: [],
      errors: [`Invalid domain: ${domainError}`],
    };
  }

  const nameError = validateIdentifier("name", skillName);
  if (nameError) {
    return {
      success: false,
      installed: [],
      errors: [`Invalid skill name: ${nameError}`],
    };
  }

  const installed: ToolId[] = [];
  const errors: string[] = [];

  let skill: Skill | null = null;

  const toolkitDir = path.join(getSkillsDir(), domain, skillName);
  try {
    skill = await loadSkill(toolkitDir, "toolkit");
  } catch {
    const localDir = path.join(getLocalSkillsDir(), domain, skillName);
    try {
      skill = await loadSkill(localDir, "local");
    } catch (err) {
      return { success: false, installed, errors: [`Skill not found: ${formatError(err)}`] };
    }
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
          if (!isWithinPath(globalPath, destPath)) {
            errors.push(`${toolId}: security violation — refusing to write outside global path: ${output.relativePath}`);
            continue;
          }
        } else {
          errors.push(`${toolId}: no global path configured`);
          continue;
        }

        if (output.scope) {
          const limitCheck = checkCharacterLimit(
            output.content,
            output.tool,
            output.scope
          );
          if (!limitCheck.withinLimit) {
            errors.push(
              `${toolId}: ${output.relativePath} exceeds ${output.scope} limit (${limitCheck.currentSize} > ${limitCheck.maxSize} chars)`
            );
          }
        }

        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await atomicWrite(destPath, output.content);
      }

      installed.push(toolId);
    } catch (err) {
      errors.push(`${toolId}: ${formatError(err)}`);
    }
  }

  return { success: installed.length > 0, installed, errors };
}

export async function uninstallSkillAction(
  skillName: string,
  toolIds: ToolId[]
): Promise<{ success: boolean; removed: string[]; errors: string[] }> {
  const nameError = validateIdentifier("skill name", skillName);
  if (nameError) {
    return {
      success: false,
      removed: [],
      errors: [`Invalid skill name: ${nameError}`],
    };
  }

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
