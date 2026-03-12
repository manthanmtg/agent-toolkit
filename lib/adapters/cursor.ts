import type { Skill, Profile, OutputFile } from "../types";
import { BaseAdapter } from "./base";

export class CursorAdapter extends BaseAdapter {
  readonly toolId = "cursor" as const;

  translateSkill(skill: Skill, _profile: Profile): OutputFile[] {
    const activation = skill.frontmatter.activation?.cursor ?? "auto";
    const alwaysApply = activation === "always";

    const frontmatter = [
      "---",
      `description: ${skill.frontmatter.description}`,
      `alwaysApply: ${alwaysApply}`,
    ];

    if (skill.frontmatter.globs) {
      frontmatter.push(`globs: "${skill.frontmatter.globs}"`);
    }

    frontmatter.push("---", "");

    const content = frontmatter.join("\n") + skill.content + "\n";

    return [
      {
        relativePath: `rules/${skill.skillName}.mdc`,
        content,
        tool: "cursor",
      },
    ];
  }

  translateGlobal(_skills: Skill[], _profile: Profile): OutputFile[] {
    // Cursor global rules are UI-only, no file output
    return [];
  }

  getGlobalSymlinkTargets(): Map<string, string> {
    return new Map(); // No global file targets — Cursor uses UI for global
  }

  getProjectSymlinkTargets(): Map<string, string> {
    return new Map([["rules", ".cursor/rules"]]);
  }

  getCharacterLimit(): number | null {
    return null; // Cursor has implicit limits but no documented hard cap
  }
}
