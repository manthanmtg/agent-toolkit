import { describe, it, expect, vi, beforeEach } from "vitest";
import { runInstall } from "./install";
import * as detector from "../detector";
import * as builder from "../builder";
import * as linker from "../linker";
import * as adapters from "../adapters";
import * as registry from "../registry";

vi.mock("../registry", () => ({
  getRepoRoot: vi.fn(() => "/mock/repo"),
  loadProfile: vi.fn(),
}));

vi.mock("../detector", () => ({
  detectTools: vi.fn(),
}));

vi.mock("../builder", () => ({
  build: vi.fn(),
}));

vi.mock("../linker", () => ({
  linkGlobal: vi.fn(),
}));

vi.mock("../adapters", () => ({
  getAllAdapters: vi.fn(),
}));

describe("runInstall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(registry.getRepoRoot).mockReturnValue("/mock/repo");
  });

  it("should handle invalid profile name", async () => {
    const result = await runInstall("invalid profile name!");
    expect(result.buildResult.errors[0]).toContain("Invalid profile name format");
    expect(result.linkResult.errors[0]).toContain("Install flow stopped");
  });

  it("should handle effectively empty profile name", async () => {
    vi.mocked(registry.loadProfile).mockResolvedValue({} as any);
    vi.mocked(detector.detectTools).mockResolvedValue([]);
    vi.mocked(builder.build).mockResolvedValue({ totalSkills: 0, totalFiles: 0, errors: [] });
    vi.mocked(adapters.getAllAdapters).mockReturnValue([]);
    vi.mocked(linker.linkGlobal).mockResolvedValue({ created: [], backedUp: [], errors: [] });

    // @ts-expect-error testing null input
    await runInstall(null);
    expect(registry.loadProfile).toHaveBeenCalledWith("default");
    
    await runInstall("");
    expect(registry.loadProfile).toHaveBeenCalledWith("default");

    await runInstall("   ");
    expect(registry.loadProfile).toHaveBeenCalledWith("default");
  });

  it("should handle missing profile", async () => {
    vi.mocked(registry.loadProfile).mockRejectedValue(new Error("Profile not found"));
    const result = await runInstall("missing");
    expect(result.buildResult.errors[0]).toContain('Invalid profile "missing"');
    expect(result.linkResult.errors[0]).toContain("Install flow stopped");
  });

  it("should handle detection failure", async () => {
    vi.mocked(registry.loadProfile).mockResolvedValue({} as any);
    vi.mocked(detector.detectTools).mockRejectedValue(new Error("Detection failed"));
    const result = await runInstall("default");
    expect(result.buildResult.errors[0]).toContain("Failed to detect installed tools");
    expect(result.linkResult.errors[0]).toContain("Install flow stopped");
  });

  it("should complete full install flow successfully", async () => {
    // Mock loadProfile
    vi.mocked(registry.loadProfile).mockResolvedValue({} as any);

    // Mock detector
    const mockTools = [
      { id: "claude-code", detected: true, reason: "found" },
      { id: "cursor", detected: false, reason: "not found" },
    ];
    vi.mocked(detector.detectTools).mockResolvedValue(mockTools as any);

    // Mock builder
    vi.mocked(builder.build).mockResolvedValue({
      totalSkills: 5,
      totalFiles: 10,
      errors: [],
    } as any);

    // Mock adapters
    const mockAdapter = {
      toolId: "claude-code",
      getGlobalSymlinkTargets: vi.fn().mockReturnValue(new Map([["config", "/home/user/.claude/config"]])),
    };
    vi.mocked(adapters.getAllAdapters).mockReturnValue([mockAdapter as any]);

    // Mock linker
    vi.mocked(linker.linkGlobal).mockResolvedValue({
      created: ["/home/user/.claude/config"],
      backedUp: [],
      errors: [],
    });

    const result = await runInstall("default");

    expect(result.tools).toEqual(mockTools);
    expect(result.buildResult.totalSkills).toBe(5);
    expect(result.linkResult.created).toBe(1);
    expect(result.linkResult.errors).toHaveLength(0);

    expect(builder.build).toHaveBeenCalledWith("default");
    expect(linker.linkGlobal).toHaveBeenCalledWith([
      {
        source: "/mock/repo/dist/claude-code/config",
        destination: "/home/user/.claude/config",
        tool: "claude-code",
        scope: "global",
      },
    ]);
  });

  it("should handle build errors and continue", async () => {
    vi.mocked(registry.loadProfile).mockResolvedValue({} as any);
    vi.mocked(detector.detectTools).mockResolvedValue([]);
    vi.mocked(builder.build).mockResolvedValue({
      totalSkills: 0,
      totalFiles: 0,
      errors: ["Build error 1"],
    } as any);
    vi.mocked(adapters.getAllAdapters).mockReturnValue([]);
    vi.mocked(linker.linkGlobal).mockResolvedValue({ created: [], backedUp: [], errors: [] });

    const result = await runInstall("default");
    expect(result.buildResult.errors).toContain("Build error 1");
  });

  it("should handle build throwing and continue", async () => {
    vi.mocked(registry.loadProfile).mockResolvedValue({} as any);
    vi.mocked(detector.detectTools).mockResolvedValue([]);
    vi.mocked(builder.build).mockRejectedValue(new Error("Build crashed"));
    vi.mocked(adapters.getAllAdapters).mockReturnValue([]);
    vi.mocked(linker.linkGlobal).mockResolvedValue({ created: [], backedUp: [], errors: [] });

    const result = await runInstall("default");
    expect(result.buildResult.errors[0]).toContain("Build failed: Build crashed");
  });

  it("should handle linkGlobal throwing", async () => {
    vi.mocked(registry.loadProfile).mockResolvedValue({} as any);
    vi.mocked(detector.detectTools).mockResolvedValue([]);
    vi.mocked(builder.build).mockResolvedValue({ totalSkills: 0, totalFiles: 0, errors: [] } as any);
    vi.mocked(adapters.getAllAdapters).mockReturnValue([]);
    vi.mocked(linker.linkGlobal).mockRejectedValue(new Error("Link failed"));

    const result = await runInstall("default");
    expect(result.linkResult.errors[0]).toContain("Failed to link global configs: Link failed");
  });
});
