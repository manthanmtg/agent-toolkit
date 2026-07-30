import path from "path";
import type { Skill, Profile, OutputFile } from "../types";
import { BaseAdapter } from "./base";
import { getGlobalPath } from "../detector";

export class CodexAdapter extends BaseAdapter {
  readonly toolId = "codex" as const;

  translateSkill(skill: Skill, _profile: Profile): OutputFile[] {
    const frontmatter = [
      "---",
      ...this.renderSkillFrontmatter(skill),
      "---",
      "",
    ].join("\n");

    return [
      {
        relativePath: `skills/${skill.skillName}/SKILL.md`,
        content: frontmatter + skill.content + "\n",
        tool: "codex",
        scope: "workspace",
      },
    ];
  }

  translateGlobal(skills: Skill[], _profile: Profile): OutputFile[] {
    const renderSections = (full: boolean) =>
      skills.map(
        (s) =>
          `## ${s.frontmatter.name}\n\n${s.frontmatter.description}${
            full ? `\n\n${s.content}` : ""
          }`
      );

    const title = `# Agent Toolkit — Codex Instructions\n\n`;
    const separator = "\n\n---\n\n";

    let content = title + renderSections(true).join(separator) + "\n";
    let byteSize = Buffer.byteLength(content, "utf-8");

    if (byteSize > 32768) {
      console.warn(
        `Codex AGENTS.md exceeds 32 KiB limit (${byteSize} bytes). Falling back to summary-only mode.`
      );
      content =
        title +
        `> NOTE: Full skill content omitted to stay within Codex's 32 KiB limit. Showing summaries only.\n\n` +
        renderSections(false).join(separator) +
        "\n";
      byteSize = Buffer.byteLength(content, "utf-8");
    }

    return [
      {
        relativePath: "AGENTS.md",
        content,
        tool: "codex",
        scope: "global",
      },
    ];
  }

  getGlobalSymlinkTargets(outputFiles: string[] = []): Map<string, string> {
    const codexHome = getGlobalPath("codex");
    if (!codexHome) return new Map();

    const targets = new Map<string, string>([
      ["AGENTS.md", path.join(codexHome, "AGENTS.md")],
    ]);

    for (const relativePath of outputFiles) {
      const match = relativePath.match(
        /^skills\/([a-z0-9]+(?:-[a-z0-9]+)*)\/SKILL\.md$/
      );
      if (!match) continue;

      const skillName = match[1];
      targets.set(
        `skills/${skillName}`,
        path.join(codexHome, "skills", skillName)
      );
    }

    return targets;
  }

  getProjectSymlinkTargets(): Map<string, string> {
    return new Map([["skills", ".agents/skills"]]);
  }

  getCharacterLimit(scope: "global" | "workspace"): number | null {
    // Codex enforces a 32 KiB byte limit on the global AGENTS.md file.
    return scope === "global" ? 32768 : null;
  }
}
