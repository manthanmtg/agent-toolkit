"use server";

import path from "path";
import { detectTools } from "../detector";
import { build } from "../builder";
import { linkGlobal } from "../linker";
import { getAllAdapters } from "../adapters";
import { getRepoRoot, loadProfile } from "../registry";
import { IdentifierSchema, type DetectedTool, type SymlinkTarget } from "../types";

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message || "Unknown error";
  return typeof err === "string" ? err : "Unknown error";
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
  const parseResult = IdentifierSchema.safeParse(profileName);

  // Use 'default' if input is empty, whitespace, or nullish.
  // Otherwise, use the validated (and trimmed) value if successful.
  const isEffectivelyEmpty = typeof profileName !== "string" || profileName.trim() === "";
  const normalizedProfile = parseResult.success ? parseResult.data : "default";

  if (!parseResult.success && !isEffectivelyEmpty) {
    return {
      tools: [],
      buildResult: {
        totalSkills: 0,
        totalFiles: 0,
        errors: [`Invalid profile name format: ${formatError(parseResult.error)}`],
      },
      linkResult: {
        created: 0,
        backedUp: 0,
        errors: ["Install flow stopped due to invalid profile name."],
      },
    };
  }

  // Step 0: Validate profile exists
  try {
    await loadProfile(normalizedProfile);
  } catch (err) {
    return {
      tools: [],
      buildResult: {
        totalSkills: 0,
        totalFiles: 0,
        errors: [`Invalid profile "${normalizedProfile}": ${formatError(err)}`],
      },
      linkResult: {
        created: 0,
        backedUp: 0,
        errors: ["Install flow stopped due to profile validation failure."],
      },
    };
  }

  // Step 1: Detect tools
  let tools: DetectedTool[] = [];
  try {
    tools = await detectTools();
  } catch (err) {
    // Surface detection failures but continue the install flow where possible.
    return {
      tools: [],
      buildResult: {
        totalSkills: 0,
        totalFiles: 0,
        errors: [`Failed to detect installed tools: ${formatError(err)}`],
      },
      linkResult: {
        created: 0,
        backedUp: 0,
        errors: ["Install flow stopped due to detection failure."],
      },
    };
  }

  // Step 2: Build
  let buildResult = {
    totalSkills: 0,
    totalFiles: 0,
    outputFiles: [] as Array<{ tool: SymlinkTarget["tool"]; relativePath: string }>,
    errors: [] as string[],
  };
  try {
    const result = await build(normalizedProfile);
    buildResult = {
      totalSkills: result.totalSkills,
      totalFiles: result.totalFiles,
      outputFiles: result.outputFiles,
      errors: [...result.errors],
    };

    // If we have skills to install but no files were produced, something is wrong.
    // We stop here to prevent linking stale or non-existent files.
    if (result.totalSkills > 0 && result.totalFiles === 0 && result.errors.length > 0) {
      return {
        tools,
        buildResult: {
          totalSkills: result.totalSkills,
          totalFiles: 0,
          errors: ["Build failed to produce any files. Install flow stopped.", ...result.errors],
        },
        linkResult: {
          created: 0,
          backedUp: 0,
          errors: ["Install flow stopped due to build failure."],
        },
      };
    }
  } catch (err) {
    const msg = `Build failed: ${formatError(err)}`;
    return {
      tools,
      buildResult: {
        totalSkills: 0,
        totalFiles: 0,
        errors: [msg],
      },
      linkResult: {
        created: 0,
        backedUp: 0,
        errors: ["Install flow stopped due to build exception."],
      },
    };
  }

  // Step 3: Link global configs
  const distDir = path.join(getRepoRoot(), "dist");
  const adapters = getAllAdapters();
  const targets: SymlinkTarget[] = [];

  for (const adapter of adapters) {
    const tool = tools.find((t) => t.id === adapter.toolId);
    if (!tool?.detected && adapter.toolId !== "agents-md") continue;

    const adapterOutputFiles = buildResult.outputFiles
      .filter((output) => output.tool === adapter.toolId)
      .map((output) => output.relativePath);
    const symlinkMap = adapter.getGlobalSymlinkTargets(adapterOutputFiles);
    for (const [distRel, systemPath] of symlinkMap) {
      targets.push({
        source: path.join(distDir, adapter.toolId, distRel),
        destination: systemPath,
        tool: adapter.toolId,
        scope: "global",
      });
    }
  }

  let linkResult;
  try {
    linkResult = await linkGlobal(targets);
  } catch (err) {
    return {
      tools,
      buildResult,
      linkResult: {
        created: 0,
        backedUp: 0,
        errors: [`Critical failure during global linking: ${formatError(err)}`],
      },
    };
  }

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
