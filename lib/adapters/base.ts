import type { Skill, Profile, OutputFile, ToolId } from "../types";

export abstract class BaseAdapter {
  abstract readonly toolId: ToolId;

  abstract translateSkill(skill: Skill, profile: Profile): OutputFile[];
  abstract translateGlobal(skills: Skill[], profile: Profile): OutputFile[];
  abstract getGlobalSymlinkTargets(): Map<string, string>;
  abstract getProjectSymlinkTargets(): Map<string, string>;
  abstract getCharacterLimit(scope: "global" | "workspace"): number | null;

  /**
   * Generates a common set of frontmatter lines for tool-specific SKILL.md files.
   * Includes name, domain, version, and multi-line description.
   */
  protected renderSkillFrontmatter(skill: Skill): string[] {
    const descriptionLines = skill.frontmatter.description.split("\n");
    return [
      `name: ${skill.frontmatter.name}`,
      `domain: ${skill.frontmatter.domain}`,
      `version: ${skill.frontmatter.version}`,
      "description: |",
      ...descriptionLines.map((line) => `  ${line}`),
    ];
  }
}
