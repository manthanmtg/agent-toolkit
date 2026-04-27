import { describe, expect, it } from "vitest";

import {
  ActivationSchema,
  ProfileSchema,
  SkillFrontmatterSchema,
  TOOL_IDS,
} from "./types";

describe("SkillFrontmatterSchema", () => {
  it("applies defaults for optional fields", () => {
    const parsed = SkillFrontmatterSchema.parse({
      name: "test-skill",
      description: "A focused skill",
      domain: "qa",
    });

    expect(parsed).toMatchObject({
      version: "1.0.0",
      tags: [],
      depends_on: [],
      activation: {
        "claude-code": "model",
        cursor: "auto",
        windsurf: "model_decision",
        opencode: "model",
        codex: "auto",
      },
    });
  });

  it("accepts all optional fields", () => {
    const parsed = SkillFrontmatterSchema.parse({
      name: "coverage-skill",
      description: "Covers schema behavior",
      domain: "testing",
      version: "2.1.0",
      tags: ["test", "schema"],
      author: "agent",
      activation: {
        cursor: "always",
      },
      globs: "**/*.ts",
      depends_on: ["other-skill"],
    });

    expect(parsed.tags).toEqual(["test", "schema"]);
    expect(parsed.author).toBe("agent");
    expect(parsed.version).toBe("2.1.0");
    expect(parsed.globs).toBe("**/*.ts");
    expect(parsed.depends_on).toEqual(["other-skill"]);
    expect(parsed.activation).toMatchObject({
      "claude-code": "model",
      cursor: "always",
      windsurf: "model_decision",
      opencode: "model",
      codex: "auto",
    });
  });

  it("rejects invalid skill identifiers", () => {
    expect(() =>
      SkillFrontmatterSchema.parse({
        name: "Invalid_Skill",
        description: "bad",
        domain: "testing",
      })
    ).toThrow();
  });

  it("rejects an empty description", () => {
    expect(() =>
      SkillFrontmatterSchema.parse({
        name: "good-skill",
        description: "",
        domain: "testing",
      })
    ).toThrow();
  });
});

describe("ActivationSchema", () => {
  it("defaults to conservative activation settings", () => {
    expect(ActivationSchema.parse({})).toEqual({
      "claude-code": "model",
      cursor: "auto",
      windsurf: "model_decision",
      opencode: "model",
      codex: "auto",
    });
  });

  it("keeps explicit cursor override", () => {
    expect(
      ActivationSchema.parse({
        cursor: "always",
      })
    ).toMatchObject({ cursor: "always" });
  });

  it("rejects invalid activation mode", () => {
    expect(() =>
      ActivationSchema.parse({
        cursor: "sometimes",
      })
    ).toThrow();
  });
});

describe("ProfileSchema", () => {
  it("fills omitted fields with defaults", () => {
    const parsed = ProfileSchema.parse({
      name: "team-profile",
      tools: {},
    });

    expect(parsed).toMatchObject({
      description: "",
      include: ["*"],
      exclude: [],
      tools: {},
    });
  });

  it("accepts custom tools map and strips unknown keys", () => {
    const parsed = ProfileSchema.parse({
      name: "custom-profile",
      tools: {
        "claude-code": {
          enabled: false,
          max_rule_length: 300,
        },
      },
    });

    expect(parsed.tools["claude-code"]).toEqual({
      enabled: false,
      max_rule_length: 300,
      global_skills: undefined,
      default_trigger: undefined,
      max_bytes: undefined,
    });
  });

  it("requires include entries to be strings", () => {
    expect(() =>
      ProfileSchema.parse({
        name: "bad-profile",
        include: [1, 2],
      })
    ).toThrow();
  });
});

describe("tool constants", () => {
  it("contains the full set of supported tool ids", () => {
    expect(TOOL_IDS).toEqual([
      "claude-code",
      "cursor",
      "windsurf",
      "opencode",
      "codex",
      "agents-md",
    ]);
  });
});
