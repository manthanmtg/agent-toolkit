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
    const { name, domain, version, description, author, tags, depends_on } = skill.frontmatter;
    const descriptionLines = description.split("\n");
    const lines = [
      `name: ${name}`,
      `domain: ${domain}`,
      `version: ${version}`,
    ];

    if (author) {
      lines.push(`author: ${author}`);
    }

    if (tags && tags.length > 0) {
      lines.push(`tags: [${tags.join(", ")}]`);
    }

    if (depends_on && depends_on.length > 0) {
      lines.push(`depends_on: [${depends_on.join(", ")}]`);
    }

    lines.push("description: |");
    lines.push(...descriptionLines.map((line) => `  ${line}`));

    return lines;
  }
}
