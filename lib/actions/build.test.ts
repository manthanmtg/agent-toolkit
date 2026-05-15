import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildAction } from "./build";
import { build, cleanDist } from "../builder";

vi.mock("../builder", () => ({
  build: vi.fn(),
  cleanDist: vi.fn(),
}));

describe("buildAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error if clean is not a boolean", async () => {
    // @ts-expect-error testing invalid input
    const result = await buildAction("default", "not-a-boolean");
    expect(result.errors).toContain("Invalid clean flag: expected true/false.");
    expect(result.totalFiles).toBe(0);
    expect(build).not.toHaveBeenCalled();
    expect(cleanDist).not.toHaveBeenCalled();
  });

  it("should use 'default' profile if passed invalid profile string", async () => {
    vi.mocked(build).mockResolvedValue({
      profile: "default",
      totalSkills: 1,
      totalFiles: 1,
      filesByTool: { "claude-code": 1 },
      errors: [],
    });

    // @ts-expect-error testing invalid input
    await buildAction({ foo: "bar" }, false);
    expect(build).toHaveBeenCalledWith("default");

    await buildAction("   ", false);
    expect(build).toHaveBeenCalledWith("default");
  });

  it("should pass trimmed profile name", async () => {
    vi.mocked(build).mockResolvedValue({
      profile: "my-profile",
      totalSkills: 1,
      totalFiles: 1,
      filesByTool: {},
      errors: [],
    });

    await buildAction("  my-profile  ", false);
    expect(build).toHaveBeenCalledWith("my-profile");
  });

  it("should call cleanDist if clean is true", async () => {
    vi.mocked(build).mockResolvedValue({
      profile: "default",
      totalSkills: 1,
      totalFiles: 1,
      filesByTool: {},
      errors: [],
    });

    await buildAction("default", true);
    expect(cleanDist).toHaveBeenCalled();
    expect(build).toHaveBeenCalledWith("default");
  });

  it("should return error if cleanDist fails with Error object", async () => {
    vi.mocked(cleanDist).mockRejectedValue(new Error("Permission denied"));

    const result = await buildAction("default", true);
    expect(result.errors).toContain("Failed to clean dist directory: Permission denied");
    expect(result.totalFiles).toBe(0);
    expect(build).not.toHaveBeenCalled();
  });

  it("should return error if cleanDist fails with string", async () => {
    vi.mocked(cleanDist).mockRejectedValue("String error");

    const result = await buildAction("default", true);
    expect(result.errors).toContain("Failed to clean dist directory: String error");
  });

  it("should return error if cleanDist fails with unknown object", async () => {
    vi.mocked(cleanDist).mockRejectedValue({ code: 500 });

    const result = await buildAction("default", true);
    expect(result.errors).toContain("Failed to clean dist directory: Unknown error");
  });

  it("should return error if build fails", async () => {
    vi.mocked(build).mockRejectedValue(new Error("Build exception"));

    const result = await buildAction("default", false);
    expect(result.errors).toContain("Build failed: Build exception");
    expect(result.totalFiles).toBe(0);
  });

  it("should return build result on success", async () => {
    const mockResult = {
      profile: "test-profile",
      totalSkills: 5,
      totalFiles: 10,
      filesByTool: { cursor: 10 },
      errors: [],
    };
    vi.mocked(build).mockResolvedValue(mockResult);

    const result = await buildAction("test-profile", false);
    expect(result).toEqual(mockResult);
    expect(build).toHaveBeenCalledWith("test-profile");
  });
});
