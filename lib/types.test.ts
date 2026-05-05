import { describe, expect, it } from "vitest";

import {
  ActivationSchema,
  ProfileSchema,
  SkillFrontmatterSchema,
  TOOL_LABELS,
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

  it("rejects invalid domain identifiers", () => {
    expect(() =>
      SkillFrontmatterSchema.parse({
        name: "good-skill",
        description: "good",
        domain: "Bad_Domain",
      })
    ).toThrow();

    expect(() =>
      SkillFrontmatterSchema.parse({
        name: "good-skill",
        description: "good",
        domain: "domain with spaces",
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

  it("rejects unsupported glob patterns in include/exclude", () => {
    expect(() =>
      ProfileSchema.parse({
        name: "bad-profile",
        include: ["**/*"],
      })
    ).toThrow("Invalid pattern. Supported:");

    expect(() =>
      ProfileSchema.parse({
        name: "bad-profile",
        exclude: ["domain/*/skill-*"],
      })
    ).toThrow("Invalid pattern. Supported:");
  });

  it("rejects empty tag patterns", () => {
    expect(() =>
      ProfileSchema.parse({
        name: "bad-profile",
        include: ["tag:"],
      })
    ).toThrow("Invalid pattern. Supported:");
  });

  it("rejects invalid tool keys in profile", () => {
    expect(() =>
      ProfileSchema.parse({
        name: "bad-profile",
        tools: {
          "not-a-tool": { enabled: true },
        },
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

  it("keeps tool labels aligned with tool ids", () => {
    expect(Object.keys(TOOL_LABELS)).toEqual(TOOL_IDS);
  });

  it("uses the expected label values for each known tool", () => {
    expect(TOOL_LABELS["claude-code"]).toBe("Claude Code");
    expect(TOOL_LABELS["agents-md"]).toBe("AGENTS.md");
    expect(TOOL_LABELS["opencode"]).toBe("OpenCode");
  });
});

describe("schema edge cases", () => {
  it("strips unknown fields from skill frontmatter when parsing", () => {
    const parsed = SkillFrontmatterSchema.parse({
      name: "test-skill",
      description: "Known fields plus unknown",
      domain: "testing",
      "not-in-schema": "ignored",
    } as Record<string, unknown>);

    expect(parsed).not.toHaveProperty("not-in-schema");
  });

  it("strips unknown activation keys and keeps defaults", () => {
    const parsed = SkillFrontmatterSchema.parse({
      name: "test-skill",
      description: "Activation with extra field",
      domain: "testing",
      activation: {
        cursor: "always",
        "not-in-schema": "ignored",
      } as Record<string, unknown>,
    });

    expect(parsed.activation).toMatchObject({
      "claude-code": "model",
      cursor: "always",
      windsurf: "model_decision",
      opencode: "model",
      codex: "auto",
    });
    expect(parsed.activation).not.toHaveProperty("not-in-schema");
  });

  it("accepts profile names with minimal fields and preserves extends", () => {
    const parsed = ProfileSchema.parse({
      name: "team-profile",
      extends: "base-profile",
      include: ["domain/*"],
    });

    expect(parsed.extends).toBe("base-profile");
    expect(parsed.include).toEqual(["domain/*"]);
  });

  it("strips extra fields from tool-specific profile config", () => {
    const parsed = ProfileSchema.parse({
      name: "tool-config-profile",
      tools: {
        "claude-code": {
          enabled: false,
          global_skills: true,
          unknown_tool_field: "ignored",
        },
      },
    });

    expect(parsed.tools["claude-code"]).toEqual({
      enabled: false,
      global_skills: true,
      max_rule_length: undefined,
      default_trigger: undefined,
      max_bytes: undefined,
    });
    expect((parsed.tools["claude-code"] as Record<string, unknown>)).not.toHaveProperty(
      "unknown_tool_field"
    );
  });
});
