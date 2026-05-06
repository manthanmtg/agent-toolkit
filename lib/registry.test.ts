import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Profile, Skill } from "./types";

interface RegistryModule {
  filterSkillsByProfile: (skills: Skill[], profile: Profile) => Skill[];
  loadAllProfilesWithDiagnostics: () => Promise<{
    profiles: Profile[];
    invalidFiles: Array<{ file: string; error: string }>;
  }>;
  loadProfile: (name: string) => Promise<Profile>;
  getProfilesDir: () => string;
}

describe("registry", () => {
  let registry: RegistryModule;
  let repoRoot: string;
  let originalCwd: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME;

    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-toolkit-registry-test-"));
    await fs.mkdir(path.join(repoRoot, "profiles"), { recursive: true });

    process.env.HOME = repoRoot;
    process.chdir(repoRoot);
    vi.resetModules();

    const registryModule = await import("./registry");
    registry = {
      filterSkillsByProfile: registryModule.filterSkillsByProfile,
      loadAllProfilesWithDiagnostics: registryModule.loadAllProfilesWithDiagnostics,
      loadProfile: registryModule.loadProfile,
      getProfilesDir: registryModule.getProfilesDir,
    };
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    await fs.rm(repoRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it("filters skills by include/exclude patterns and tags", () => {
    const skills: Skill[] = [
      {
        frontmatter: {
          name: "secure-shell",
          description: "Shell safety checklist",
          domain: "devops",
          tags: ["security", "automation"],
          version: "1.0.0",
        } as any,
        content: "secure shell",
        rawContent: "---",
        path: "skills/devops/secure-shell",
        domain: "devops",
        skillName: "secure-shell",
        supportingFiles: [],
        source: "toolkit",
      },
      {
        frontmatter: {
          name: "typing-rules",
          description: "Type checks",
          domain: "python",
          tags: ["quality"],
          version: "1.0.0",
        } as any,
        content: "typing",
        rawContent: "---",
        path: "skills/python/typing-rules",
        domain: "python",
        skillName: "typing-rules",
        supportingFiles: [],
        source: "toolkit",
      },
      {
        frontmatter: {
          name: "stale-guide",
          description: "Archived rules",
          domain: "python",
          tags: ["legacy", "cleanup"],
          version: "1.0.0",
        } as any,
        content: "legacy",
        rawContent: "---",
        path: "skills/python/stale-guide",
        domain: "python",
        skillName: "stale-guide",
        supportingFiles: [],
        source: "toolkit",
      },
    ];

    const profile: Profile = {
      name: "py-qc",
      description: "python with quality controls",
      include: ["python/*"],
      exclude: ["tag:legacy"],
      tools: {},
    };

    const filtered = registry.filterSkillsByProfile(skills as any, profile);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].skillName).toBe("typing-rules");
  });

  it("filters skills by suffix glob pattern (*/name)", () => {
    const skills: Skill[] = [
      {
        frontmatter: {
          name: "readme",
          description: "desc",
          domain: "docs",
          tags: [],
          version: "1.0.0",
        } as any,
        content: "docs readme",
        rawContent: "---",
        path: "skills/docs/readme",
        domain: "docs",
        skillName: "readme",
        supportingFiles: [],
        source: "toolkit",
      },
      {
        frontmatter: {
          name: "readme",
          description: "desc",
          domain: "other",
          tags: [],
          version: "1.0.0",
        } as any,
        content: "other readme",
        rawContent: "---",
        path: "skills/other/readme",
        domain: "other",
        skillName: "readme",
        supportingFiles: [],
        source: "toolkit",
      },
      {
        frontmatter: {
          name: "not-readme",
          description: "desc",
          domain: "docs",
          tags: [],
          version: "1.0.0",
        } as any,
        content: "not readme",
        rawContent: "---",
        path: "skills/docs/not-readme",
        domain: "docs",
        skillName: "not-readme",
        supportingFiles: [],
        source: "toolkit",
      },
    ];

    const profile: Profile = {
      name: "all-readmes",
      description: "matches readme in any domain",
      include: ["*/readme"],
      exclude: [],
      tools: {},
    };

    const filtered = registry.filterSkillsByProfile(skills as any, profile);

    expect(filtered).toHaveLength(2);
    expect(filtered.map((s) => s.domain)).toContain("docs");
    expect(filtered.map((s) => s.domain)).toContain("other");
  });

  it("matches patterns case-insensitively", () => {
    const skills: Skill[] = [
      {
        frontmatter: {
          name: "Security-Check",
          domain: "Security",
          tags: ["Security", "Audit"],
          version: "1.0.0",
        } as any,
        skillName: "Security-Check",
        domain: "Security",
      } as any,
    ];

    const profile: Profile = {
      name: "case-test",
      include: ["SECURITY/*", "TAG:AUDIT"],
      exclude: [],
      tools: {},
    };

    const filtered = registry.filterSkillsByProfile(skills as any, profile);
    expect(filtered).toHaveLength(1);
  });

  it("includes all skills when include pattern is wildcard", async () => {
    const skills: Skill[] = [
      {
        frontmatter: {
          name: "lint",
          description: "Linting rules",
          domain: "devops",
          tags: ["quality"],
          version: "1.0.0",
        } as any,
        content: "lint",
        rawContent: "---",
        path: "skills/devops/lint",
        domain: "devops",
        skillName: "lint",
        supportingFiles: [],
        source: "toolkit",
      },
      {
        frontmatter: {
          name: "cli",
          description: "CLI helpers",
          domain: "tools",
          tags: ["utility"],
          version: "1.0.0",
        } as any,
        content: "cli",
        rawContent: "---",
        path: "skills/tools/cli",
        domain: "tools",
        skillName: "cli",
        supportingFiles: [],
        source: "toolkit",
      },
    ];

    const allProfile: Profile = {
      name: "all",
      description: "all skills",
      include: ["*"],
      exclude: [],
      tools: {},
    };

    const filtered = registry.filterSkillsByProfile(skills as any, allProfile);

    expect(filtered).toHaveLength(2);
    expect(filtered).toEqual(skills);
  });

  it("loads a valid profile from the active repo root", async () => {
    await fs.writeFile(
      path.join(repoRoot, "profiles", "dev.yaml"),
      "name: dev\n" +
        "description: Development\n" +
        "include:\n  - python/*\n  - tag:quality\nexclude:\n  - old/*\n" +
        "tools:\n  claude-code:\n    enabled: true\n",
      "utf-8"
    );

    const profile = await registry.loadProfile("dev");

    expect(profile).toMatchObject({
      name: "dev",
      description: "Development",
      include: ["python/*", "tag:quality"],
      exclude: ["old/*"],
      tools: {
        "claude-code": {
          enabled: true,
        },
      },
    });
  });

  it("rejects invalid profile names", async () => {
    await expect(registry.loadProfile("../bad")).rejects.toThrow("Invalid profile name");
    await expect(registry.loadProfile("  spaced ")).rejects.toThrow("Invalid profile name");
  });

  it("reports valid and invalid profiles when loading all profiles", async () => {
    await fs.writeFile(
      path.join(repoRoot, "profiles", "valid.yaml"),
      "name: valid\ndescription: valid profile\n",
      "utf-8"
    );
    await fs.writeFile(
      path.join(repoRoot, "profiles", "invalid.yaml"),
      "name: 7bad\ninclude: 5\n",
      "utf-8"
    );

    const { profiles, invalidFiles } = await registry.loadAllProfilesWithDiagnostics();

    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({ name: "valid", description: "valid profile" });
    expect(invalidFiles).toHaveLength(1);
    expect(invalidFiles[0].file).toBe("invalid.yaml");
    expect(invalidFiles[0].error).toContain("Validation error");
  });

  it("returns the active profiles directory path", () => {
    expect(registry.getProfilesDir()).toBe(path.join(repoRoot, "profiles"));
  });
});
