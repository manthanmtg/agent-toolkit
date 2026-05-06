import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Profile, Skill } from "./types";

const loadProfile = vi.fn();
const loadAllSkills = vi.fn();
const filterSkillsByProfile = vi.fn();
const getRepoRoot = vi.fn();
const getAllAdapters = vi.fn();
const atomicWrite = vi.fn();
const computeChecksum = vi.fn((content: string) => `checksum:${content.length}`);
const loadManifest = vi.fn();
const saveManifest = vi.fn();
const addManifestEntry = vi.fn();
const checkCharacterLimit = vi.fn();

vi.mock("./registry", () => ({
  getRepoRoot,
  loadProfile,
  loadAllSkills,
  filterSkillsByProfile,
}));

vi.mock("./adapters", () => ({
  getAllAdapters,
  checkCharacterLimit,
}));

vi.mock("./safety", () => ({
  atomicWrite,
  computeChecksum,
  loadManifest,
  saveManifest,
  addManifestEntry,
}));

describe("builder", () => {
  let repoRoot: string;

  const profile: Profile = {
    name: "default",
    description: "Default profile",
    include: ["*"],
    exclude: [],
    tools: {},
  };

  const mockSkill: Skill = {
    skillName: "formatting",
    domain: "code",
    frontmatter: {
      name: "formatting",
      description: "Apply formatting rules",
      domain: "code",
      version: "1.0.0",
      tags: ["quality"],
      author: "tester",
      activation: {},
      depends_on: [],
    },
    content: "content",
    rawContent: "---\nname: formatting\n---\ncontent",
    path: "code/formatting",
    supportingFiles: [],
    source: "toolkit",
  };

  beforeEach(async () => {
    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-toolkit-builder-test-"));
    process.chdir(repoRoot);

    vi.resetAllMocks();

    getRepoRoot.mockReturnValue(repoRoot);
    filterSkillsByProfile.mockReturnValue([mockSkill]);
    loadManifest.mockResolvedValue({
      version: "1.0",
      updatedAt: "2026-01-01T00:00:00.000Z",
      entries: [],
    });
    saveManifest.mockResolvedValue(undefined);
    atomicWrite.mockResolvedValue(undefined);
    checkCharacterLimit.mockReturnValue({
      withinLimit: true,
      currentSize: 0,
      maxSize: Number.POSITIVE_INFINITY,
    });
  });

  afterEach(async () => {
    process.chdir("/");
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  it("builds outputs and writes manifest entries", async () => {
    const adapter = {
      toolId: "claude-code" as const,
      translateSkill: vi.fn().mockReturnValue([
        {
          relativePath: "rules/formatting.md",
          content: "skill rule",
          tool: "claude-code" as const,
          scope: "global" as const,
        },
      ]),
      translateGlobal: vi.fn().mockReturnValue([
        {
          relativePath: "global.md",
          content: "global rules",
          tool: "claude-code" as const,
          scope: "global" as const,
        },
      ]),
    };

    loadProfile.mockResolvedValue(profile);
    loadAllSkills.mockResolvedValue([mockSkill]);
    filterSkillsByProfile.mockReturnValue([mockSkill]);
    getAllAdapters.mockReturnValue([adapter]);

    const { build } = await import("./builder");
    const result = await build("default");

    expect(result).toMatchObject({
      profile: "default",
      totalSkills: 1,
      totalFiles: 2,
      filesByTool: { "claude-code": 2 },
      errors: [],
    });

    expect(atomicWrite).toHaveBeenCalledTimes(2);
    expect(atomicWrite).toHaveBeenCalledWith(
      path.join(repoRoot, "dist", "claude-code", "rules", "formatting.md"),
      "skill rule"
    );
    expect(atomicWrite).toHaveBeenCalledWith(
      path.join(repoRoot, "dist", "claude-code", "global.md"),
      "global rules"
    );
    expect(loadManifest).toHaveBeenCalledWith(path.join(repoRoot, "dist"));
    expect(saveManifest).toHaveBeenCalledWith(path.join(repoRoot, "dist"), expect.any(Object));
    expect(addManifestEntry).toHaveBeenCalledTimes(2);
    expect(checkCharacterLimit).toHaveBeenCalledTimes(2);
  });

  it("returns an error when profile loading fails", async () => {
    loadProfile.mockRejectedValue(new Error("profile missing"));
    const { build } = await import("./builder");

    const result = await build("missing");

    expect(result.errors).toEqual([`Failed to load profile "missing": Error: profile missing`]);
    expect(result.totalFiles).toBe(0);
    expect(loadAllSkills).not.toHaveBeenCalled();
  });

  it("skips outputs with unsafe absolute paths", async () => {
    const adapter = {
      toolId: "../codex" as const,
      translateSkill: vi.fn().mockReturnValue([
        {
          relativePath: "secret-rule.md",
          content: "oops",
          tool: "../codex" as const,
          scope: "global" as const,
        },
      ]),
      translateGlobal: vi.fn().mockReturnValue([]),
    };

    loadProfile.mockResolvedValue(profile);
    loadAllSkills.mockResolvedValue([mockSkill]);
    filterSkillsByProfile.mockReturnValue([mockSkill]);
    getAllAdapters.mockReturnValue([adapter]);

    const { build } = await import("./builder");
    const result = await build("default");

    expect(result.errors).toEqual([
      "Skipped unsafe output path: ../codex/secret-rule.md",
    ]);
    expect(atomicWrite).not.toHaveBeenCalled();
  });

  it("records an error when tool output exceeds the character limit", async () => {
    checkCharacterLimit.mockReturnValue({
      withinLimit: false,
      currentSize: 10,
      maxSize: 3,
    });

    const adapter = {
      toolId: "cursor" as const,
      translateSkill: vi.fn().mockReturnValue([
        {
          relativePath: "rules/too-long.md",
          content: "1234567890",
          tool: "cursor" as const,
          scope: "global" as const,
        },
      ]),
      translateGlobal: vi.fn().mockReturnValue([]),
    };

    loadProfile.mockResolvedValue(profile);
    loadAllSkills.mockResolvedValue([mockSkill]);
    filterSkillsByProfile.mockReturnValue([mockSkill]);
    getAllAdapters.mockReturnValue([adapter]);

    const { build } = await import("./builder");
    const result = await build("default");

    expect(result.errors).toEqual([
      "Output cursor/rules/too-long.md exceeds global limit: 10 > 3 characters.",
    ]);
    expect(atomicWrite).toHaveBeenCalledTimes(1);
  });
});
