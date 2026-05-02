import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "./types";

interface RegistryModule {
  loadProfile: (name: string) => Promise<Profile>;
}

describe("profile validation", () => {
  let registry: RegistryModule;
  let repoRoot: string;
  let originalCwd: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME;

    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-toolkit-profiles-test-"));
    await fs.mkdir(path.join(repoRoot, "profiles"), { recursive: true });

    process.env.HOME = repoRoot;
    process.chdir(repoRoot);
    vi.resetModules();

    const registryModule = await import("./registry");
    registry = {
      loadProfile: registryModule.loadProfile,
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

  it("enforces kebab-case filenames", async () => {
    await expect(registry.loadProfile("MyProfile")).rejects.toThrow("Invalid profile name");
    await expect(registry.loadProfile("my_profile")).rejects.toThrow("Invalid profile name");
    await expect(registry.loadProfile("my profile")).rejects.toThrow("Invalid profile name");
  });

  it("enforces kebab-case internal name", async () => {
    await fs.writeFile(
      path.join(repoRoot, "profiles", "invalid-name.yaml"),
      "name: Invalid Name\n",
      "utf-8"
    );

    await expect(registry.loadProfile("invalid-name")).rejects.toThrow("Validation error");
  });

  it("enforces filename matches internal name", async () => {
    await fs.writeFile(
      path.join(repoRoot, "profiles", "mismatch.yaml"),
      "name: something-else\n",
      "utf-8"
    );

    await expect(registry.loadProfile("mismatch")).rejects.toThrow("Profile name mismatch");
  });

  it("accepts valid matching kebab-case names", async () => {
    await fs.writeFile(
      path.join(repoRoot, "profiles", "valid-profile.yaml"),
      "name: valid-profile\n",
      "utf-8"
    );

    const profile = await registry.loadProfile("valid-profile");
    expect(profile.name).toBe("valid-profile");
  });
});
