import { describe, it, expect, vi } from "vitest";
import { ClaudeCodeAdapter } from "./adapters/claude-code";
import { WindsurfAdapter } from "./adapters/windsurf";
import { CursorAdapter } from "./adapters/cursor";
import type { Skill, Profile } from "./types";

const mockProfile: Profile = {
  name: "default",
  description: "Default profile",
  include: ["*"],
  exclude: [],
  tools: {},
};

const mockSkill: Skill = {
  skillName: "test-skill",
  domain: "test",
  frontmatter: {
    name: "test-skill",
    description: "line 1\nline 2",
    domain: "test",
    version: "1.0.0",
    tags: [],
    author: "",
    activation: {},
    depends_on: [],
  },
  content: "\nTest content",
  rawContent: "---\nname: test-skill\ndescription: line 1\nline 2\n---\nTest content",
  path: "test/test-skill/SKILL.md",
  supportingFiles: [],
  source: "toolkit",
};

describe("ClaudeCodeAdapter", () => {
  const adapter = new ClaudeCodeAdapter();

  it("should handle multi-line descriptions correctly", () => {
    const skill = {
      ...mockSkill,
      frontmatter: { ...mockSkill.frontmatter, activation: { "claude-code": "model" } },
    };

    const outputs = adapter.translateSkill(skill, mockProfile);
    expect(outputs).toHaveLength(1);
    expect(outputs[0].relativePath).toBe("skills/test-skill/SKILL.md");
    expect(outputs[0].content).toContain("description: |");
    expect(outputs[0].content).toContain("  line 1");
    expect(outputs[0].content).toContain("  line 2");
  });
});

describe("WindsurfAdapter", () => {
  const adapter = new WindsurfAdapter();

  it("should translate skill correctly with multi-line description", () => {
    const outputs = adapter.translateSkill(mockSkill, mockProfile);
    expect(outputs).toHaveLength(2);

    const rule = outputs.find(o => o.relativePath === "rules/test-skill.md");
    expect(rule).toBeDefined();
    expect(rule?.content).toContain("description: |");
    expect(rule?.content).toContain("  line 1");
    expect(rule?.content).toContain("  line 2");
    expect(rule?.content).toContain("trigger: model_decision");

    const skill = outputs.find(o => o.relativePath === "skills/test-skill/SKILL.md");
    expect(skill).toBeDefined();
    expect(skill?.content).toContain("name: test-skill");
  });

  it("should respect activation trigger and globs", () => {
    const skill: Skill = {
      ...mockSkill,
      frontmatter: {
        ...mockSkill.frontmatter,
        activation: { windsurf: "manual" },
        globs: "*.ts",
      },
    };

    const outputs = adapter.translateSkill(skill, mockProfile);
    const rule = outputs.find(o => o.relativePath === "rules/test-skill.md");
    expect(rule?.content).toContain("trigger: manual");
    expect(rule?.content).toContain('globs: "*.ts"');
  });

  it("should translate global rules", () => {
    const outputs = adapter.translateGlobal([mockSkill], mockProfile);
    expect(outputs).toHaveLength(1);
    expect(outputs[0].relativePath).toBe("global_rules.md");
    expect(outputs[0].content).toContain("# Agent Toolkit — Global Rules");
    expect(outputs[0].content).toContain("## test-skill");
    expect(outputs[0].content).toContain("line 1\nline 2");
  });

  it("should warn when global rules exceed limit", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const longSkill: Skill = {
      ...mockSkill,
      frontmatter: { ...mockSkill.frontmatter, description: "a".repeat(7000) },
    };

    adapter.translateGlobal([longSkill], mockProfile);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("exceed 6,000 char limit"));
    consoleSpy.mockRestore();
  });
});

describe("CursorAdapter", () => {
  const adapter = new CursorAdapter();

  it("should translate skill correctly with multi-line description", () => {
    const outputs = adapter.translateSkill(mockSkill, mockProfile);
    expect(outputs).toHaveLength(2);

    const rule = outputs.find(o => o.relativePath === "rules/test-skill.mdc");
    expect(rule).toBeDefined();
    expect(rule?.content).toContain("description: |");
    expect(rule?.content).toContain("  line 1");
    expect(rule?.content).toContain("  line 2");
    expect(rule?.content).toContain("alwaysApply: false");

    const skill = outputs.find(o => o.relativePath === "skills/test-skill/SKILL.md");
    expect(skill).toBeDefined();
    expect(skill?.content).toContain("name: test-skill");
  });

  it("should handle 'always' activation and globs", () => {
    const skill: Skill = {
      ...mockSkill,
      frontmatter: {
        ...mockSkill.frontmatter,
        activation: { cursor: "always" },
        globs: "*.js",
      },
    };

    const outputs = adapter.translateSkill(skill, mockProfile);
    const rule = outputs.find(o => o.relativePath === "rules/test-skill.mdc");
    expect(rule?.content).toContain("alwaysApply: true");
    expect(rule?.content).toContain('globs: "*.js"');
  });

  it("should handle 'manual' activation", () => {
    const skill: Skill = {
      ...mockSkill,
      frontmatter: {
        ...mockSkill.frontmatter,
        activation: { cursor: "manual" },
      },
    };

    const outputs = adapter.translateSkill(skill, mockProfile);
    const skillOutput = outputs.find(o => o.relativePath === "skills/test-skill/SKILL.md");
    expect(skillOutput?.content).toContain("disable-model-invocation: true");
  });
});
