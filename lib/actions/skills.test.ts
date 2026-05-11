import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("skills actions", () => {
  let repoRoot: string;
  let originalCwd: string;
  let originalHome: string | undefined;
  let actions: any;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME;

    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-toolkit-skills-test-"));
    
    process.env.HOME = repoRoot;
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

    it("handles missing tool gracefully", async () => {
      // If tool path is not detected, it should skip
      const result = await actions.uninstallSkillAction("test-skill", ["codex"]);
      // codex returns path.join(HOME, ".codex") which exists in our repoRoot? 
      // Wait, we didn't create it.
      // But getGlobalPath just returns the string.
      // detector.ts's detectTools checks if it exists, but actions/skills.ts calls getGlobalPath directly.
      
      // Let's see what happens if the file doesn't exist.
      // uninstallSkillAction:
      // try { await fs.access(fullPath); await fs.rm(fullPath, ...); removed.push(...); } catch (err) { if (err.code === "ENOENT") continue; ... }
      
      const result2 = await actions.uninstallSkillAction("test-skill", ["claude-code"]);
      expect(result2.success).toBe(true); // Should be true if no errors even if nothing removed
      expect(result2.removed).toHaveLength(0);
    });
  });
});
