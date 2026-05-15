import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DoctorCheck, Manifest } from "./types";

const detectTools = vi.fn();
const loadAllSkills = vi.fn();
const loadAllProfilesWithDiagnostics = vi.fn();
const getRepoRoot = vi.fn();
const loadManifest = vi.fn();

vi.mock("./detector", () => ({
  detectTools,
}));

vi.mock("./registry", () => ({
  getRepoRoot,
  loadAllSkills,
  loadAllProfilesWithDiagnostics,
}));

vi.mock("./safety", () => ({
  loadManifest,
}));

describe("doctor checks", () => {
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-toolkit-doctor-test-"));
    process.chdir(repoRoot);
    vi.resetAllMocks();
    getRepoRoot.mockReturnValue(repoRoot);
  });

  afterEach(async () => {
    process.chdir("/");
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  function toChecks() {
    return import("./doctor").then((m) => m.runDoctorChecks());
  }

  it("returns passing checks for a healthy repository", async () => {
    detectTools.mockResolvedValue([
      { id: "claude-code", detected: true, reason: "found" },
      { id: "cursor", detected: false, reason: "not" },
      { id: "windsurf", detected: false, reason: "not" },
      { id: "opencode", detected: false, reason: "not" },
      { id: "codex", detected: false, reason: "not" },
      { id: "agents-md", detected: true, reason: "always" },
    ]);
    loadAllSkills.mockResolvedValue([{}, {}] as never);
    loadAllProfilesWithDiagnostics.mockResolvedValue({
      profiles: [{ name: "default" }],
      invalidFiles: [],
    });

    await fs.mkdir(path.join(repoRoot, "profiles"), { recursive: true });
    // Note: filesystem write is still good for sanity but mock takes precedence
    await fs.writeFile(path.join(repoRoot, "profiles", "default.yaml"), "name: default\n", "utf-8");

    await fs.mkdir(path.join(repoRoot, "dist"), { recursive: true });
    const symlinkTarget = path.join(repoRoot, "target.txt");
    const symlinkPath = path.join(repoRoot, "valid-link");
    await fs.writeFile(symlinkTarget, "ok", "utf-8");
    await fs.symlink(symlinkTarget, symlinkPath);

    const manifest: Manifest = {
      version: "1.0",
      updatedAt: "2026-05-04T00:00:00.000Z",
      entries: [
        {
          sourcePath: "dummy.md",
          destPath: symlinkPath,
          checksum: "abc",
          tool: "claude-code",
          scope: "global",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    loadManifest.mockResolvedValue(manifest);

    const checks = await toChecks();
    const byName = Object.fromEntries(checks.map((c: DoctorCheck) => [c.name, c]));

    expect(byName["AI Tools Detected"]).toMatchObject({
      status: "pass",
      message: "2 of 6 tools detected",
    });
    expect(byName["Skills Registry"]).toMatchObject({
      status: "pass",
      message: "2 skills loaded successfully",
    });
    expect(byName["Build Output"]).toMatchObject({
      status: "pass",
      message: `dist/ contains ${manifest.entries.length} managed files`,
    });
    expect(byName["Symlinks"]).toMatchObject({ status: "pass", message: "1 valid, 0 broken" });
    expect(byName["Profiles"]).toMatchObject({ status: "pass", message: "1 valid, 0 invalid" });
    expect(byName["Symlinks"].details).toBeUndefined();
    expect(loadManifest).toHaveBeenCalledWith(path.join(repoRoot, "dist"));
  });

  it("returns failure statuses when skills cannot be loaded", async () => {
    detectTools.mockResolvedValue([
      { id: "claude-code", detected: false, reason: "not" },
      { id: "cursor", detected: false, reason: "not" },
      { id: "windsurf", detected: false, reason: "not" },
      { id: "opencode", detected: false, reason: "not" },
      { id: "codex", detected: false, reason: "not" },
      { id: "agents-md", detected: true, reason: "always" },
    ]);
    loadAllSkills.mockRejectedValue(new Error("bad profile"));
    loadAllProfilesWithDiagnostics.mockRejectedValue(new Error("profiles/ directory not found"));
    loadManifest.mockRejectedValue(new Error("missing manifest"));

    const checks = await toChecks();
    const byName = Object.fromEntries(checks.map((c: DoctorCheck) => [c.name, c]));

    expect(byName["AI Tools Detected"]).toMatchObject({ status: "pass", message: "1 of 6 tools detected" });
    expect(byName["Skills Registry"]).toMatchObject({ status: "fail" });
    expect(byName["Build Output"]).toMatchObject({
      status: "warn",
      message: "dist/ not found — run a build first",
    });
    expect(byName["Profiles"]).toMatchObject({ status: "fail", message: "Failed to load profiles: profiles/ directory not found" });
    expect(byName["Symlinks"]).toBeUndefined();
  });

  it("reports broken symlinks", async () => {
    detectTools.mockResolvedValue([
      { id: "claude-code", detected: false, reason: "not" },
      { id: "cursor", detected: false, reason: "not" },
      { id: "windsurf", detected: false, reason: "not" },
      { id: "opencode", detected: false, reason: "not" },
      { id: "codex", detected: false, reason: "not" },
      { id: "agents-md", detected: true, reason: "always" },
    ]);
    loadAllSkills.mockResolvedValue([]);
    loadAllProfilesWithDiagnostics.mockResolvedValue({
      profiles: [{ name: "default" }],
      invalidFiles: [],
    });

    await fs.mkdir(path.join(repoRoot, "profiles"), { recursive: true });
    await fs.writeFile(path.join(repoRoot, "profiles", "default.yaml"), "name: default\n", "utf-8");
    await fs.mkdir(path.join(repoRoot, "dist"), { recursive: true });

    const danglingLink = path.join(repoRoot, "broken-link");
    const missingTarget = path.join(repoRoot, "missing-target.txt");
    await fs.symlink(missingTarget, danglingLink);

    loadManifest.mockResolvedValue({
      version: "1.0",
      updatedAt: "2026-05-04T00:00:00.000Z",
      entries: [
        {
          sourcePath: "broken.md",
          destPath: danglingLink,
          checksum: "123",
          tool: "claude-code",
          scope: "global",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const checks = await toChecks();
    const symlinkCheck = checks.find((c) => c.name === "Symlinks");

    expect(symlinkCheck).toMatchObject({ status: "warn", message: "0 valid, 1 broken" });
    expect(symlinkCheck?.details).toContain(`Dangling: ${danglingLink} → ${missingTarget}`);
  });
});
