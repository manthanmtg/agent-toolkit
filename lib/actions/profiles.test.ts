import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { listProfilesAction, listProfilesWithDiagnosticsAction } from "./profiles";
import * as registry from "../registry";

vi.mock("../registry", () => ({
  loadAllProfiles: vi.fn(),
  loadAllProfilesWithDiagnostics: vi.fn(),
}));

// Mock console.error to keep test output clean
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.clearAllMocks();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe("profiles actions", () => {
  describe("listProfilesAction", () => {
    it("should return profiles on success", async () => {
      const mockProfiles = [{ name: "default" }];
      vi.mocked(registry.loadAllProfiles).mockResolvedValue(mockProfiles as any);

      const result = await listProfilesAction();
      expect(result).toEqual(mockProfiles);
      expect(registry.loadAllProfiles).toHaveBeenCalled();
    });

    it("should return empty array when loadAllProfiles throws an Error", async () => {
      vi.mocked(registry.loadAllProfiles).mockRejectedValue(new Error("File system error"));

      const result = await listProfilesAction();
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith("Failed to list profiles: File system error");
    });

    it("should return empty array when loadAllProfiles throws a string", async () => {
      vi.mocked(registry.loadAllProfiles).mockRejectedValue("String error");

      const result = await listProfilesAction();
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith("Failed to list profiles: String error");
    });

    it("should return empty array when loadAllProfiles throws a generic object", async () => {
      vi.mocked(registry.loadAllProfiles).mockRejectedValue({ code: 500 });

      const result = await listProfilesAction();
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith("Failed to list profiles: Unknown error");
    });
  });

  describe("listProfilesWithDiagnosticsAction", () => {
    it("should return profiles and diagnostics on success", async () => {
      const mockResult = {
        profiles: [{ name: "default" }] as any,
        invalidFiles: [{ file: "bad.yaml", error: "parse error" }],
      };
      vi.mocked(registry.loadAllProfilesWithDiagnostics).mockResolvedValue(mockResult);

      const result = await listProfilesWithDiagnosticsAction();
      expect(result).toEqual({
        profiles: mockResult.profiles,
        invalidProfiles: mockResult.invalidFiles,
      });
      expect(registry.loadAllProfilesWithDiagnostics).toHaveBeenCalled();
    });

    it("should return empty profiles and synthetic invalid profile when Error thrown", async () => {
      vi.mocked(registry.loadAllProfilesWithDiagnostics).mockRejectedValue(new Error("Disk failure"));

      const result = await listProfilesWithDiagnosticsAction();
      expect(result).toEqual({
        profiles: [],
        invalidProfiles: [{ file: "all", error: "Disk failure" }],
      });
    });

    it("should return empty profiles and synthetic invalid profile when string thrown", async () => {
      vi.mocked(registry.loadAllProfilesWithDiagnostics).mockRejectedValue("String failure");

      const result = await listProfilesWithDiagnosticsAction();
      expect(result).toEqual({
        profiles: [],
        invalidProfiles: [{ file: "all", error: "String failure" }],
      });
    });

    it("should return empty profiles and synthetic invalid profile when unknown object thrown", async () => {
      vi.mocked(registry.loadAllProfilesWithDiagnostics).mockRejectedValue(null);

      const result = await listProfilesWithDiagnosticsAction();
      expect(result).toEqual({
        profiles: [],
        invalidProfiles: [{ file: "all", error: "Unknown error" }],
      });
    });
  });
});
