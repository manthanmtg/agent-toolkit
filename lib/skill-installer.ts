import fs from "fs/promises";
import path from "path";
import { checkCharacterLimit, getAdapter } from "./adapters";
import { getGlobalPath } from "./detector";
import { getLocalSkillsDir, getSkillsDir, loadProfile, loadSkill } from "./registry";
import {
  atomicWrite,
  backupFile,
  HOME,
  isWithinPath,
  writeToolkitMarker,
} from "./safety";
import {
  BulkSkillInstallInputSchema,
  TOOL_LABELS,
  type BulkSkillInstallInput,
  type OutputFile,
  type Profile,
  type Skill,
  type SkillInstallRef,
  type ToolId,
} from "./types";

type InstallDisposition = "create" | "replace-existing" | "blocked";
type TargetInstallStatus = "installed" | "partial" | "failed";

interface InstallPlanEntry {
  id: string;
  skill: SkillInstallRef;
  toolId: ToolId;
  relativePath: string;
  displayPath: string;
  destinationPath: string | null;
  content: string | null;
  scope?: OutputFile["scope"];
  disposition: InstallDisposition;
  blockers: string[];
}

export interface SkillInstallPlan {
  input: BulkSkillInstallInput;
  entries: InstallPlanEntry[];
}

export interface PublicSkillInstallPreview {
  okToInstall: boolean;
  summary: {
    requestedSkills: number;
    requestedTools: number;
    createFiles: number;
    replaceFiles: number;
    blockers: number;
  };
  entries: Array<{
    skill: SkillInstallRef;
    toolId: ToolId;
    relativePath: string;
    displayPath: string;
    disposition: InstallDisposition;
    blockers: string[];
  }>;
}

export interface BulkSkillInstallResult {
  status: "success" | "partial" | "failed";
  summary: {
    requestedSkills: number;
    requestedTools: number;
    installedTargets: number;
    partialTargets: number;
    failedTargets: number;
    filesWritten: number;
  };
  skills: Array<{
    skill: SkillInstallRef;
    status: TargetInstallStatus;
    targets: Array<{
      toolId: ToolId;
      status: TargetInstallStatus;
      filesWritten: number;
      warnings: string[];
      errors: string[];
    }>;
  }>;
  errors: string[];
}

export async function loadSkillForInstall(ref: SkillInstallRef): Promise<Skill> {
  const baseDir = ref.source === "local" ? getLocalSkillsDir() : getSkillsDir();
  const skillDir = path.join(baseDir, ref.domain, ref.skillName);
  try {
    return await loadSkill(skillDir, ref.source);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Skill not found in ${ref.source} registry: ${formatSkillRef(ref)} (${message})`
    );
  }
}

export async function buildSkillInstallPlan(
  rawInput: BulkSkillInstallInput
): Promise<SkillInstallPlan> {
  const input = BulkSkillInstallInputSchema.parse(rawInput);
  const profile = await loadDefaultProfile();
  const entries: InstallPlanEntry[] = [];

  for (const ref of input.skills) {
    let skill: Skill;
    try {
      skill = await loadSkillForInstall(ref);
    } catch (err) {
      for (const toolId of input.toolIds) {
        entries.push(blockedEntry(ref, toolId, formatError(err)));
      }
      continue;
    }

    for (const toolId of input.toolIds) {
      entries.push(...await buildEntriesForSkillTool(ref, skill, toolId, profile));
    }
  }

  addDestinationCollisionBlockers(entries);

  return { input, entries };
}

export function toPublicInstallPreview(
  plan: SkillInstallPlan
): PublicSkillInstallPreview {
  const blockerCount = plan.entries.reduce(
    (count, entry) => count + entry.blockers.length,
    0
  );

  return {
    okToInstall: blockerCount === 0,
    summary: {
      requestedSkills: plan.input.skills.length,
      requestedTools: plan.input.toolIds.length,
      createFiles: plan.entries.filter((entry) => entry.disposition === "create").length,
      replaceFiles: plan.entries.filter((entry) => entry.disposition === "replace-existing").length,
      blockers: blockerCount,
    },
    entries: plan.entries.map((entry) => ({
      skill: entry.skill,
      toolId: entry.toolId,
      relativePath: entry.relativePath,
      displayPath: entry.displayPath,
      disposition: entry.disposition,
      blockers: [...entry.blockers],
    })),
  };
}

export async function executeSkillInstallPlan(
  plan: SkillInstallPlan,
  confirmReplacements: boolean
): Promise<BulkSkillInstallResult> {
  const preview = toPublicInstallPreview(plan);
  if (preview.summary.blockers > 0) {
    return failedBeforeWrite(plan, previewEntriesToErrors(preview));
  }

  if (preview.summary.replaceFiles > 0 && !confirmReplacements) {
    return failedBeforeWrite(plan, [
      "Replacement confirmation is required before existing destinations can be overwritten.",
    ]);
  }

  const targetResults = initializeTargetResults(plan.input);

  for (const entry of plan.entries) {
    const target = getTargetResult(targetResults, entry.skill, entry.toolId);
    if (!entry.destinationPath || entry.content === null) {
      target.errors.push(`${TOOL_LABELS[entry.toolId]}: no output destination for ${formatSkillRef(entry.skill)}`);
      continue;
    }

    try {
      if (entry.disposition === "replace-existing") {
        await backupFile(entry.destinationPath);
      }

      await fs.mkdir(path.dirname(entry.destinationPath), { recursive: true });
      await atomicWrite(entry.destinationPath, entry.content);
      target.filesWritten += 1;

      try {
        await writeToolkitMarker(path.dirname(entry.destinationPath));
      } catch (err) {
        target.warnings.push(
          `${TOOL_LABELS[entry.toolId]}: installed ${entry.relativePath}, but toolkit ownership marker could not be written: ${formatError(err)}`
        );
      }
    } catch (err) {
      target.errors.push(
        `${TOOL_LABELS[entry.toolId]}: failed to write ${entry.relativePath}: ${formatError(err)}`
      );
    }
  }

  return finalizeResult(plan, targetResults);
}

async function buildEntriesForSkillTool(
  ref: SkillInstallRef,
  skill: Skill,
  toolId: ToolId,
  profile: Profile
): Promise<InstallPlanEntry[]> {
  try {
    const adapter = getAdapter(toolId);
    const outputs = adapter.translateSkill(skill, profile);

    if (outputs.length === 0) {
      return [blockedEntry(ref, toolId, `${TOOL_LABELS[toolId]}: adapter produced no output for this skill`)];
    }

    const globalPath = getGlobalPath(toolId);
    if (!globalPath) {
      return [blockedEntry(ref, toolId, `${TOOL_LABELS[toolId]}: tool global path is not configured`)];
    }

    const entries: InstallPlanEntry[] = [];
    for (const output of outputs) {
      const destinationPath = path.join(globalPath, output.relativePath);
      const blockers: string[] = [];

      if (!isWithinPath(globalPath, destinationPath)) {
        blockers.push(
          `${TOOL_LABELS[toolId]}: refusing to write outside global path: ${output.relativePath}`
        );
      }

      if (output.scope) {
        const limitCheck = checkCharacterLimit(
          output.content,
          output.tool,
          output.scope
        );
        if (!limitCheck.withinLimit) {
          blockers.push(
            `${TOOL_LABELS[toolId]}: ${output.relativePath} exceeds ${output.scope} limit (${limitCheck.currentSize} > ${limitCheck.maxSize} chars)`
          );
        }
      }

      const exists = blockers.length === 0
        ? await fileExists(destinationPath)
        : false;

      entries.push({
        id: `${formatSkillRef(ref)}:${toolId}:${output.relativePath}`,
        skill: ref,
        toolId,
        relativePath: output.relativePath,
        displayPath: toDisplayPath(destinationPath),
        destinationPath,
        content: output.content,
        scope: output.scope,
        disposition: blockers.length > 0
          ? "blocked"
          : exists
            ? "replace-existing"
            : "create",
        blockers,
      });
    }

    return entries;
  } catch (err) {
    return [blockedEntry(ref, toolId, `${TOOL_LABELS[toolId]}: ${formatError(err)}`)];
  }
}

function addDestinationCollisionBlockers(entries: InstallPlanEntry[]) {
  const byDestination = new Map<string, InstallPlanEntry[]>();
  for (const entry of entries) {
    if (!entry.destinationPath) continue;
    const key = path.resolve(entry.destinationPath);
    const existing = byDestination.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      byDestination.set(key, [entry]);
    }
  }

  for (const collidingEntries of byDestination.values()) {
    if (collidingEntries.length < 2) continue;

    for (const entry of collidingEntries) {
      const others = collidingEntries
        .filter((other) => other !== entry)
        .map((other) => formatSkillRef(other.skill))
        .join(", ");
      entry.blockers.push(
        `${TOOL_LABELS[entry.toolId]}: ${entry.relativePath} conflicts with ${others}`
      );
      entry.disposition = "blocked";
    }
  }
}

async function loadDefaultProfile(): Promise<Profile> {
  try {
    return await loadProfile("default");
  } catch {
    return {
      name: "default",
      description: "",
      include: ["*"],
      exclude: [],
      tools: {},
    };
  }
}

function blockedEntry(
  skill: SkillInstallRef,
  toolId: ToolId,
  blocker: string
): InstallPlanEntry {
  return {
    id: `${formatSkillRef(skill)}:${toolId}:blocked`,
    skill,
    toolId,
    relativePath: "",
    displayPath: "",
    destinationPath: null,
    content: null,
    disposition: "blocked",
    blockers: [blocker],
  };
}

function initializeTargetResults(input: BulkSkillInstallInput) {
  const results = new Map<string, {
    skill: SkillInstallRef;
    toolId: ToolId;
    filesWritten: number;
    warnings: string[];
    errors: string[];
  }>();

  for (const skill of input.skills) {
    for (const toolId of input.toolIds) {
      results.set(targetKey(skill, toolId), {
        skill,
        toolId,
        filesWritten: 0,
        warnings: [],
        errors: [],
      });
    }
  }

  return results;
}

function getTargetResult(
  targetResults: ReturnType<typeof initializeTargetResults>,
  skill: SkillInstallRef,
  toolId: ToolId
) {
  const result = targetResults.get(targetKey(skill, toolId));
  if (!result) {
    throw new Error(`Internal error: missing target result for ${formatSkillRef(skill)} ${toolId}`);
  }
  return result;
}

function finalizeResult(
  plan: SkillInstallPlan,
  targetResults: ReturnType<typeof initializeTargetResults>
): BulkSkillInstallResult {
  const skills = plan.input.skills.map((skill) => {
    const targets = plan.input.toolIds.map((toolId) => {
      const target = getTargetResult(targetResults, skill, toolId);
      const status = getTargetStatus(target.filesWritten, target.errors);
      return {
        toolId,
        status,
        filesWritten: target.filesWritten,
        warnings: target.warnings,
        errors: target.errors,
      };
    });

    return {
      skill,
      status: getSkillStatus(targets.map((target) => target.status)),
      targets,
    };
  });

  const allTargets = skills.flatMap((skill) => skill.targets);
  const installedTargets = allTargets.filter((target) => target.status === "installed").length;
  const partialTargets = allTargets.filter((target) => target.status === "partial").length;
  const failedTargets = allTargets.filter((target) => target.status === "failed").length;
  const filesWritten = allTargets.reduce((sum, target) => sum + target.filesWritten, 0);
  const errors = allTargets.flatMap((target) => target.errors);

  return {
    status: failedTargets === 0 && partialTargets === 0
      ? "success"
      : installedTargets > 0 || partialTargets > 0
        ? "partial"
        : "failed",
    summary: {
      requestedSkills: plan.input.skills.length,
      requestedTools: plan.input.toolIds.length,
      installedTargets,
      partialTargets,
      failedTargets,
      filesWritten,
    },
    skills,
    errors,
  };
}

function failedBeforeWrite(
  plan: SkillInstallPlan,
  errors: string[]
): BulkSkillInstallResult {
  const skills = plan.input.skills.map((skill) => ({
    skill,
    status: "failed" as const,
    targets: plan.input.toolIds.map((toolId) => ({
      toolId,
      status: "failed" as const,
      filesWritten: 0,
      warnings: [] as string[],
      errors,
    })),
  }));

  return {
    status: "failed",
    summary: {
      requestedSkills: plan.input.skills.length,
      requestedTools: plan.input.toolIds.length,
      installedTargets: 0,
      partialTargets: 0,
      failedTargets: plan.input.skills.length * plan.input.toolIds.length,
      filesWritten: 0,
    },
    skills,
    errors,
  };
}

function previewEntriesToErrors(preview: PublicSkillInstallPreview): string[] {
  return preview.entries.flatMap((entry) => entry.blockers);
}

function getTargetStatus(
  filesWritten: number,
  errors: string[]
): TargetInstallStatus {
  if (errors.length === 0 && filesWritten > 0) return "installed";
  if (filesWritten > 0) return "partial";
  return "failed";
}

function getSkillStatus(statuses: TargetInstallStatus[]): TargetInstallStatus {
  if (statuses.every((status) => status === "installed")) return "installed";
  if (statuses.some((status) => status === "installed" || status === "partial")) {
    return "partial";
  }
  return "failed";
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function toDisplayPath(filePath: string): string {
  const relativeToHome = path.relative(HOME, filePath);
  if (relativeToHome && !relativeToHome.startsWith("..") && !path.isAbsolute(relativeToHome)) {
    return path.join("~", relativeToHome);
  }
  return filePath;
}

function targetKey(skill: SkillInstallRef, toolId: ToolId): string {
  return `${formatSkillRef(skill)}:${toolId}`;
}

function formatSkillRef(skill: SkillInstallRef): string {
  return `${skill.source}:${skill.domain}/${skill.skillName}`;
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.message || "Unknown error";
  }
  if (typeof err === "string") {
    return err;
  }
  return "Unknown error";
}
