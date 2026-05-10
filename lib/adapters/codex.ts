import path from "path";
import type { Skill, Profile, OutputFile } from "../types";
import { BaseAdapter } from "./base";
import { HOME } from "../safety";

const CODEX_HOME = process.env.CODEX_HOME || path.join(HOME, ".codex");

export class CodexAdapter extends BaseAdapter {
  readonly toolId = "codex" as const;

  translateSkill(_skill: Skill, _profile: Profile): OutputFile[] {
    // Codex doesn't have per-skill files — everything goes into AGENTS.md
    return [];
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

  getGlobalSymlinkTargets(): Map<string, string> {
    return new Map([
      ["AGENTS.md", path.join(CODEX_HOME, "AGENTS.md")],
    ]);
  }

  getProjectSymlinkTargets(): Map<string, string> {
    return new Map(); // Codex reads AGENTS.md from any directory — use agents-md adapter for project
  }

  getCharacterLimit(scope: "global" | "workspace"): number | null {
    // Codex enforces a 32 KiB byte limit on the global AGENTS.md file.
    return scope === "global" ? 32768 : null;
  }
}
