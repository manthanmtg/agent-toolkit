import type { Skill, Profile, OutputFile } from "../types";
import { BaseAdapter } from "./base";

export class AgentsMdAdapter extends BaseAdapter {
  readonly toolId = "agents-md" as const;

  translateSkill(_skill: Skill, _profile: Profile): OutputFile[] {
    // AGENTS.md is a single concatenated file — handled in translateGlobal
    return [];
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
          `# Agent Toolkit — Project Instructions\n\n` +
          sections.join("\n\n---\n\n") +
          "\n",
        tool: "agents-md",
      },
    ];
  }

  getGlobalSymlinkTargets(): Map<string, string> {
    return new Map(); // AGENTS.md is project-only
  }

  getProjectSymlinkTargets(): Map<string, string> {
    return new Map([["AGENTS.md", "AGENTS.md"]]);
  }

  getCharacterLimit(): number | null {
    return null;
  }
}
