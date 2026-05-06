import path from "path";
import type { Skill, Profile, OutputFile } from "../types";
import { BaseAdapter } from "./base";

const HOME = process.env.HOME || process.env.USERPROFILE || "~";

export class OpenCodeAdapter extends BaseAdapter {
  readonly toolId = "opencode" as const;

  translateSkill(skill: Skill, _profile: Profile): OutputFile[] {
    const fullDescription = skill.frontmatter.description;
    const shouldTruncateDescription = fullDescription.length > 1024;
    const descriptionLines = (shouldTruncateDescription
      ? fullDescription.slice(0, 1024)
      : fullDescription
    ).split("\n");

    // OpenCode skills use the same SKILL.md format as Claude Code
    const frontmatter = [
      "---",
      `name: ${skill.frontmatter.name}`,
      `description: |`,
      ...descriptionLines.map((line) => `  ${line}`),
    ];

    if (skill.frontmatter.globs) {
      frontmatter.push(`globs: "${skill.frontmatter.globs}"`);
    }

    if (shouldTruncateDescription) {
      frontmatter.push(`truncated-description: true`);
      frontmatter.push(`description-length: ${fullDescription.length}`);
    }

    frontmatter.push("---", "");

    const content = frontmatter.join("\n");

    if (shouldTruncateDescription) {
      console.warn(
        `OpenCode description for ${skill.skillName} exceeds 1024 chars and was truncated.`
      );
    }

    return [
      {
        relativePath: `skills/${skill.skillName}/SKILL.md`,
        content: content + skill.content + "\n",
        tool: "opencode",
        scope: "workspace",
      },
    ];
  }

  translateGlobal(skills: Skill[], _profile: Profile): OutputFile[] {
    const sections = skills.map(
      (s) =>
        `## ${s.frontmatter.name}\n\n${s.frontmatter.description}\n\n${s.content}`
    );

    return [
      {
        relativePath: "AGENTS.md",
        content:
          `# Agent Toolkit — OpenCode Instructions\n\n` +
          sections.join("\n\n---\n\n") +
          "\n",
        tool: "opencode",
        scope: "global",
      },
    ];
  }

  getGlobalSymlinkTargets(): Map<string, string> {
    return new Map([
      ["skills", path.join(HOME, ".config", "opencode", "skills")],
      ["AGENTS.md", path.join(HOME, ".config", "opencode", "AGENTS.md")],
    ]);
  }

  getProjectSymlinkTargets(): Map<string, string> {
    return new Map([
      ["skills", ".opencode/skills"],
    ]);
  }

  getCharacterLimit(scope: "global" | "workspace"): number | null {
    // Description limit is 1024 chars per skill, handled in translateSkill.
    // There is no documented limit for the global AGENTS.md file in OpenCode.
    return null;
  }
}
