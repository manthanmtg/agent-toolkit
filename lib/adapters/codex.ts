import path from "path";
import type { Skill, Profile, OutputFile } from "../types";
import { BaseAdapter } from "./base";

const HOME = process.env.HOME || process.env.USERPROFILE || "~";
const CODEX_HOME = process.env.CODEX_HOME || path.join(HOME, ".codex");

export class CodexAdapter extends BaseAdapter {
  readonly toolId = "codex" as const;

  translateSkill(_skill: Skill, _profile: Profile): OutputFile[] {
    // Codex doesn't have per-skill files — everything goes into AGENTS.md
    return [];
  }

  translateGlobal(skills: Skill[], _profile: Profile): OutputFile[] {
    const sections = skills.map(
      (s) =>
        `## ${s.frontmatter.name}\n\n${s.frontmatter.description}\n\n${s.content}`
    );

    const content =
      `# Agent Toolkit — Codex Instructions\n\n` +
      sections.join("\n\n---\n\n") +
      "\n";

    // Enforce 32 KiB limit
    const byteSize = Buffer.byteLength(content, "utf-8");
    if (byteSize > 32768) {
      console.warn(
        `Codex AGENTS.md exceeds 32 KiB limit (${byteSize} bytes). Consider reducing skills.`
      );
    }

    return [
      {
        relativePath: "AGENTS.md",
        content,
        tool: "codex",
      },
    ];
  }

  getGlobalSymlinkTargets(): Map<string, string> {
    return new Map([
      ["AGENTS.md", path.join(CODEX_HOME, "AGENTS.md")],
    ]);
  }

  getProjectSymlinkTargets(): Map<string, string> {
    return new Map(); // Codex reads AGENTS.md from any directory — use agents-md adapter for project
  }

  getCharacterLimit(): number | null {
    return 32768; // 32 KiB byte limit
  }
}
