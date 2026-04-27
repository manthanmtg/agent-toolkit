import { afterEach, describe, expect, it, vi } from "vitest";
import path from "path";

import { detectTools, getGlobalPath } from "./detector";

const mockedAccess = vi.fn();
const mockedExec = vi.fn();

vi.mock("fs/promises", () => ({
  access: mockedAccess,
}));

vi.mock("child_process", () => ({
  exec: mockedExec,
}));

describe("detector", () => {
  const home = process.env.HOME || process.env.USERPROFILE || "~";

  afterEach(() => {
    mockedAccess.mockReset();
    mockedExec.mockReset();
  });

  it("returns all tool checks including AGENTS.md", async () => {
    mockedAccess.mockRejectedValue(new Error("missing"));
    mockedExec.mockRejectedValue(new Error("missing"));

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
      globalPath: undefined,
    });
  });

  it("detects tools by binary presence when available", async () => {
    mockedAccess.mockRejectedValue(new Error("missing"));
    mockedExec.mockImplementation(async (command: string) => {
      if (command === "which cursor") {
        return { stdout: "/usr/bin/cursor", stderr: "" };
      }
      throw new Error("not found");
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

    mockedExec.mockRejectedValue(new Error("not found"));
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
    mockedExec.mockRejectedValue(new Error("not found"));

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
    mockedExec.mockResolvedValue({ stdout: "/usr/local/bin/codex", stderr: "" });
    mockedAccess.mockResolvedValue(undefined);

    await detectTools();

    expect(mockedAccess).toHaveBeenNthCalledWith(1, path.join(home, ".claude"));
    expect(mockedExec).toHaveBeenCalledWith("which claude");
    expect(mockedExec).toHaveBeenCalledWith("which cursor");
    expect(mockedExec).toHaveBeenCalledWith("which windsurf");
    expect(mockedExec).toHaveBeenCalledWith("which opencode");
    expect(mockedExec).toHaveBeenCalledWith("which codex");
  });
});
