import { describe, it, expect, vi, beforeEach } from "vitest";
import { doctorAction } from "./doctor";
import * as doctor from "../doctor";
import * as detector from "../detector";

vi.mock("../doctor", () => ({
  runDoctorChecks: vi.fn(),
}));

vi.mock("../detector", () => ({
  detectTools: vi.fn(),
}));

describe("doctorAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return aggregated results on success", async () => {
    const mockChecks = [{ name: "Check 1", status: "pass", message: "OK" }];
    const mockTools = [{ id: "cursor", detected: true, reason: "found" }];

    vi.mocked(doctor.runDoctorChecks).mockResolvedValue(mockChecks as any);
    vi.mocked(detector.detectTools).mockResolvedValue(mockTools as any);

    const result = await doctorAction();
    expect(result.checks).toEqual(mockChecks);
    expect(result.tools).toEqual(mockTools);
    expect(result.error).toBeUndefined();
  });

  it("should return error message if any check fails", async () => {
    vi.mocked(doctor.runDoctorChecks).mockRejectedValue(new Error("Doctor check failed"));
    vi.mocked(detector.detectTools).mockResolvedValue([]);

    const result = await doctorAction();
    expect(result.error).toBe("Doctor check failed");
    expect(result.checks).toHaveLength(0);
    expect(result.tools).toHaveLength(0);
  });

  it("should handle non-Error rejection", async () => {
    vi.mocked(doctor.runDoctorChecks).mockRejectedValue("String error");

    const result = await doctorAction();
    expect(result.error).toBe("An unexpected error occurred during diagnostics.");
  });
});
