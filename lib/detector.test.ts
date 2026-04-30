vi.mock("fs/promises", async () => {
  const actual = await vi.importActual("fs/promises");
  return {
    ...actual,
    access: vi.fn(),
  };
});

vi.mock("child_process", async () => {
  const actual = await vi.importActual("child_process");
  return {
    ...actual,
    exec: vi.fn(),
  };
});

import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as childProcess from "child_process";

import type { DetectedTool } from "./types";

type DetectorModule = typeof import("./detector");

describe("detector", () => {
  let detector: DetectorModule;
  let repoRoot: string;
  let originalHome: string | undefined;
  let originalUserProfile: string | undefined;
  let accessMock: ReturnType<typeof vi.spyOn>;
  let execMock: ReturnType<typeof vi.spyOn>;

  async function loadDetector(home: string | undefined, userProfile?: string): Promise<void> {
    if (home === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = home;
    }

    if (userProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = userProfile;
    }

    vi.resetModules();
    vi.clearAllMocks();

    accessMock = vi.spyOn(fs, "access");
    execMock = vi.spyOn(childProcess, "exec");

    detector = await import("./detector");
  }

  function setDirExists(paths: string[]) {
    accessMock.mockImplementation((target: string | URL) => {
      return paths.includes(typeof target === "string" ? target : target.toString())
        ? Promise.resolve()
        : Promise.reject(new Error("missing"));
    });
  }

  function setBinaryResult(binaries: string[]) {
    execMock.mockImplementation((command: string, options: unknown, callback: unknown) => {
      const resolvedCallback =
        typeof options === "function" ? options : (callback as (error: unknown, stdout: string, stderr: string) => void);
      const binary = command.replace("which ", "");
      if (binaries.includes(binary)) {
        resolvedCallback(null, `/usr/bin/${binary}\n`, "");
      } else {
        const notFound = new Error("not found");
        (notFound as { code?: number }).code = 127;
        resolvedCallback(notFound, "", "");
      }
      return {} as ReturnType<typeof execMock>;
    });
  }

  beforeEach(async () => {
    originalHome = process.env.HOME;
    originalUserProfile = process.env.USERPROFILE;
    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-toolkit-detector-test-"));
    await loadDetector(repoRoot, undefined);
  });

  afterEach(async () => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }

    if (originalUserProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = originalUserProfile;
    }

    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  it("maps global tool paths from HOME", () => {
    expect(detector.getGlobalPath("claude-code")).toBe(path.join(repoRoot, ".claude"));
    expect(detector.getGlobalPath("cursor")).toBe(path.join(repoRoot, ".cursor"));
    expect(detector.getGlobalPath("windsurf")).toBe(path.join(repoRoot, ".codeium", "windsurf"));
    expect(detector.getGlobalPath("opencode")).toBe(path.join(repoRoot, ".config", "opencode"));
    expect(detector.getGlobalPath("codex")).toBe(path.join(repoRoot, ".codex"));
    expect(detector.getGlobalPath("agents-md")).toBeUndefined();
  });

  it("uses HOME fallback to USERPROFILE when HOME is not set", async () => {
    await loadDetector(undefined, repoRoot);

    expect(detector.getGlobalPath("claude-code")).toBe(path.join(repoRoot, ".claude"));
    expect(detector.getGlobalPath("cursor")).toBe(path.join(repoRoot, ".cursor"));
  });

  it("detects a tool when its directory path exists", async () => {
    setDirExists([path.join(repoRoot, ".cursor"), path.join(repoRoot, ".config", "opencode")]);
    setBinaryResult([]);

    const tools = await detector.detectTools();
    const cursor = tools.find((tool): tool is DetectedTool => tool.id === "cursor");
    const opencode = tools.find((tool): tool is DetectedTool => tool.id === "opencode");

    expect(cursor).toMatchObject({
      id: "cursor",
      detected: true,
      reason: `${path.join(repoRoot, ".cursor")} found`,
    });
    expect(opencode).toMatchObject({
      id: "opencode",
      detected: true,
      reason: `${path.join(repoRoot, ".config", "opencode")} found`,
    });
  });

  it("detects a tool when a binary is available on PATH", async () => {
    setDirExists([]);
    setBinaryResult(["cursor", "codex"]);

    const tools = await detector.detectTools();
    const cursor = tools.find((tool): tool is DetectedTool => tool.id === "cursor");
    const codex = tools.find((tool): tool is DetectedTool => tool.id === "codex");

    expect(cursor).toMatchObject({ id: "cursor", detected: true, reason: "cursor binary on PATH" });
    expect(codex).toMatchObject({ id: "codex", detected: true, reason: "codex binary on PATH" });
  });

  it("reports not found state and checked paths when no checks pass", async () => {
    setDirExists([]);
    setBinaryResult([]);

    const tools = await detector.detectTools();
    const expected = (toolId: DetectedTool["id"]) => {
      const base = repoRoot;
      const checks: Record<DetectedTool["id"], string> = {
        "claude-code": `${path.join(base, ".claude")}, claude`,
        cursor: `cursor, ${path.join(base, ".cursor")}`,
        windsurf: `${path.join(base, ".codeium")}, windsurf`,
        opencode: `${path.join(base, ".config", "opencode")}, opencode`,
        codex: `${path.join(base, ".codex")}, codex`,
        "agents-md": "universal cross-tool format (always available)",
      };

      return checks[toolId];
    };

    for (const tool of tools) {
      if (tool.id === "agents-md") {
        expect(tool).toMatchObject({ detected: true, reason: expected(tool.id) });
      } else {
        expect(tool).toMatchObject({
          detected: false,
          reason: `not found (checked: ${expected(tool.id)})`,
        });
      }
    }
  });

  it("includes AGENTS.md as always detected", async () => {
    setDirExists([]);
    setBinaryResult([]);

    const tools = await detector.detectTools();
    const agentsMd = tools.find((tool): tool is DetectedTool => tool.id === "agents-md");

    expect(agentsMd).toMatchObject({
      id: "agents-md",
      detected: true,
      reason: "universal cross-tool format (always available)",
    });
  });
});
