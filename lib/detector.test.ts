import { afterEach, describe, expect, it, vi } from "vitest";
import path from "path";
import type { ExecException } from "node:child_process";

import { detectTools, getGlobalPath } from "./detector";

const { mockedAccess, mockedExec } = vi.hoisted(() => ({
  mockedAccess: vi.fn(),
  mockedExec: vi.fn(),
}));

type MockExecCallback = (error: ExecException | null, stdout: string, stderr: string) => void;

vi.mock("fs/promises", () => ({
  default: {
    access: mockedAccess,
  },
  access: mockedAccess,
}));

vi.mock("child_process", () => ({
  exec: mockedExec,
}));

describe("detector", () => {
  const home = process.env.HOME || process.env.USERPROFILE || "~";

  const mockExecSuccess = (stdout: string) => {
    mockedExec.mockImplementation((_command: string, callback?: MockExecCallback) => {
      callback?.(null, stdout, "");
    });
  };

  const mockExecFailure = () => {
    mockedExec.mockImplementation((_command: string, callback?: MockExecCallback) => {
      callback?.(new Error("not found"), "", "");
    });
  };

  afterEach(() => {
    mockedAccess.mockReset();
    mockedExec.mockReset();
  });

  it("returns all tool checks including AGENTS.md", async () => {
    mockedAccess.mockRejectedValue(new Error("missing"));
    mockExecFailure();

    const tools = await detectTools();

    expect(tools).toHaveLength(6);
    expect(tools.map((tool) => tool.id)).toEqual([
      "claude-code",
      "cursor",
      "windsurf",
      "opencode",
      "codex",
      "agents-md",
    ]);
    expect(tools.at(-1)).toMatchObject({
      id: "agents-md",
      detected: true,
      reason: "universal cross-tool format (always available)",
    });
  });

  it("detects tools by binary presence when available", async () => {
    mockedAccess.mockRejectedValue(new Error("missing"));
    mockedExec.mockImplementation((command: string, callback?: MockExecCallback) => {
      if (command === "which cursor") {
        callback?.(null, "/usr/bin/cursor", "");
      } else {
        callback?.(new Error("not found"), "", "");
      }
    });

    const tools = await detectTools();

    const cursor = tools.find((tool) => tool.id === "cursor");
    const windsurf = tools.find((tool) => tool.id === "windsurf");

    expect(cursor).toMatchObject({
      detected: true,
      reason: "cursor binary on PATH",
    });
    expect(cursor?.globalPath).toBe(path.join(home, ".cursor"));

    expect(windsurf).toMatchObject({
      detected: false,
      reason: `not found (checked: ${path.join(home, ".codeium")}, windsurf)`,
    });
  });

  it("detects tools by directory path when binary is not available", async () => {
    const foundDir = path.join(home, ".codeium");

    mockExecFailure();
    mockedAccess.mockImplementation(async (target: string) => {
      if (target === foundDir) {
        return;
      }
      throw new Error("missing");
    });

    const tools = await detectTools();

    const windsurf = tools.find((tool) => tool.id === "windsurf");

    expect(windsurf).toMatchObject({
      detected: true,
      reason: `${foundDir} found`,
    });
  });

  it("reports useful reasons when a tool is not detected", async () => {
    mockedAccess.mockRejectedValue(new Error("missing"));
    mockExecFailure();

    const tools = await detectTools();
    const codex = tools.find((tool) => tool.id === "codex");

    expect(codex).toMatchObject({
      detected: false,
      reason: `not found (checked: ${path.join(home, ".codex")}, codex)`,
    });
  });

  it("maps global paths for supported tools and AGENTS", () => {
    expect(getGlobalPath("claude-code")).toBe(path.join(home, ".claude"));
    expect(getGlobalPath("cursor")).toBe(path.join(home, ".cursor"));
    expect(getGlobalPath("windsurf")).toBe(path.join(home, ".codeium", "windsurf"));
    expect(getGlobalPath("opencode")).toBe(path.join(home, ".config", "opencode"));
    expect(getGlobalPath("codex")).toBe(path.join(home, ".codex"));
    expect(getGlobalPath("agents-md")).toBeUndefined();
  });

  it("short-circuits after first successful check within a tool", async () => {
    mockExecSuccess("/usr/local/bin/codex");
    mockedAccess.mockResolvedValue(undefined);

    await detectTools();

    expect(mockedAccess).toHaveBeenNthCalledWith(1, path.join(home, ".claude"));
    expect(mockedExec).toHaveBeenCalledWith(
      "which cursor",
      expect.any(Function),
    );
    expect(mockedExec).toHaveBeenCalledTimes(1);
  });
});
