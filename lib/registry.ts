import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { glob } from "glob";
import { parse } from "yaml";
import { ZodError } from "zod";
import { SkillFrontmatterSchema, type Skill, type SkillSource, type Profile, ProfileSchema, ToolConfigSchema, type ToolId, TOOL_IDS } from "./types";
import { HOME } from "./safety";

const REPO_ROOT = path.resolve(process.cwd());
const SKILLS_DIR = path.join(REPO_ROOT, "skills");
const PROFILES_DIR = path.join(REPO_ROOT, "profiles");
const LOCAL_SKILLS_DIR = path.join(HOME, ".agent-toolkit", "local-skills");
const PROFILE_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isValidProfileName(name: string): boolean {
  return PROFILE_NAME_RE.test(name);
}

export async function loadSkill(
  skillDir: string,
  source: SkillSource = "toolkit",
  preLoadedFiles?: string[]
): Promise<Skill> {
  const baseDir = source === "local" ? LOCAL_SKILLS_DIR : SKILLS_DIR;
  const skillMdPath = path.join(skillDir, "SKILL.md");
  const raw = await fs.readFile(skillMdPath, "utf-8");
  const { data, content } = matter(raw);

  const frontmatter = SkillFrontmatterSchema.parse(data);

  const rel = path.relative(baseDir, skillDir);
  const parts = rel.split(path.sep);
  const domain = parts[0];
  const skillName = parts[parts.length - 1];

  const allFiles = preLoadedFiles ?? await glob("**/*", { cwd: skillDir, nodir: true });
  const supportingFiles = allFiles
    .filter((f) => f !== "SKILL.md")
    .map((f) => path.join(rel, f));

  const pathPrefix = source === "local" ? "local-skills" : "skills";

  return {
    frontmatter,
    content: content.trim(),
    rawContent: raw,
    path: path.join(pathPrefix, rel),
    domain,
    skillName,
    supportingFiles,
    source,
  };
}

async function loadSkillsFromDir(
  dir: string,
  source: SkillSource
): Promise<Skill[]> {
  try {
    await fs.access(dir);
  } catch {
    return [];
  }

  // Optimize: Find all files at once to avoid N additional glob calls
  // Pattern * / * / ** finds all files within any domain/skill directory
  const allFiles = await glob("*/*/**", { cwd: dir, nodir: true });
  
  const filesBySkill = new Map<string, string[]>();
  const skillMdFiles: string[] = [];

  for (const file of allFiles) {
    const parts = file.split("/");
    if (parts.length < 3) continue;
    
    const skillRelDir = parts.slice(0, 2).join("/");
    const fileName = parts.slice(2).join("/");
    
    if (fileName === "SKILL.md") {
      skillMdFiles.push(file);
    }
    
    if (!filesBySkill.has(skillRelDir)) {
      filesBySkill.set(skillRelDir, []);
    }
    filesBySkill.get(skillRelDir)!.push(fileName);
  }

  const skillPromises = skillMdFiles.map(async (relPath) => {
    const skillRelDir = path.dirname(relPath);
    const skillAbsDir = path.join(dir, skillRelDir);
    const skillFiles = filesBySkill.get(skillRelDir) || [];
    
    try {
      return await loadSkill(skillAbsDir, source, skillFiles);
    } catch (err) {
      console.warn(`Failed to load ${source} skill at ${skillAbsDir}:`, err);
      return null;
    }
  });

  const skills = (await Promise.all(skillPromises)).filter((s): s is Skill => s !== null);

  return skills;
}

export async function loadAllSkills(): Promise<Skill[]> {
  const [toolkitSkills, localSkills] = await Promise.all([
    loadSkillsFromDir(SKILLS_DIR, "toolkit"),
    loadSkillsFromDir(LOCAL_SKILLS_DIR, "local"),
  ]);

  return [...toolkitSkills, ...localSkills].sort((a, b) =>
    `${a.domain}/${a.skillName}`.localeCompare(`${b.domain}/${b.skillName}`)
  );
}

export async function loadProfile(
  name: string,
  activePath: string[] = []
): Promise<Profile> {
  if (activePath.includes(name)) {
    throw new Error(
      `Circular inheritance detected: ${activePath.join(" -> ")} -> ${name}`
    );
  }

  if (!isValidProfileName(name)) {
    throw new Error(
      `Invalid profile name: "${name}". Profile names must be kebab-case (e.g., "my-profile").`
    );
  }

  const profilePath = path.join(PROFILES_DIR, `${name}.yaml`);
  let raw: string;
  try {
    raw = await fs.readFile(profilePath, "utf-8");
  } catch (err) {
    throw new Error(`Could not read profile file at ${profilePath}`);
  }

  let data: unknown;
  try {
    data = parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`YAML parse error in ${name}.yaml: ${message}`);
  }

  let profile: Profile;
  try {
    profile = ProfileSchema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      throw new Error(`Validation error in ${name}.yaml: ${details}`);
    }
    throw err;
  }

  if (profile.name !== name) {
    throw new Error(
      `Profile name mismatch in ${name}.yaml: internal name is "${profile.name}" but filename implies "${name}". These must match.`
    );
  }

  if (profile.extends) {
    let parent: Profile;
    try {
      parent = await loadProfile(profile.extends, [...activePath, name]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Circular inheritance detected")) {
        throw err;
      }
      if (message.includes("Invalid profile name")) {
        throw new Error(
          `Validation error in ${name}.yaml: "extends" refers to an invalid profile name "${profile.extends}".`
        );
      }
      if (message.includes("Could not read profile file")) {
        throw new Error(
          `Validation error in ${name}.yaml: "extends" refers to a non-existent profile "${profile.extends}".`
        );
      }
      // Re-wrap other errors (YAML parse, Zod validation) to show they came from the parent
      throw new Error(
        `Validation error in ${name}.yaml: "extends" refers to an invalid profile "${profile.extends}". Inner error: ${message}`
      );
    }

    // Inherit include/exclude only if not explicitly defined in child
    const rawData = data as any;
    if (rawData.include === undefined) {
      profile.include = parent.include;
    }
    if (rawData.exclude === undefined) {
      profile.exclude = parent.exclude;
    }

    // Merge tools: child overrides parent property by property
    const explicitChildTools = rawData.tools || {};
    const mergedTools: Record<string, any> = { ...parent.tools };

    for (const [toolId, childConfig] of Object.entries(profile.tools)) {
      const tid = toolId as ToolId;
      if (explicitChildTools[tid] && parent.tools[tid]) {
        // Deep merge tool config: parent parsed values + child raw explicit values
        mergedTools[tid] = ToolConfigSchema.parse({
          ...parent.tools[tid],
          ...explicitChildTools[tid],
        });
      } else {
        // Only in child, or not in parent, or not explicit in child (already handled by ProfileSchema.parse)
        mergedTools[tid] = childConfig;
      }
    }
    profile.tools = mergedTools as Record<ToolId, any>;
  }

  return profile;
}

export interface ProfileLoadResult {
  profiles: Profile[];
  invalidFiles: Array<{ file: string; error: string }>;
}

export async function loadAllProfiles(): Promise<Profile[]> {
  return (await loadAllProfilesWithDiagnostics()).profiles;
}

export async function loadAllProfilesWithDiagnostics(): Promise<ProfileLoadResult> {
  try {
    await fs.access(PROFILES_DIR);
  } catch {
    return { profiles: [], invalidFiles: [] };
  }

  const files = await glob("*.yaml", { cwd: PROFILES_DIR });

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const name = path.basename(file, ".yaml");
        const profile = await loadProfile(name);
        return { type: "success" as const, profile };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Failed to load profile ${file}:`, message);
        return { type: "error" as const, file, error: message };
      }
    })
  );

  const profiles: Profile[] = [];
  const invalidFiles: Array<{ file: string; error: string }> = [];

  for (const result of results) {
    if (result.type === "success") {
      profiles.push(result.profile);
    } else {
      invalidFiles.push({ file: result.file, error: result.error });
    }
  }

  return { profiles, invalidFiles };
}

export function filterSkillsByProfile(
  skills: Skill[],
  profile: Profile
): Skill[] {
  const includePatterns = normalizePatterns(profile.include);
  const excludePatterns = normalizePatterns(profile.exclude);

  return skills.filter((skill) => {
    const skillPath = `${skill.domain}/${skill.skillName}`.toLowerCase();
    const skillTags = new Set(
      skill.frontmatter.tags.map((tag) => tag.trim().toLowerCase())
    );

    // Check exclusions first
    for (const pattern of excludePatterns) {
      if (matchGlob(skillPath, pattern, skillTags)) return false;
    }

    // Check inclusions
    if (includePatterns.length === 0 || includePatterns.includes("*")) {
      return true;
    }

    for (const pattern of includePatterns) {
      if (matchGlob(skillPath, pattern, skillTags)) return true;
    }

    return false;
  });
}

function normalizePatterns(patterns: string[]): string[] {
  return [
    ...new Set(
      patterns
        .map((pattern) => pattern.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function matchGlob(
  skillPath: string,
  pattern: string,
  skillTags: Set<string>
): boolean {
  // All inputs are assumed to be lowercase
  if (pattern === "*") return true;

  // tag:pattern
  if (pattern.startsWith("tag:")) {
    const tag = pattern.slice(4).trim();
    if (!tag) return false;
    if (tag === "*") return skillTags.size > 0;
    return skillTags.has(tag);
  }

  // domain/*
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return skillPath.startsWith(prefix + "/") || skillPath === prefix;
  }

  // */skill-name
  if (pattern.startsWith("*/")) {
    const suffix = pattern.slice(2);
    return skillPath.endsWith("/" + suffix);
  }

  return skillPath === pattern;
}

export function getSkillsDir(): string {
  return SKILLS_DIR;
}

export function getLocalSkillsDir(): string {
  return LOCAL_SKILLS_DIR;
}

export function getRepoRoot(): string {
  return REPO_ROOT;
}
