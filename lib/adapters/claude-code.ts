import path from "path";
import type { Skill, Profile, OutputFile } from "../types";
import { BaseAdapter } from "./base";

const HOME = process.env.HOME || process.env.USERPROFILE || "~";

export class ClaudeCodeAdapter extends BaseAdapter {
  readonly toolId = "claude-code" as const;

  translateSkill(skill: Skill, _profile: Profile): OutputFile[] {
    const activation = skill.frontmatter.activation?.["claude-code"] ?? "model";
    const disableModelInvocation = activation === "user-only";

    const frontmatter = [
      "---",
      `name: ${skill.frontmatter.name}`,
      `description: |`,
      `  ${skill.frontmatter.description}`,
    ];

    if (disableModelInvocation) {
      frontmatter.push(`disable-model-invocation: true`);
    }

    if (skill.frontmatter.globs) {
      frontmatter.push(`globs: "${skill.frontmatter.globs}"`);
    }

    frontmatter.push("---", "");

    const content = frontmatter.join("\n") + skill.content + "\n";

    return [
      {
        relativePath: `skills/${skill.skillName}/SKILL.md`,
        content,
        tool: "claude-code",
      },
    ];
  }

  translateGlobal(skills: Skill[], _profile: Profile): OutputFile[] {
    const sections = skills.map(
      (s) => `## ${s.frontmatter.name}\n\n${s.frontmatter.description}`
    );

    return [
      {
        relativePath: "CLAUDE.md",
        content:
          `# Agent Toolkit — Claude Code Instructions\n\n` +
          sections.join("\n\n---\n\n") +
          "\n",
        tool: "claude-code",
      },
    ];
  }

  getGlobalSymlinkTargets(): Map<string, string> {
    return new Map([
      ["skills", path.join(HOME, ".claude", "skills")],
      ["CLAUDE.md", path.join(HOME, ".claude", "CLAUDE.md")],
    ]);
  }

  getProjectSymlinkTargets(): Map<string, string> {
    return new Map([
      ["skills", ".claude/skills"],
      ["CLAUDE.md", "CLAUDE.md"],
    ]);
  }

  getCharacterLimit(): number | null {
    return null; // No hard limit
  }
}
