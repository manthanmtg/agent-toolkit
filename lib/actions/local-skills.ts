"use server";

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { loadSkill, getLocalSkillsDir } from "../registry";
import { atomicWrite, backupFile } from "../safety";
import { SkillFrontmatterSchema } from "../types";
import type { Skill } from "../types";

const IDENTIFIER_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

import { CreateSkillInputSchema } from "../types";
import { ZodError } from "zod";

function formatError(err: unknown): string {
  if (err instanceof ZodError) {
    return err.errors.map((e) => e.message).join(", ");
  }
  if (err instanceof Error) return err.message || "Unknown error";
  return typeof err === "string" ? err : "Unknown error";
}

function validateIdentifier(type: string, value: string): string | null {
  if (!IDENTIFIER_RE.test(value)) {
    return `${type} must be lowercase letters, numbers, and hyphens (e.g. my-skill-name).`;
  }
  return null;
}

export async function createLocalSkillAction(
  domain: string,
  name: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const parseResult = CreateSkillInputSchema.safeParse({ domain, name, description });
  if (!parseResult.success) {
    return { success: false, error: formatError(parseResult.error) };
  }

  const validated = parseResult.data;
  const localDir = getLocalSkillsDir();
  const skillDir = path.join(localDir, validated.domain, validated.name);

  try {
    await fs.access(skillDir);
    return { success: false, error: `Local skill already exists at ${validated.domain}/${validated.name}` };
  } catch {
    // Does not exist yet
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
    return { success: false, error: `Failed to create local skill: ${formatError(err)}` };
  }
}

export async function getLocalSkillRawAction(
  domain: string,
  name: string
): Promise<{ content: string } | null> {
  const domainError = validateIdentifier("domain", domain);
  if (domainError) return null;

  const nameError = validateIdentifier("name", name);
  if (nameError) return null;

  const skillPath = path.join(getLocalSkillsDir(), domain, name, "SKILL.md");
  try {
    const content = await fs.readFile(skillPath, "utf-8");
    return { content };
  } catch {
    return null;
  }
}

export async function updateLocalSkillAction(
  domain: string,
  name: string,
  rawContent: string
): Promise<{ success: boolean; error?: string }> {
  const domainError = validateIdentifier("domain", domain);
  if (domainError) {
    return { success: false, error: `Invalid domain: ${domainError}` };
  }

  const nameError = validateIdentifier("name", name);
  if (nameError) {
    return { success: false, error: `Invalid name: ${nameError}` };
  }

  let parsed;
  try {
    parsed = matter(rawContent);
  } catch (err) {
    return { success: false, error: `Invalid frontmatter format: ${formatError(err)}` };
  }

  const { data } = parsed;
  try {
    SkillFrontmatterSchema.parse(data);
  } catch (err) {
    return { success: false, error: `Invalid frontmatter: ${formatError(err)}` };
  }

  const skillPath = path.join(getLocalSkillsDir(), domain, name, "SKILL.md");

  try {
    await fs.access(skillPath);
  } catch {
    return { success: false, error: `Local skill not found: ${domain}/${name}` };
  }

  try {
    await backupFile(skillPath);
    await atomicWrite(skillPath, rawContent);
    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to save: ${formatError(err)}` };
  }
}

export async function deleteLocalSkillAction(
  domain: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const domainError = validateIdentifier("domain", domain);
  if (domainError) {
    return { success: false, error: `Invalid domain: ${domainError}` };
  }

  const nameError = validateIdentifier("name", name);
  if (nameError) {
    return { success: false, error: `Invalid name: ${nameError}` };
  }

  const skillDir = path.join(getLocalSkillsDir(), domain, name);
  const skillPath = path.join(skillDir, "SKILL.md");

  try {
    await fs.access(skillPath);
  } catch {
    return { success: false, error: `Local skill not found: ${domain}/${name}` };
  }

  try {
    await backupFile(skillPath);
    await fs.rm(skillDir, { recursive: true, force: true });

    // Clean up empty domain directory
    const domainDir = path.join(getLocalSkillsDir(), domain);
    const remaining = await fs.readdir(domainDir).catch(() => []);
    if (remaining.length === 0) {
      await fs.rmdir(domainDir).catch(() => {});
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to delete: ${formatError(err)}` };
  }
}

export async function getLocalSkillAction(
  domain: string,
  name: string
): Promise<Skill | null> {
  const domainError = validateIdentifier("domain", domain);
  if (domainError) return null;

  const nameError = validateIdentifier("name", name);
  if (nameError) return null;

  const skillDir = path.join(getLocalSkillsDir(), domain, name);
  try {
    return await loadSkill(skillDir, "local");
  } catch {
    return null;
  }
}
