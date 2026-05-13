import path from "path";
import type { Skill, Profile, OutputFile } from "../types";
import { BaseAdapter } from "./base";
import { HOME } from "../safety";

export class WindsurfAdapter extends BaseAdapter {
  readonly toolId = "windsurf" as const;

  translateSkill(skill: Skill, _profile: Profile): OutputFile[] {
    const activation = skill.frontmatter.activation?.windsurf ?? "model_decision";
    const trigger = activation;
    const descriptionLines = skill.frontmatter.description.split("\n");

    const frontmatter = [
      "---",
      `trigger: ${trigger}`,
      "description: |",
      ...descriptionLines.map((line) => `  ${line}`),
    ];

    if (skill.frontmatter.globs) {
      frontmatter.push(`globs: "${skill.frontmatter.globs}"`);
    }

    frontmatter.push("---", "");

    const ruleContent = frontmatter.join("\n") + skill.content + "\n";

    const outputs: OutputFile[] = [
      {
        relativePath: `rules/${skill.skillName}.md`,
        content: ruleContent,
        tool: "windsurf",
        scope: "workspace",
      },
    ];

    // Also emit as a skill directory
    const skillFrontmatterLines = [...this.renderSkillFrontmatter(skill)];
    if (activation === "manual") {
      skillFrontmatterLines.push("disable-model-invocation: true");
    }

    const skillFrontmatter = [
      "---",
      ...skillFrontmatterLines,
      "---",
      "",
    ].join("\n");

    outputs.push({
      relativePath: `skills/${skill.skillName}/SKILL.md`,
      content: skillFrontmatter + skill.content + "\n",
      tool: "windsurf",
      scope: "workspace",
    });

    return outputs;
  }

  translateGlobal(skills: Skill[], _profile: Profile): OutputFile[] {
    const sections = skills.map(
      (s) =>
        `## ${s.frontmatter.name}\n\n${s.frontmatter.description}\n\n${s.content}`
    );

    const globalContent =
      `# Agent Toolkit — Global Rules\n\n` +
      sections.join("\n\n---\n\n") +
      "\n";

    // Enforce 6,000 char limit for global rules
    if (globalContent.length > 6000) {
      console.warn(
        `Windsurf global rules exceed 6,000 char limit (${globalContent.length} chars). Consider reducing skills.`
      );
    }

    return [
      {
        relativePath: "global_rules.md",
        content: globalContent,
        tool: "windsurf",
        scope: "global",
      },
    ];
  }

  getGlobalSymlinkTargets(): Map<string, string> {
    return new Map([
      [
        "global_rules.md",
        path.join(HOME, ".codeium", "windsurf", "memories", "global_rules.md"),
      ],
      [
        "skills",
        path.join(HOME, ".codeium", "windsurf", "skills"),
      ],
    ]);
  }

  getProjectSymlinkTargets(): Map<string, string> {
    return new Map([
      ["rules", ".windsurf/rules"],
      ["skills", ".windsurf/skills"],
    ]);
  }

  getCharacterLimit(scope: "global" | "workspace"): number | null {
    return scope === "global" ? 6000 : 12000;
  }
}
