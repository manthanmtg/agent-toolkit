"use server";

import fs from "fs/promises";
import path from "path";
import { loadAllSkills, loadSkill, getSkillsDir, getLocalSkillsDir } from "../registry";
import { getGlobalPath } from "../detector";
import { atomicWrite, isWithinPath } from "../safety";
import {
  buildSkillInstallPlan,
  executeSkillInstallPlan,
  loadSkillForInstall,
  toPublicInstallPreview,
  type BulkSkillInstallResult,
  type PublicSkillInstallPreview,
} from "../skill-installer";
import {
  BulkSkillInstallInputSchema,
  ConfirmedBulkSkillInstallInputSchema,
  CreateSkillInputSchema,
  InstallSkillInputSchema,
  UninstallSkillInputSchema,
  IdentifierSchema,
  TOOL_LABELS,
  type Skill,
  type SkillInstallRef,
  type ToolId,
} from "../types";
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

export async function listSkillsAction(): Promise<Skill[]> {
  try {
    return await loadAllSkills();
  } catch (err) {
    console.error(`Failed to load skills: ${formatError(err)}`);
    return [];
  }
}

export async function getSkillAction(
  domain: string,
  name: string
): Promise<Skill | null> {
  const domainParse = IdentifierSchema.safeParse(domain);
  const nameParse = IdentifierSchema.safeParse(name);

  if (!domainParse.success || !nameParse.success) {
    return null;
  }

  const validatedDomain = domainParse.data;
  const validatedName = nameParse.data;

  // Try toolkit skills first, then local skills
  const toolkitDir = path.join(getSkillsDir(), validatedDomain, validatedName);
  try {
    return await loadSkill(toolkitDir, "toolkit");
  } catch {
    // Not found in toolkit, try local
  }

  const localDir = path.join(getLocalSkillsDir(), validatedDomain, validatedName);
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

  const content = [
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
      await atomicWrite(path.join(skillDir, "SKILL.md"), content);
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
  const parseResult = InstallSkillInputSchema.safeParse({ domain, skillName, toolIds });
  if (!parseResult.success) {
    return {
      success: false,
      installed: [],
      errors: [formatError(parseResult.error)],
    };
  }

  const { domain: validatedDomain, skillName: validatedSkillName, toolIds: validatedToolIds } = parseResult.data;
  const errors: string[] = [];
  const supportedToolIds = validatedToolIds.filter((toolId) => toolId !== "agents-md");
  const unsupportedToolIds = validatedToolIds.filter((toolId) => toolId === "agents-md");

  let skillRef: SkillInstallRef;
  try {
    await loadSkillForInstall({
      source: "toolkit",
      domain: validatedDomain,
      skillName: validatedSkillName,
    });
    skillRef = {
      source: "toolkit",
      domain: validatedDomain,
      skillName: validatedSkillName,
    };
  } catch {
    try {
      await loadSkillForInstall({
        source: "local",
        domain: validatedDomain,
        skillName: validatedSkillName,
      });
      skillRef = {
        source: "local",
        domain: validatedDomain,
        skillName: validatedSkillName,
      };
    } catch {
      return { 
        success: false, 
        installed: [],
        errors: [`Skill not found in toolkit or local registry: ${validatedDomain}/${validatedSkillName}`] 
      };
    }
  }

  for (const toolId of unsupportedToolIds) {
    errors.push(`${TOOL_LABELS[toolId]}: adapter produced no output for this skill`);
  }

  if (supportedToolIds.length === 0) {
    return { success: false, installed: [], errors };
  }

  const result = await executeSkillInstallPlan(
    await buildSkillInstallPlan({
      skills: [skillRef],
      toolIds: supportedToolIds,
    }),
    true
  );

  const installed = result.skills[0]?.targets
    .filter((target) => target.status !== "failed")
    .map((target) => target.toolId) ?? [];
  errors.push(...result.errors);

  return { success: installed.length > 0, installed, errors };
}

export async function previewSkillsInstallAction(
  input: unknown
): Promise<
  | { success: true; preview: PublicSkillInstallPreview }
  | { success: false; error: string }
> {
  const parseResult = BulkSkillInstallInputSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: formatError(parseResult.error) };
  }

  try {
    const plan = await buildSkillInstallPlan(parseResult.data);
    return { success: true, preview: toPublicInstallPreview(plan) };
  } catch (err) {
    console.error(`Failed to preview bulk skill install: ${formatError(err)}`);
    return { success: false, error: formatError(err) };
  }
}

export async function installSkillsAction(
  input: unknown
): Promise<
  | { success: true; result: BulkSkillInstallResult }
  | { success: false; result: BulkSkillInstallResult; error?: string }
  | { success: false; error: string }
> {
  const parseResult = ConfirmedBulkSkillInstallInputSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: formatError(parseResult.error) };
  }

  try {
    const { confirmReplacements, ...installInput } = parseResult.data;
    const plan = await buildSkillInstallPlan(installInput);
    const result = await executeSkillInstallPlan(plan, confirmReplacements);
    if (result.status === "success") {
      return { success: true, result };
    }
    return { success: false, result, error: result.errors.join(", ") };
  } catch (err) {
    console.error(`Failed to install bulk skills: ${formatError(err)}`);
    return { success: false, error: formatError(err) };
  }
}

export async function uninstallSkillAction(
  skillName: string,
  toolIds: ToolId[]
): Promise<{ success: boolean; removed: string[]; errors: string[] }> {
  const parseResult = UninstallSkillInputSchema.safeParse({ skillName, toolIds });
  if (!parseResult.success) {
    return {
      success: false,
      removed: [],
      errors: [formatError(parseResult.error)],
    };
  }

  const { skillName: validatedSkillName, toolIds: validatedToolIds } = parseResult.data;
  const removed: string[] = [];
  const errors: string[] = [];

  const removalPaths: Record<ToolId, string[]> = {
    "claude-code": [`skills/${validatedSkillName}`],
    cursor: [`rules/${validatedSkillName}.mdc`],
    windsurf: [`rules/${validatedSkillName}.md`, `skills/${validatedSkillName}`],
    opencode: [`skills/${validatedSkillName}`],
    codex: [`skills/${validatedSkillName}`],
    "agents-md": [],
  };

  for (const toolId of validatedToolIds) {
    try {
      const globalPath = getGlobalPath(toolId);
      if (!globalPath) {
        errors.push(`${TOOL_LABELS[toolId]}: tool not detected or global path not configured`);
        continue;
      }

      const paths = removalPaths[toolId] ?? [];
      for (const rel of paths) {
        const fullPath = path.join(globalPath, rel);
        if (!isWithinPath(globalPath, fullPath)) {
          errors.push(`${TOOL_LABELS[toolId]}: security violation — refusing to remove outside global path: ${rel}`);
          continue;
        }

        try {
          // Check if it exists before trying to remove
          await fs.access(fullPath);
          await fs.rm(fullPath, { recursive: true, force: true });
          removed.push(`${TOOL_LABELS[toolId]}: ${rel}`);
        } catch (err) {
          if (isNodeErrnoException(err) && err.code === "ENOENT") {
            // Already gone, no error needed
            continue;
          }
          errors.push(`${TOOL_LABELS[toolId]}: failed to remove ${rel}: ${formatError(err)}`);
        }
      }
    } catch (err) {
      errors.push(`${TOOL_LABELS[toolId]}: ${formatError(err)}`);
    }
  }

  return { success: removed.length > 0 || errors.length === 0, removed, errors };
}

function isNodeErrnoException(value: unknown): value is NodeJS.ErrnoException {
  if (!(value instanceof Error)) return false;
  return "code" in value;
}
