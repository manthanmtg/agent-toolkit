import path from "path";
import type { Skill, Profile, OutputFile } from "../types";
import { BaseAdapter } from "./base";

const HOME = process.env.HOME || process.env.USERPROFILE || "~";

export class OpenCodeAdapter extends BaseAdapter {
  readonly toolId = "opencode" as const;

  translateSkill(skill: Skill, _profile: Profile): OutputFile[] {
    // OpenCode skills use the same SKILL.md format as Claude Code
    const frontmatter = [
      "---",
      `name: ${skill.frontmatter.name}`,
      `description: |`,
      `  ${skill.frontmatter.description.slice(0, 1024)}`,
      "---",
      "",
    ].join("\n");

    return [
      {
        relativePath: `skills/${skill.skillName}/SKILL.md`,
        content: frontmatter + skill.content + "\n",
        tool: "opencode",
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
    // Description limit is 1024 chars per skill
    return scope === "workspace" ? 1024 : null;
  }
}
