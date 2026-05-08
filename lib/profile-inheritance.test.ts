import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "./types";

interface RegistryModule {
  loadProfile: (name: string) => Promise<Profile>;
}

describe("profile inheritance", () => {
  let registry: RegistryModule;
  let repoRoot: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-toolkit-inheritance-test-"));
    await fs.mkdir(path.join(repoRoot, "profiles"), { recursive: true });
    process.chdir(repoRoot);
    vi.resetModules();
    const registryModule = await import("./registry");
    registry = {
      loadProfile: registryModule.loadProfile,
    };
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  it("inherits include patterns from parent", async () => {
    await fs.writeFile(
      path.join(repoRoot, "profiles", "base.yaml"),
      "name: base\ninclude:\n  - python/*\n",
      "utf-8"
    );
    await fs.writeFile(
      path.join(repoRoot, "profiles", "child.yaml"),
      "name: child\nextends: base\n",
      "utf-8"
    );

    const profile = await registry.loadProfile("child");
    
    expect(profile.include).toEqual(["python/*"]);
    expect(profile.extends).toBe("base");
  });

  it("overrides include patterns in child", async () => {
    await fs.writeFile(
      path.join(repoRoot, "profiles", "base.yaml"),
      "name: base\ninclude:\n  - python/*\n",
      "utf-8"
    );
    await fs.writeFile(
      path.join(repoRoot, "profiles", "child.yaml"),
      "name: child\nextends: base\ninclude:\n  - docs/*\n",
      "utf-8"
    );

    const profile = await registry.loadProfile("child");
    
    expect(profile.include).toEqual(["docs/*"]);
  });

  it("merges tool configurations", async () => {
    await fs.writeFile(
      path.join(repoRoot, "profiles", "base.yaml"),
      "name: base\ntools:\n  claude-code:\n    enabled: true\n    global_skills: true\n",
      "utf-8"
    );
    await fs.writeFile(
      path.join(repoRoot, "profiles", "child.yaml"),
      "name: child\nextends: base\ntools:\n  cursor:\n    enabled: true\n  claude-code:\n    global_skills: false\n",
      "utf-8"
    );

    const profile = await registry.loadProfile("child");
    
    expect(profile.tools["cursor"]?.enabled).toBe(true);
    expect(profile.tools["claude-code"]?.enabled).toBe(true); // inherited
    expect(profile.tools["claude-code"]?.global_skills).toBe(false); // overridden
  });

  it("detects circular inheritance", async () => {
    await fs.writeFile(
      path.join(repoRoot, "profiles", "a.yaml"),
      "name: a\nextends: b\n",
      "utf-8"
    );
    await fs.writeFile(
      path.join(repoRoot, "profiles", "b.yaml"),
      "name: b\nextends: a\n",
      "utf-8"
    );

    await expect(registry.loadProfile("a")).rejects.toThrow("Circular inheritance detected");
  });

  it("handles multi-level inheritance", async () => {
    await fs.writeFile(
      path.join(repoRoot, "profiles", "base.yaml"),
      "name: base\ninclude:\n  - python/*\n",
      "utf-8"
    );
    await fs.writeFile(
      path.join(repoRoot, "profiles", "mid.yaml"),
      "name: mid\nextends: base\nexclude:\n  - tag:legacy\n",
      "utf-8"
    );
    await fs.writeFile(
      path.join(repoRoot, "profiles", "top.yaml"),
      "name: top\nextends: mid\n",
      "utf-8"
    );

    const profile = await registry.loadProfile("top");
    
    expect(profile.include).toEqual(["python/*"]);
    expect(profile.exclude).toEqual(["tag:legacy"]);
  });
});
