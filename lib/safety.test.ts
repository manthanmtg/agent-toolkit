import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addManifestEntry,
  atomicWrite,
  computeChecksum,
  loadManifest,
  saveManifest,
} from "./safety";
import { checkCharacterLimit } from "./adapters";

describe("safety utilities", () => {
  const baseTmpDir: string[] = [];

  beforeEach(async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-toolkit-safety-test-"));
    baseTmpDir.push(dir);
  });

  afterEach(async () => {
    const dir = baseTmpDir.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("atomicWrite creates missing parent directories", async () => {
    const dir = baseTmpDir[baseTmpDir.length - 1];
    const filePath = path.join(dir, "nested", "dir", "payload.txt");

    await atomicWrite(filePath, "ready");

    await expect(fs.readFile(filePath, "utf-8")).resolves.toBe("ready");
  });

  it("computeChecksum is deterministic and format stable", () => {
    const first = computeChecksum("cache me");
    const second = computeChecksum("cache me");
    const different = computeChecksum("cache me with tweak");

    expect(first).toBe(second);
    expect(first).not.toBe(different);
    expect(first).toMatch(/^[0-9a-f]{16}$/);
  });

  it("checkCharacterLimit applies per-tool scoped limits", () => {
    expect(checkCharacterLimit("a".repeat(512), "windsurf", "global")).toMatchObject({
      tool: "windsurf",
      withinLimit: true,
      currentSize: 512,
      maxSize: 6000,
    });

    expect(
      checkCharacterLimit("a".repeat(6100), "windsurf", "global")
    ).toMatchObject({
      withinLimit: false,
      currentSize: 6100,
      maxSize: 6000,
    });

    expect(
      checkCharacterLimit("a".repeat(2048), "opencode", "workspace")
    ).toMatchObject({
      withinLimit: true,
      maxSize: Number.POSITIVE_INFINITY,
    });

    expect(checkCharacterLimit("a", "claude-code", "global")).toMatchObject({
      withinLimit: true,
      maxSize: 32000,
    });
  });

  it("loadManifest returns defaults when manifest file does not exist", async () => {
    const dir = baseTmpDir[baseTmpDir.length - 1];

    const manifest = await loadManifest(dir);

    expect(manifest.version).toBe("1.0");
    expect(manifest.entries).toEqual([]);
    expect(typeof manifest.updatedAt).toBe("string");
  });

  it("saveManifest writes a valid manifest that can be reloaded", async () => {
    const dir = baseTmpDir[baseTmpDir.length - 1];
    const manifest = {
      version: "1.0",
      updatedAt: new Date().toISOString(),
      entries: [],
    };

    await saveManifest(dir, manifest);
    const reloaded = await loadManifest(dir);

    expect(reloaded.version).toBe("1.0");
    expect(reloaded.entries).toEqual([]);
    expect(typeof reloaded.updatedAt).toBe("string");
  });

  it("addManifestEntry adds new entries and refreshes duplicates by destPath", () => {
    const manifest = {
      version: "1.0",
      updatedAt: "2026-01-01T00:00:00Z",
      entries: [
        {
          source: "/old/source.txt",
          destPath: "/dst/path.txt",
          relativePath: "old/path.txt",
          tool: "cursor",
          scope: "global",
          checksum: "old",
          createdAt: "old-time",
        },
      ],
    } as const;

    const mutableManifest = JSON.parse(JSON.stringify(manifest));

    addManifestEntry(mutableManifest, {
      sourcePath: "/new/source.txt",
      destPath: "/dst/path.txt",
      tool: "cursor",
      scope: "global",
      checksum: "new",
    });

    expect(mutableManifest.entries).toHaveLength(1);
    expect(mutableManifest.entries[0]).toMatchObject({
      sourcePath: "/new/source.txt",
      destPath: "/dst/path.txt",
      checksum: "new",
      tool: "cursor",
      scope: "global",
    });
    expect(Date.parse(mutableManifest.entries[0].createdAt)).toBeGreaterThan(0);
  });
});
