"use server";

import path from "path";
import { detectTools } from "../detector";
import { build } from "../builder";
import { linkGlobal } from "../linker";
import { getAllAdapters } from "../adapters";
import { getRepoRoot } from "../registry";
import type { DetectedTool, SymlinkTarget } from "../types";

export interface InstallStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  message?: string;
}

export interface InstallResult {
  tools: DetectedTool[];
  buildResult: {
    totalSkills: number;
    totalFiles: number;
    errors: string[];
  };
  linkResult: {
    created: number;
    backedUp: number;
    errors: string[];
  };
}

export async function runInstall(
  profileName: string = "default"
): Promise<InstallResult> {
  // Step 1: Detect tools
  const tools = await detectTools();

  // Step 2: Build
  const buildResult = await build(profileName);

  // Step 3: Link global configs
  const distDir = path.join(getRepoRoot(), "dist");
  const adapters = getAllAdapters();
  const targets: SymlinkTarget[] = [];

  for (const adapter of adapters) {
    const tool = tools.find((t) => t.id === adapter.toolId);
    if (!tool?.detected && adapter.toolId !== "agents-md") continue;

    const symlinkMap = adapter.getGlobalSymlinkTargets();
    for (const [distRel, systemPath] of symlinkMap) {
      targets.push({
        source: path.join(distDir, adapter.toolId, distRel),
        destination: systemPath,
        tool: adapter.toolId,
        scope: "global",
      });
    }
  }

  const linkResult = await linkGlobal(targets);

  return {
    tools,
    buildResult: {
      totalSkills: buildResult.totalSkills,
      totalFiles: buildResult.totalFiles,
      errors: buildResult.errors,
    },
    linkResult: {
      created: linkResult.created.length,
      backedUp: linkResult.backedUp.length,
      errors: linkResult.errors,
    },
  };
}
