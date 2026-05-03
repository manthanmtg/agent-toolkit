import { describe, it, expect } from "vitest";
import { ClaudeCodeAdapter } from "./adapters/claude-code";
import type { Skill, Profile } from "./types";

describe("ClaudeCodeAdapter", () => {
  const adapter = new ClaudeCodeAdapter();
  const mockProfile: Profile = {
    name: "default",
    description: "Default profile",
    include: ["*"],
    exclude: [],
    tools: {},
  };

  it("should handle multi-line descriptions correctly", () => {
    const skill: Skill = {
      skillName: "test-skill",
      domain: "test",
      frontmatter: {
        name: "test-skill",
        description: "line 1\nline 2",
        domain: "test",
        version: "1.0.0",
        tags: [],
        author: "",
        activation: { "claude-code": "model" },
        depends_on: [],
      },
      content: "\nTest content",
      rawContent: "---\nname: test-skill\ndescription: line 1\nline 2\n---\nTest content",
      path: "test/test-skill/SKILL.md",
      supportingFiles: [],
      source: "toolkit",
    };

    const outputs = adapter.translateSkill(skill, mockProfile);
    expect(outputs).toHaveLength(1);
    expect(outputs[0].relativePath).toBe("skills/test-skill/SKILL.md");
    expect(outputs[0].content).toContain("description: |");
    expect(outputs[0].content).toContain("  line 1");
    expect(outputs[0].content).toContain("  line 2");
  });
});
