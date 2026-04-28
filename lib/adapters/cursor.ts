import path from "path";
import type { Skill, Profile, OutputFile } from "../types";
import { BaseAdapter } from "./base";

const HOME = process.env.HOME || process.env.USERPROFILE || "~";

export class CursorAdapter extends BaseAdapter {
  readonly toolId = "cursor" as const;

  translateSkill(skill: Skill, _profile: Profile): OutputFile[] {
    const activation = skill.frontmatter.activation?.cursor ?? "auto";
    const alwaysApply = activation === "always";
    const descriptionLines = skill.frontmatter.description.split("\n");

    // Rule format (.mdc) for .cursor/rules/
    const ruleFrontmatter = [
      "---",
      "description: |",
      ...descriptionLines.map((line) => `  ${line}`),
      `alwaysApply: ${alwaysApply}`,
    ];

    if (skill.frontmatter.globs) {
      ruleFrontmatter.push(`globs: "${skill.frontmatter.globs}"`);
    }

    ruleFrontmatter.push("---", "");

    const ruleContent = ruleFrontmatter.join("\n") + skill.content + "\n";

    // Skill format (SKILL.md) for .cursor/skills/ and ~/.cursor/skills/
    const skillFrontmatter = [
      "---",
      `name: ${skill.frontmatter.name}`,
      "description: |",
      ...descriptionLines.map((line) => `  ${line}`),
    ];

    if (activation === "manual") {
      skillFrontmatter.push("disable-model-invocation: true");
    }

    skillFrontmatter.push("---", "");

    const skillContent = skillFrontmatter.join("\n") + skill.content + "\n";

    return [
      {
        relativePath: `rules/${skill.skillName}.mdc`,
        content: ruleContent,
        tool: "cursor",
      },
      {
        relativePath: `skills/${skill.skillName}/SKILL.md`,
        content: skillContent,
        tool: "cursor",
      },
    ];
  }

  translateGlobal(_skills: Skill[], _profile: Profile): OutputFile[] {
    return [];
  }

  getGlobalSymlinkTargets(): Map<string, string> {
    return new Map([
      ["skills", path.join(HOME, ".cursor", "skills")],
      ["rules", path.join(HOME, ".cursor", "rules")],
    ]);
  }

  getProjectSymlinkTargets(): Map<string, string> {
    return new Map([
      ["rules", ".cursor/rules"],
      ["skills", ".cursor/skills"],
    ]);
  }

  getCharacterLimit(_scope: "global" | "workspace"): number | null {
    return null;
  }
}
