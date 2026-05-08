import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("local-skills actions", () => {
  let repoRoot: string;
  let originalCwd: string;
  let originalHome: string | undefined;
  let actions: any;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME;

    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-toolkit-actions-test-"));
    
    // Setup fake home for local skills
    process.env.HOME = repoRoot;
    process.chdir(repoRoot);
    
    // Create necessary directories
    await fs.mkdir(path.join(repoRoot, ".agent-toolkit", "local-skills"), { recursive: true });
    await fs.mkdir(path.join(repoRoot, "skills"), { recursive: true });
    await fs.mkdir(path.join(repoRoot, "profiles"), { recursive: true });

    vi.resetModules();
    actions = await import("./local-skills");
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

  describe("createLocalSkillAction", () => {
    it("creates a new local skill with valid identifiers", async () => {
      const result = await actions.createLocalSkillAction("test-domain", "test-skill", "Test Description");
      expect(result.success).toBe(true);

      const skillPath = path.join(repoRoot, ".agent-toolkit", "local-skills", "test-domain", "test-skill", "SKILL.md");
      const content = await fs.readFile(skillPath, "utf-8");
      expect(content).toContain("name: test-skill");
      expect(content).toContain("domain: test-domain");
      expect(content).toContain("Test Description");
    });

    it("fails with invalid identifiers", async () => {
      const result = await actions.createLocalSkillAction("Invalid Domain", "test-skill", "Desc");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid domain");

      const result2 = await actions.createLocalSkillAction("test-domain", "Test Skill", "Desc");
      expect(result2.success).toBe(false);
      expect(result2.error).toContain("Invalid name");
    });

    it("fails if skill already exists", async () => {
      await actions.createLocalSkillAction("test-domain", "test-skill", "Desc");
      const result = await actions.createLocalSkillAction("test-domain", "test-skill", "Desc");
      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });
  });

  describe("getLocalSkillRawAction", () => {
    it("returns raw content of an existing skill", async () => {
      await actions.createLocalSkillAction("test-domain", "test-skill", "Desc");
      const result = await actions.getLocalSkillRawAction("test-domain", "test-skill");
      expect(result).not.toBeNull();
      expect(result?.content).toContain("name: test-skill");
    });

    it("returns null for non-existent skill", async () => {
      const result = await actions.getLocalSkillRawAction("test-domain", "ghost");
      expect(result).toBeNull();
    });

    it("returns null for invalid identifiers", async () => {
      const result = await actions.getLocalSkillRawAction("Bad Domain", "skill");
      expect(result).toBeNull();
    });
  });

  describe("updateLocalSkillAction", () => {
    it("updates existing skill content", async () => {
      await actions.createLocalSkillAction("test-domain", "test-skill", "Desc");
      
      const newContent = `---
name: test-skill
description: Updated
domain: test-domain
version: 1.1.0
tags: []
author: ""
activation:
  claude-code: model
---
# Updated Title`;

      const result = await actions.updateLocalSkillAction("test-domain", "test-skill", newContent);
      expect(result.success).toBe(true);

      const saved = await actions.getLocalSkillRawAction("test-domain", "test-skill");
      expect(saved?.content).toBe(newContent);
    });

    it("fails with invalid frontmatter", async () => {
      await actions.createLocalSkillAction("test-domain", "test-skill", "Desc");
      const result = await actions.updateLocalSkillAction("test-domain", "test-skill", "invalid yaml");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid frontmatter");
    });

    it("fails if skill does not exist", async () => {
      const validContent = "---\nname: ghost\ndescription: ghost\ndomain: test-domain\nversion: 1.0.0\ntags: []\nauthor: ''\nactivation:\n  claude-code: model\n---\ncontent";
      const result = await actions.updateLocalSkillAction("test-domain", "ghost", validContent);
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("deleteLocalSkillAction", () => {
    it("deletes an existing skill and its directory", async () => {
      await actions.createLocalSkillAction("test-domain", "test-skill", "Desc");
      const result = await actions.deleteLocalSkillAction("test-domain", "test-skill");
      expect(result.success).toBe(true);

      const skillDir = path.join(repoRoot, ".agent-toolkit", "local-skills", "test-domain", "test-skill");
      await expect(fs.access(skillDir)).rejects.toThrow();
    });

    it("cleans up the domain directory if it becomes empty", async () => {
      await actions.createLocalSkillAction("test-domain", "test-skill", "Desc");
      await actions.deleteLocalSkillAction("test-domain", "test-skill");

      const domainDir = path.join(repoRoot, ".agent-toolkit", "local-skills", "test-domain");
      await expect(fs.access(domainDir)).rejects.toThrow();
    });

    it("does not delete domain directory if other skills remain", async () => {
      await actions.createLocalSkillAction("test-domain", "skill-1", "Desc");
      await actions.createLocalSkillAction("test-domain", "skill-2", "Desc");
      
      await actions.deleteLocalSkillAction("test-domain", "skill-1");

      const domainDir = path.join(repoRoot, ".agent-toolkit", "local-skills", "test-domain");
      const skill2Dir = path.join(domainDir, "skill-2");
      await expect(fs.access(domainDir)).resolves.toBeUndefined();
      await expect(fs.access(skill2Dir)).resolves.toBeUndefined();
    });

    it("fails if skill does not exist", async () => {
      const result = await actions.deleteLocalSkillAction("test-domain", "ghost");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("getLocalSkillAction", () => {
    it("loads a skill object for an existing skill", async () => {
      await actions.createLocalSkillAction("test-domain", "test-skill", "Desc");
      const skill = await actions.getLocalSkillAction("test-domain", "test-skill");
      expect(skill).not.toBeNull();
      expect(skill?.skillName).toBe("test-skill");
      expect(skill?.domain).toBe("test-domain");
      expect(skill?.source).toBe("local");
    });

    it("returns null for non-existent skill", async () => {
      const skill = await actions.getLocalSkillAction("test-domain", "ghost");
      expect(skill).toBeNull();
    });
  });
});
