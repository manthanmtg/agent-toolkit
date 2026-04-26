import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { glob } from "glob";
import { SkillFrontmatterSchema, type Skill, type SkillSource, type Profile, ProfileSchema } from "./types";

const REPO_ROOT = path.resolve(process.cwd());
const SKILLS_DIR = path.join(REPO_ROOT, "skills");
const PROFILES_DIR = path.join(REPO_ROOT, "profiles");
const HOME = process.env.HOME || process.env.USERPROFILE || "~";
const LOCAL_SKILLS_DIR = path.join(HOME, ".agent-toolkit", "local-skills");

export async function loadSkill(
  skillDir: string,
  source: SkillSource = "toolkit"
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

  const allFiles = await glob("**/*", { cwd: skillDir, nodir: true });
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

  const skillMdFiles = await glob("*/*/SKILL.md", { cwd: dir });
  const skills: Skill[] = [];

  for (const relPath of skillMdFiles) {
    const skillDir = path.join(dir, path.dirname(relPath));
    try {
      const skill = await loadSkill(skillDir, source);
      skills.push(skill);
    } catch (err) {
      console.warn(`Failed to load ${source} skill at ${skillDir}:`, err);
    }
  }

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

export async function loadAllLocalSkills(): Promise<Skill[]> {
  return loadSkillsFromDir(LOCAL_SKILLS_DIR, "local");
}

export async function loadProfile(name: string): Promise<Profile> {
  const profilePath = path.join(PROFILES_DIR, `${name}.yaml`);
  const raw = await fs.readFile(profilePath, "utf-8");
  const { parse } = await import("yaml");
  const data = parse(raw);
  return ProfileSchema.parse(data);
}

export async function loadAllProfiles(): Promise<Profile[]> {
  const files = await glob("*.yaml", { cwd: PROFILES_DIR });
  const profiles: Profile[] = [];

  for (const file of files) {
    try {
      const name = path.basename(file, ".yaml");
      const profile = await loadProfile(name);
      profiles.push(profile);
    } catch (err) {
      console.warn(`Failed to load profile ${file}:`, err);
    }
  }

  return profiles;
}

export function filterSkillsByProfile(
  skills: Skill[],
  profile: Profile
): Skill[] {
  const includePatterns = normalizePatterns(profile.include);
  const excludePatterns = normalizePatterns(profile.exclude);

  return skills.filter((skill) => {
    const skillPath = `${skill.domain}/${skill.skillName}`;

    // Check exclusions first
    for (const pattern of excludePatterns) {
      if (matchGlob(skillPath, pattern)) return false;
    }

    // Check inclusions
    if (includePatterns.length === 0 || includePatterns.includes("*")) {
      return true;
    }

    for (const pattern of includePatterns) {
      if (matchGlob(skillPath, pattern)) return true;
    }

    return false;
  });
}

function normalizePatterns(patterns: string[]): string[] {
  return [...new Set(patterns.map((pattern) => pattern.trim()).filter(Boolean))];
}

function matchGlob(skillPath: string, pattern: string): boolean {
  // Simple glob matching: "domain/*" matches all in domain, exact match otherwise
  if (pattern === "*") return true;
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return skillPath.startsWith(prefix + "/") || skillPath === prefix;
  }
  return skillPath === pattern;
}

export function getSkillsDir(): string {
  return SKILLS_DIR;
}

export function getLocalSkillsDir(): string {
  return LOCAL_SKILLS_DIR;
}

export function getProfilesDir(): string {
  return PROFILES_DIR;
}

export function getRepoRoot(): string {
  return REPO_ROOT;
}
