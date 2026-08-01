import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BulkSkillInstallInput } from "./types";

describe("skill installer service", () => {
  let repoRoot: string;
  let originalCwd: string;
  let originalHome: string | undefined;
  let originalCodexHome: string | undefined;
  let installer: typeof import("./skill-installer");

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME;
    originalCodexHome = process.env.CODEX_HOME;

    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-toolkit-installer-test-"));
    process.env.HOME = repoRoot;
    delete process.env.CODEX_HOME;
    process.chdir(repoRoot);

    await fs.mkdir(path.join(repoRoot, "skills", "testing", "alpha"), { recursive: true });
    await fs.mkdir(path.join(repoRoot, "skills", "testing", "beta"), { recursive: true });
    await fs.mkdir(path.join(repoRoot, ".agent-toolkit", "local-skills", "testing", "alpha"), { recursive: true });
    await fs.mkdir(path.join(repoRoot, "profiles"), { recursive: true });

    await writeSkill("skills/testing/alpha", "Toolkit Alpha");
    await writeSkill("skills/testing/beta", "Toolkit Beta");
    await writeSkill(".agent-toolkit/local-skills/testing/alpha", "Local Alpha");

    vi.resetModules();
    installer = await import("./skill-installer");
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    await fs.rm(repoRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it("plans several skills across several tools without exposing generated content", async () => {
    const input: BulkSkillInstallInput = {
      skills: [
        { source: "toolkit", domain: "testing", skillName: "alpha" },
        { source: "toolkit", domain: "testing", skillName: "beta" },
      ],
      toolIds: ["claude-code", "codex"],
    };

    const preview = installer.toPublicInstallPreview(
      await installer.buildSkillInstallPlan(input)
    );

    expect(preview.okToInstall).toBe(true);
    expect(preview.summary).toMatchObject({
      requestedSkills: 2,
      requestedTools: 2,
      createFiles: 4,
      replaceFiles: 0,
      blockers: 0,
    });
    expect(preview.entries).toHaveLength(4);
    expect(preview.entries[0]).not.toHaveProperty("content");
    expect(preview.entries.every((entry) => entry.displayPath.startsWith("~"))).toBe(true);
  });

  it("loads local and toolkit skills by exact source", async () => {
    const input: BulkSkillInstallInput = {
      skills: [{ source: "local", domain: "testing", skillName: "alpha" }],
      toolIds: ["codex"],
    };

    const plan = await installer.buildSkillInstallPlan(input);
    const result = await installer.executeSkillInstallPlan(plan, false);

    expect(result.status).toBe("success");
    const installed = await fs.readFile(
      path.join(repoRoot, ".codex", "skills", "alpha", "SKILL.md"),
      "utf-8"
    );
    expect(installed).toContain("Local Alpha");
    expect(installed).not.toContain("Toolkit Alpha");
  });

  it("blocks duplicate destinations before writing", async () => {
    await fs.mkdir(path.join(repoRoot, "skills", "other", "alpha"), { recursive: true });
    await writeSkill("skills/other/alpha", "Other Alpha", {
      domain: "other",
      name: "alpha",
    });

    const preview = installer.toPublicInstallPreview(
      await installer.buildSkillInstallPlan({
        skills: [
          { source: "toolkit", domain: "testing", skillName: "alpha" },
          { source: "toolkit", domain: "other", skillName: "alpha" },
        ],
        toolIds: ["codex"],
      })
    );

    expect(preview.okToInstall).toBe(false);
    expect(preview.summary.blockers).toBe(2);
    expect(preview.entries.map((entry) => entry.blockers.join(" ")).join(" ")).toContain(
      "conflicts with"
    );
  });

  it("requires confirmation before replacing any existing destination", async () => {
    const existingPath = path.join(repoRoot, ".codex", "skills", "alpha", "SKILL.md");
    await fs.mkdir(path.dirname(existingPath), { recursive: true });
    await fs.writeFile(existingPath, "existing content", "utf-8");

    const plan = await installer.buildSkillInstallPlan({
      skills: [{ source: "toolkit", domain: "testing", skillName: "alpha" }],
      toolIds: ["codex"],
    });
    const preview = installer.toPublicInstallPreview(plan);

    expect(preview.summary.replaceFiles).toBe(1);

    const result = await installer.executeSkillInstallPlan(plan, false);

    expect(result.status).toBe("failed");
    expect(result.errors.join(" ")).toContain("Replacement confirmation");
    await expect(fs.readFile(existingPath, "utf-8")).resolves.toBe("existing content");
  });

  it("backs up an existing destination before writing replacement content", async () => {
    const existingPath = path.join(repoRoot, ".codex", "skills", "alpha", "SKILL.md");
    await fs.mkdir(path.dirname(existingPath), { recursive: true });
    await fs.writeFile(existingPath, "existing content", "utf-8");

    const result = await installer.executeSkillInstallPlan(
      await installer.buildSkillInstallPlan({
        skills: [{ source: "toolkit", domain: "testing", skillName: "alpha" }],
        toolIds: ["codex"],
      }),
      true
    );

    expect(result.status).toBe("success");
    await expect(fs.readFile(existingPath, "utf-8")).resolves.toContain("Toolkit Alpha");

    const backups = await fs.readdir(path.join(repoRoot, ".agent-toolkit-backup"));
    expect(backups).toHaveLength(1);
    await expect(
      fs.readFile(path.join(repoRoot, ".agent-toolkit-backup", backups[0]), "utf-8")
    ).resolves.toBe("existing content");
  });

  it("reports exact-source loading blockers without writing files", async () => {
    const preview = installer.toPublicInstallPreview(
      await installer.buildSkillInstallPlan({
        skills: [{ source: "local", domain: "testing", skillName: "beta" }],
        toolIds: ["codex"],
      })
    );

    expect(preview.okToInstall).toBe(false);
    expect(preview.entries[0].blockers.join(" ")).toContain(
      "Skill not found in local registry"
    );
    await expect(
      fs.access(path.join(repoRoot, ".codex", "skills", "beta", "SKILL.md"))
    ).rejects.toThrow();
  });

  async function writeSkill(
    relDir: string,
    body: string,
    options?: { domain?: string; name?: string }
  ) {
    const domain = options?.domain ?? "testing";
    const name = options?.name ?? path.basename(relDir);
    await fs.writeFile(
      path.join(repoRoot, relDir, "SKILL.md"),
      `---
name: ${name}
description: ${body}
domain: ${domain}
version: 1.0.0
tags: []
author: ""
activation:
  claude-code: model
---
# ${body}

${body} content`
    );
  }
});
