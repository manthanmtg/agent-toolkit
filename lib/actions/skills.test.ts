import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("skills actions", () => {
  let repoRoot: string;
  let originalCwd: string;
  let originalHome: string | undefined;
  let originalCodexHome: string | undefined;
  let actions: any;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME;
    originalCodexHome = process.env.CODEX_HOME;

    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-toolkit-skills-test-"));
    
    process.env.HOME = repoRoot;
    delete process.env.CODEX_HOME;
    process.chdir(repoRoot);
    
    // Create necessary directories
    await fs.mkdir(path.join(repoRoot, ".agent-toolkit", "local-skills"), { recursive: true });
    await fs.mkdir(path.join(repoRoot, "skills"), { recursive: true });
    await fs.mkdir(path.join(repoRoot, "profiles"), { recursive: true });
    
    // Create a dummy toolkit skill
    const toolkitSkillDir = path.join(repoRoot, "skills", "test-domain", "test-skill");
    await fs.mkdir(toolkitSkillDir, { recursive: true });
    await fs.writeFile(path.join(toolkitSkillDir, "SKILL.md"), `---
name: test-skill
description: Toolkit Skill
domain: test-domain
version: 1.0.0
tags: []
author: ""
activation:
  claude-code: model
---
# Toolkit Skill content`);

    vi.resetModules();
    actions = await import("./skills");
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

  describe("listSkillsAction", () => {
    it("lists all skills", async () => {
      const skills = await actions.listSkillsAction();
      expect(skills.length).toBeGreaterThan(0);
      expect(skills.find((s: any) => s.skillName === "test-skill")).toBeDefined();
    });
  });

  describe("getSkillAction", () => {
    it("gets a toolkit skill", async () => {
      const skill = await actions.getSkillAction("test-domain", "test-skill");
      expect(skill).not.toBeNull();
      expect(skill.skillName).toBe("test-skill");
      expect(skill.source).toBe("toolkit");
    });

    it("gets a local skill", async () => {
      // Create a local skill
      const localSkillDir = path.join(repoRoot, ".agent-toolkit", "local-skills", "local-domain", "local-skill");
      await fs.mkdir(localSkillDir, { recursive: true });
      await fs.writeFile(path.join(localSkillDir, "SKILL.md"), `---
name: local-skill
description: Local Skill
domain: local-domain
version: 1.0.0
tags: []
author: ""
activation:
  claude-code: model
---
# Local Skill content`);

      const skill = await actions.getSkillAction("local-domain", "local-skill");
      expect(skill).not.toBeNull();
      expect(skill.skillName).toBe("local-skill");
      expect(skill.source).toBe("local");
    });

    it("returns null for non-existent skill", async () => {
      const skill = await actions.getSkillAction("test-domain", "ghost");
      expect(skill).toBeNull();
    });

    it("returns null for invalid identifiers", async () => {
      const skill = await actions.getSkillAction("Bad Domain", "skill");
      expect(skill).toBeNull();
    });
  });

  describe("createSkillAction", () => {
    it("creates a new toolkit skill", async () => {
      const result = await actions.createSkillAction("new-domain", "new-skill", "New Description");
      expect(result.success).toBe(true);

      const skillPath = path.join(repoRoot, "skills", "new-domain", "new-skill", "SKILL.md");
      const content = await fs.readFile(skillPath, "utf-8");
      expect(content).toContain("name: new-skill");
      expect(content).toContain("domain: new-domain");
      expect(content).toContain("New Description");
    });

    it("fails if skill already exists", async () => {
      const result = await actions.createSkillAction("test-domain", "test-skill", "Desc");
      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });

    it("fails with invalid domain or name", async () => {
      const result = await actions.createSkillAction("Invalid Domain", "new-skill", "Desc");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      const result2 = await actions.createSkillAction("new-domain", "Invalid Name", "Desc");
      expect(result2.success).toBe(false);
      expect(result2.error).toBeDefined();
    });
  });

  describe("installSkillAction", () => {
    it("installs a skill to a tool", async () => {
      // Setup mock tool paths
      const claudePath = path.join(repoRoot, ".claude");
      await fs.mkdir(claudePath, { recursive: true });

      const result = await actions.installSkillAction("test-domain", "test-skill", ["claude-code"]);
      expect(result.success).toBe(true);
      expect(result.installed).toContain("claude-code");

      const installedFile = path.join(claudePath, "skills/test-skill/SKILL.md");
      await expect(fs.access(installedFile)).resolves.toBeUndefined();
      const content = await fs.readFile(installedFile, "utf-8");
      expect(content).toContain("Toolkit Skill content");
    });

    it("handles multiple tools", async () => {
      const claudePath = path.join(repoRoot, ".claude");
      const cursorPath = path.join(repoRoot, ".cursor");
      await fs.mkdir(claudePath, { recursive: true });
      await fs.mkdir(cursorPath, { recursive: true });

      const result = await actions.installSkillAction("test-domain", "test-skill", ["claude-code", "cursor"]);
      expect(result.success).toBe(true);
      expect(result.installed).toContain("claude-code");
      expect(result.installed).toContain("cursor");

      await expect(fs.access(path.join(claudePath, "skills/test-skill/SKILL.md"))).resolves.toBeUndefined();
      await expect(fs.access(path.join(cursorPath, "rules/test-skill.mdc"))).resolves.toBeUndefined();
    });

    it("replaces existing destinations through the shared installer", async () => {
      const codexFile = path.join(
        repoRoot,
        ".codex",
        "skills",
        "test-skill",
        "SKILL.md"
      );
      await fs.mkdir(path.dirname(codexFile), { recursive: true });
      await fs.writeFile(codexFile, "old content", "utf-8");

      const result = await actions.installSkillAction("test-domain", "test-skill", ["codex"]);

      expect(result.success).toBe(true);
      expect(result.installed).toEqual(["codex"]);
      await expect(fs.readFile(codexFile, "utf-8")).resolves.toContain(
        "Toolkit Skill content"
      );
      const backups = await fs.readdir(path.join(repoRoot, ".agent-toolkit-backup"));
      expect(backups).toHaveLength(1);
    });

    it("installs a standalone Codex skill", async () => {
      const result = await actions.installSkillAction(
        "test-domain",
        "test-skill",
        ["codex"]
      );

      expect(result.success).toBe(true);
      expect(result.installed).toContain("codex");

      const installedFile = path.join(
        repoRoot,
        ".codex",
        "skills",
        "test-skill",
        "SKILL.md"
      );
      await expect(fs.access(installedFile)).resolves.toBeUndefined();
      await expect(fs.readFile(installedFile, "utf-8")).resolves.toContain(
        "Toolkit Skill content"
      );
    });

    it("reports errors for missing tools", async () => {
      // agents-md adapter.translateSkill returns [] by design
      const result = await actions.installSkillAction("test-domain", "test-skill", ["agents-md"]);
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("adapter produced no output");
    });

    it("fails for non-existent skill", async () => {
      const result = await actions.installSkillAction("test-domain", "ghost", ["claude-code"]);
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("Skill not found");
    });
  });

  describe("previewSkillsInstallAction", () => {
    it("previews several skills across several tools", async () => {
      await createToolkitSkill("test-domain", "second-skill", "Second Skill");

      const result = await actions.previewSkillsInstallAction({
        skills: [
          { source: "toolkit", domain: "test-domain", skillName: "test-skill" },
          { source: "toolkit", domain: "test-domain", skillName: "second-skill" },
        ],
        toolIds: ["claude-code", "codex"],
      });

      expect(result.success).toBe(true);
      expect(result.preview.okToInstall).toBe(true);
      expect(result.preview.summary).toMatchObject({
        requestedSkills: 2,
        requestedTools: 2,
        createFiles: 4,
        replaceFiles: 0,
      });
      expect(result.preview.entries[0]).not.toHaveProperty("content");
    });

    it("reports replacements without writing during preview", async () => {
      const codexFile = path.join(
        repoRoot,
        ".codex",
        "skills",
        "test-skill",
        "SKILL.md"
      );
      await fs.mkdir(path.dirname(codexFile), { recursive: true });
      await fs.writeFile(codexFile, "old content", "utf-8");

      const result = await actions.previewSkillsInstallAction({
        skills: [{ source: "toolkit", domain: "test-domain", skillName: "test-skill" }],
        toolIds: ["codex"],
      });

      expect(result.success).toBe(true);
      expect(result.preview.summary.replaceFiles).toBe(1);
      await expect(fs.readFile(codexFile, "utf-8")).resolves.toBe("old content");
    });

    it("returns validation errors for unsupported bulk targets", async () => {
      const result = await actions.previewSkillsInstallAction({
        skills: [{ source: "toolkit", domain: "test-domain", skillName: "test-skill" }],
        toolIds: ["agents-md"],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("AGENTS.md");
    });
  });

  describe("installSkillsAction", () => {
    it("installs several skills across several tools", async () => {
      await createToolkitSkill("test-domain", "second-skill", "Second Skill");

      const result = await actions.installSkillsAction({
        skills: [
          { source: "toolkit", domain: "test-domain", skillName: "test-skill" },
          { source: "toolkit", domain: "test-domain", skillName: "second-skill" },
        ],
        toolIds: ["claude-code", "codex"],
        confirmReplacements: false,
      });

      expect(result.success).toBe(true);
      expect(result.result.status).toBe("success");
      expect(result.result.summary.filesWritten).toBe(4);
      await expect(
        fs.access(path.join(repoRoot, ".claude", "skills", "test-skill", "SKILL.md"))
      ).resolves.toBeUndefined();
      await expect(
        fs.access(path.join(repoRoot, ".codex", "skills", "second-skill", "SKILL.md"))
      ).resolves.toBeUndefined();
    });

    it("loads local skills by exact source during batch install", async () => {
      const localSkillDir = path.join(
        repoRoot,
        ".agent-toolkit",
        "local-skills",
        "test-domain",
        "test-skill"
      );
      await fs.mkdir(localSkillDir, { recursive: true });
      await fs.writeFile(path.join(localSkillDir, "SKILL.md"), `---
name: test-skill
description: Local Skill
domain: test-domain
version: 1.0.0
tags: []
author: ""
activation:
  codex: auto
---
# Local Skill content`);

      const result = await actions.installSkillsAction({
        skills: [{ source: "local", domain: "test-domain", skillName: "test-skill" }],
        toolIds: ["codex"],
        confirmReplacements: false,
      });

      expect(result.success).toBe(true);
      const installed = await fs.readFile(
        path.join(repoRoot, ".codex", "skills", "test-skill", "SKILL.md"),
        "utf-8"
      );
      expect(installed).toContain("Local Skill content");
      expect(installed).not.toContain("Toolkit Skill content");
    });

    it("aborts before writes when replacements are not confirmed", async () => {
      const codexFile = path.join(
        repoRoot,
        ".codex",
        "skills",
        "test-skill",
        "SKILL.md"
      );
      await fs.mkdir(path.dirname(codexFile), { recursive: true });
      await fs.writeFile(codexFile, "old content", "utf-8");

      const result = await actions.installSkillsAction({
        skills: [{ source: "toolkit", domain: "test-domain", skillName: "test-skill" }],
        toolIds: ["codex"],
        confirmReplacements: false,
      });

      expect(result.success).toBe(false);
      expect(result.result.status).toBe("failed");
      expect(result.result.errors.join(" ")).toContain("Replacement confirmation");
      await expect(fs.readFile(codexFile, "utf-8")).resolves.toBe("old content");
    });
  });

  describe("uninstallSkillAction", () => {
    it("uninstalls a skill from a tool", async () => {
      const claudePath = path.join(repoRoot, ".claude");
      const skillPath = path.join(claudePath, "skills/test-skill/SKILL.md");
      await fs.mkdir(path.dirname(skillPath), { recursive: true });
      await fs.writeFile(skillPath, "content");

      const result = await actions.uninstallSkillAction("test-skill", ["claude-code"]);
      expect(result.success).toBe(true);
      expect(result.removed.length).toBeGreaterThan(0);

      await expect(fs.access(skillPath)).rejects.toThrow();
    });

    it("uninstalls a Codex skill", async () => {
      const skillPath = path.join(
        repoRoot,
        ".codex",
        "skills",
        "test-skill",
        "SKILL.md"
      );
      await fs.mkdir(path.dirname(skillPath), { recursive: true });
      await fs.writeFile(skillPath, "content");

      const result = await actions.uninstallSkillAction("test-skill", ["codex"]);

      expect(result.success).toBe(true);
      expect(result.removed).toContain("Codex: skills/test-skill");
      await expect(fs.access(path.dirname(skillPath))).rejects.toThrow();
    });

    it("handles a missing skill gracefully", async () => {
      const result2 = await actions.uninstallSkillAction("test-skill", ["claude-code"]);
      expect(result2.success).toBe(true); // Should be true if no errors even if nothing removed
      expect(result2.removed).toHaveLength(0);
    });
  });

  async function createToolkitSkill(domain: string, skillName: string, description: string) {
    const skillDir = path.join(repoRoot, "skills", domain, skillName);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), `---
name: ${skillName}
description: ${description}
domain: ${domain}
version: 1.0.0
tags: []
author: ""
activation:
  claude-code: model
  codex: auto
---
# ${description} content`);
  }
});
