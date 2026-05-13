import path from "path";
import type { Skill, Profile, OutputFile } from "../types";
import { BaseAdapter } from "./base";
import { HOME } from "../safety";

export class ClaudeCodeAdapter extends BaseAdapter {
  readonly toolId = "claude-code" as const;

  translateSkill(skill: Skill, _profile: Profile): OutputFile[] {
    const activation = skill.frontmatter.activation?.["claude-code"] ?? "model";
    const disableModelInvocation = activation === "user-only";

    const frontmatter = ["---", ...this.renderSkillFrontmatter(skill)];

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
        scope: "workspace",
      },
    ];
  }

  translateGlobal(skills: Skill[], _profile: Profile): OutputFile[] {
    const sections = skills.map(
      (s) => `## ${s.frontmatter.name}\n\n${s.frontmatter.description}\n\n${s.content}`
    );

    const content =
      `# Agent Toolkit — Claude Code Instructions\n\n` +
      sections.join("\n\n---\n\n") +
      "\n";

    // Enforce 32k char limit warning for CLAUDE.md
    if (content.length > 32000) {
      console.warn(
        `Claude Code global instructions (CLAUDE.md) exceed 32,000 char limit (${content.length} chars). Consider reducing global skills.`
      );
    }

    return [
      {
        relativePath: "CLAUDE.md",
        content,
        tool: "claude-code",
        scope: "global",
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

  getCharacterLimit(scope: "global" | "workspace"): number | null {
    return scope === "global" ? 32000 : null;
  }
}
