"use server";

import { build, cleanDist } from "../builder";
import type { BuildResult } from "../builder";

export async function buildAction(
  profileName: string = "default",
  clean: boolean = false
): Promise<BuildResult> {
  const normalizedProfile =
    typeof profileName === "string" && profileName.trim().length > 0
      ? profileName.trim()
      : "default";

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
        errors: [`Failed to clean dist directory: ${String(err)}`],
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
      errors: [`Build failed: ${String(err)}`],
    };
  }
}
