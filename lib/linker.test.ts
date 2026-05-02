import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import {
  createSymlink,
  removeSymlink,
  linkGlobal,
  linkProject,
  unlinkAll,
} from "./linker";
import { backupFile, writeToolkitMarker, checkDuplicate, atomicWrite } from "./safety";

vi.mock("fs/promises");
vi.mock("./safety");

describe("linker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSymlink", () => {
    it("should create a symlink when destination does not exist", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.lstat).mockRejectedValue(new Error("ENOENT"));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.symlink).mockResolvedValue(undefined);

      const result = await createSymlink("/src/skill", "/dest/link");

      expect(fs.symlink).toHaveBeenCalledWith("/src/skill", "/dest/link");
      expect(result).toEqual({ backedUp: null, error: null });
    });

    it("should return error if source does not exist", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

      const result = await createSymlink("/src/skill", "/dest/link");

      expect(result.error).toContain("Source does not exist");
      expect(fs.symlink).not.toHaveBeenCalled();
    });

    it("should do nothing if destination is already a symlink pointing to source", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.lstat).mockResolvedValue({ isSymbolicLink: () => true } as any);
      vi.mocked(fs.readlink).mockResolvedValue("/src/skill");

      const result = await createSymlink("/src/skill", "/dest/link");

      expect(fs.symlink).not.toHaveBeenCalled();
      expect(result).toEqual({ backedUp: null, error: null });
    });

    it("should remove and recreate symlink if it points elsewhere", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.lstat).mockResolvedValue({ isSymbolicLink: () => true } as any);
      vi.mocked(fs.readlink).mockResolvedValue("/other/path");
      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      vi.mocked(fs.symlink).mockResolvedValue(undefined);

      const result = await createSymlink("/src/skill", "/dest/link");

      expect(fs.unlink).toHaveBeenCalledWith("/dest/link");
      expect(fs.symlink).toHaveBeenCalledWith("/src/skill", "/dest/link");
      expect(result).toEqual({ backedUp: null, error: null });
    });

    it("should backup and remove regular file if it exists at destination", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.lstat).mockResolvedValue({ isSymbolicLink: () => false } as any);
      vi.mocked(backupFile).mockResolvedValue("/backup/link");
      vi.mocked(fs.rm).mockResolvedValue(undefined);
      vi.mocked(fs.symlink).mockResolvedValue(undefined);

      const result = await createSymlink("/src/skill", "/dest/link");

      expect(backupFile).toHaveBeenCalledWith("/dest/link");
      expect(fs.rm).toHaveBeenCalledWith("/dest/link", { recursive: true, force: true });
      expect(fs.symlink).toHaveBeenCalledWith("/src/skill", "/dest/link");
      expect(result).toEqual({ backedUp: "/backup/link", error: null });
    });
  });

  describe("removeSymlink", () => {
    it("should remove symlink if it exists", async () => {
      vi.mocked(fs.lstat).mockResolvedValue({ isSymbolicLink: () => true } as any);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await removeSymlink("/dest/link");

      expect(fs.unlink).toHaveBeenCalledWith("/dest/link");
      expect(result).toEqual({ removed: true, error: null });
    });

    it("should not remove if it is not a symlink", async () => {
      vi.mocked(fs.lstat).mockResolvedValue({ isSymbolicLink: () => false } as any);

      const result = await removeSymlink("/dest/link");

      expect(fs.unlink).not.toHaveBeenCalled();
      expect(result.removed).toBe(false);
      expect(result.error).toContain("Not a symlink");
    });

    it("should return removed: false if it does not exist", async () => {
      vi.mocked(fs.lstat).mockRejectedValue(new Error("ENOENT"));

      const result = await removeSymlink("/dest/link");

      expect(result).toEqual({ removed: false, error: null });
    });
  });

  describe("linkGlobal", () => {
    it("should link multiple targets and write markers", async () => {
      vi.mocked(checkDuplicate).mockResolvedValue({ exists: false, isToolkitManaged: false });
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.lstat).mockRejectedValue(new Error("ENOENT"));

      const targets = [
        { source: "/s1", destination: "/d1" },
        { source: "/s2", destination: "/d2" },
      ];

      const result = await linkGlobal(targets as any);

      expect(result.created).toHaveLength(2);
      expect(writeToolkitMarker).toHaveBeenCalledTimes(2);
    });

    it("should backup if duplicate exists and is not toolkit managed", async () => {
      vi.mocked(checkDuplicate).mockResolvedValue({ exists: true, isToolkitManaged: false });
      vi.mocked(backupFile).mockResolvedValue("/backup/d1");
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.lstat).mockRejectedValue(new Error("ENOENT"));

      const targets = [{ source: "/s1", destination: "/d1" }];
      const result = await linkGlobal(targets as any);

      expect(backupFile).toHaveBeenCalledWith("/d1");
      expect(result.backedUp).toContain("/backup/d1");
    });
  });

  describe("linkProject", () => {
    it("should link within project and update .gitignore", async () => {
      const projectPath = "/projects/my-app";
      const targets = [{ source: "/src/skill", destination: "skills/link" }];
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.lstat).mockRejectedValue(new Error("ENOENT"));
      vi.mocked(fs.readFile).mockResolvedValue("node_modules\n");

      const result = await linkProject(projectPath, targets as any);

      expect(result.created).toHaveLength(1);
      expect(result.created[0].destination).toBe(path.resolve(projectPath, "skills/link"));
      expect(atomicWrite).toHaveBeenCalled();
    });

    it("should refuse to link outside project path", async () => {
      const projectPath = "/projects/my-app";
      const targets = [{ source: "/src/skill", destination: "../../outside/link" }];

      const result = await linkProject(projectPath, targets as any);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Refusing to link outside project");
      expect(result.created).toHaveLength(0);
    });
  });

  describe("unlinkAll", () => {
    it("should remove multiple symlinks", async () => {
      vi.mocked(fs.lstat).mockResolvedValue({ isSymbolicLink: () => true } as any);
      
      const result = await unlinkAll(["/d1", "/d2"]);

      expect(result.removed).toBe(2);
      expect(fs.unlink).toHaveBeenCalledTimes(2);
    });
  });
});
