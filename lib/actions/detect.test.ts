import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectTools } from "./detect";
import * as detector from "../detector";

vi.mock("../detector", () => ({
  detectTools: vi.fn(),
}));

describe("detectTools action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return detected tools on success", async () => {
    const mockTools = [{ id: "claude-code", detected: true, reason: "found" }];
    vi.mocked(detector.detectTools).mockResolvedValue(mockTools as any);

    const result = await detectTools();
    expect(result).toEqual(mockTools);
    expect(detector.detectTools).toHaveBeenCalled();
  });

  it("should throw error if detection fails", async () => {
    vi.mocked(detector.detectTools).mockRejectedValue(new Error("Disk error"));

    await expect(detectTools()).rejects.toThrow("Failed to detect tools: Disk error");
  });

  it("should throw generic error if detection fails with non-error object", async () => {
    vi.mocked(detector.detectTools).mockRejectedValue("Unknown crash");

    await expect(detectTools()).rejects.toThrow("Failed to detect tools: Unknown detection error");
  });
});
