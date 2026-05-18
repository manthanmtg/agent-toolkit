"use server";

import { build, cleanDist } from "../builder";
import type { BuildResult } from "../builder";
import { IdentifierSchema } from "../types";

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.message || "Unknown error";
  }
  return typeof err === "string" ? err : "Unknown error";
}

export async function buildAction(
  profileName: string = "default",
  clean: boolean = false
): Promise<BuildResult> {
  const parseResult = IdentifierSchema.safeParse(profileName);

  // Use 'default' if input is empty, whitespace, or nullish.
  // Otherwise, use the validated (and trimmed) value if successful.
  const isEffectivelyEmpty = typeof profileName !== "string" || profileName.trim() === "";
  const normalizedProfile = parseResult.success ? parseResult.data : "default";

  if (!parseResult.success && !isEffectivelyEmpty) {
    return {
      profile: typeof profileName === "string" ? profileName : "invalid",
      totalSkills: 0,
      totalFiles: 0,
      filesByTool: {},
      errors: [`Invalid profile name format: ${formatError(parseResult.error)}`],
    };
  }

  if (typeof clean !== "boolean") {
    return {
      profile: normalizedProfile,
      totalSkills: 0,
      totalFiles: 0,
      filesByTool: {},
      errors: ["Invalid clean flag: expected true/false."],
    };
  }

  if (clean) {
    try {
      await cleanDist();
    } catch (err) {
      return {
        profile: normalizedProfile,
        totalSkills: 0,
        totalFiles: 0,
        filesByTool: {},
        errors: [`Failed to clean dist directory: ${formatError(err)}`],
      };
    }
  }

  try {
    return await build(normalizedProfile);
  } catch (err) {
    return {
      profile: normalizedProfile,
      totalSkills: 0,
      totalFiles: 0,
      filesByTool: {},
      errors: [`Build failed: ${formatError(err)}`],
    };
  }
}
