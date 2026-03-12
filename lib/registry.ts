import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { glob } from "glob";
import { SkillFrontmatterSchema, type Skill, type Profile, ProfileSchema } from "./types";

const REPO_ROOT = path.resolve(process.cwd());
const SKILLS_DIR = path.join(REPO_ROOT, "skills");
const PROFILES_DIR = path.join(REPO_ROOT, "profiles");

export async function loadSkill(skillDir: string): Promise<Skill> {
  const skillMdPath = path.join(skillDir, "SKILL.md");
  const raw = await fs.readFile(skillMdPath, "utf-8");
  const { data, content } = matter(raw);

  const frontmatter = SkillFrontmatterSchema.parse(data);

  const rel = path.relative(SKILLS_DIR, skillDir);
  const parts = rel.split(path.sep);
  const domain = parts[0];
  const skillName = parts[parts.length - 1];

  // Find supporting files
  const allFiles = await glob("**/*", { cwd: skillDir, nodir: true });
  const supportingFiles = allFiles
    .filter((f) => f !== "SKILL.md")
    .map((f) => path.join(rel, f));

  return {
    frontmatter,
    content: content.trim(),
    rawContent: raw,
    path: path.join("skills", rel),
    domain,
    skillName,
    supportingFiles,
  };
}

export async function loadAllSkills(): Promise<Skill[]> {
  const skillMdFiles = await glob("*/*/SKILL.md", { cwd: SKILLS_DIR });
  const skills: Skill[] = [];

  for (const relPath of skillMdFiles) {
    const skillDir = path.join(SKILLS_DIR, path.dirname(relPath));
    try {
      const skill = await loadSkill(skillDir);
      skills.push(skill);
    } catch (err) {
      console.warn(`Failed to load skill at ${skillDir}:`, err);
    }
  }

  return skills.sort((a, b) =>
    `${a.domain}/${a.skillName}`.localeCompare(`${b.domain}/${b.skillName}`)
  );
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
  return skills.filter((skill) => {
    const skillPath = `${skill.domain}/${skill.skillName}`;

    // Check exclusions first
    for (const pattern of profile.exclude) {
      if (matchGlob(skillPath, pattern)) return false;
    }

    // Check inclusions
    if (profile.include.length === 0 || profile.include.includes("*")) {
      return true;
    }

    for (const pattern of profile.include) {
      if (matchGlob(skillPath, pattern)) return true;
    }

    return false;
  });
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

export function getProfilesDir(): string {
  return PROFILES_DIR;
}

export function getRepoRoot(): string {
  return REPO_ROOT;
}
